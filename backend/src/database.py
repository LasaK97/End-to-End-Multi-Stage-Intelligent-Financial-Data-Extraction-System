from typing import Optional, List, Dict, Any, Set
from datetime import datetime, timedelta
import pymongo 
from bson import ObjectId 

from .config import MONGODB_URL, DATABASE_NAME, COLLECTION_NAME, FINANCIAL_CONFIG
from .models import ExtractionResult, ProcessingStatus, FinancialStatement
from utils.logger import get_logger 

logger = get_logger("database") 

class Database:
    
    _instance = None 

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
            cls._instance._initialized = False 
        return cls._instance 
    
    def __init__(self):
        if hasattr(self, "_initialized") and self._initialized:
            return 
        
        try:
            self.client = pymongo.MongoClient(MONGODB_URL)
            self.db = self.client[DATABASE_NAME]
            self.collection = self.db[COLLECTION_NAME]
            self.analytics_collection = self.db["extraction_analytics"]

            self.collection.create_index("filename")
            self.collection.create_index("upload_timestamp")
            self.collection.create_index("statements.currency")
            self.collection.create_index("statements.rounding") 
            self.collection.create_index("statements.statement_type")
            self.collection.create_index("extraction_quality")
            self.collection.create_index([
                ("statements.currency", 1),
                ("statements.rounding", 1)
            ])

            self.analytics_collection.create_index("timestamp")
            self.analytics_collection.create_index("pattern_type")

            self.create_upload_indexes()

            logger.info("MongoDB connection established.")
            logger.info(f"Connected to DB: {DATABASE_NAME}, Collection: {COLLECTION_NAME}")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {str(e)}") 
            raise
        
        self._initialized = True 

    def validate_financial_document(self, result: ExtractionResult) -> bool:
        if not result or not result.statements:
            return False
        
        valid_currencies = ['AUD', 'USD', 'GBP', 'EUR', 'CAD', 'NZD']
        valid_rounding = ['units', 'thousands', 'millions', 'billions']
        
        for statement in result.statements:
            if statement.currency not in valid_currencies:
                logger.warning(f"Invalid currency: {statement.currency}")
                return False
            
            if statement.rounding not in valid_rounding:
                logger.warning(f"Invalid rounding: {statement.rounding}")
                return False
            
            suspicious_values = [1000.0, 1200.0, 800.0, 900.0, 1500.0, 1800.0]
            for item in statement.line_items:
                for value in item.values.values():
                    if value in suspicious_values:
                        logger.warning(f"Suspicious mock value detected: {value}")
                        return False
        
        return True

    def calculate_quality_score(self, result: ExtractionResult) -> float:
        if not result.statements:
            return 0.0
        
        score = 1.0
        total_items = sum(len(stmt.line_items) for stmt in result.statements)
        
        if total_items == 0:
            return 0.0
        
        suspicious_count = 0
        suspicious_values = [1000.0, 1200.0, 800.0, 900.0, 1500.0, 1800.0]
        
        for statement in result.statements:
            for item in statement.line_items:
                for value in item.values.values():
                    if value in suspicious_values:
                        suspicious_count += 1
        
        if suspicious_count > 0:
            score -= (suspicious_count / total_items) * 0.5
        
        if result.errors:
            score -= len(result.errors) * 0.1
        
        if result.processing_time > 300:
            score -= 0.1
        
        return max(0.0, min(1.0, score))

    def track_extraction_patterns(self, result: ExtractionResult):
        try:
            pattern_doc = {
                "timestamp": datetime.utcnow(),
                "filename": result.filename,
                "pattern_type": "extraction_result",
                "quality_score": self.calculate_quality_score(result),
                "statement_count": len(result.statements),
                "error_count": len(result.errors),
                "processing_time": result.processing_time,
                "currencies": list(set(stmt.currency for stmt in result.statements)) if result.statements else [],
                "rounding_scales": list(set(stmt.rounding for stmt in result.statements)) if result.statements else [],
                "has_mock_data": any(
                    any(value in [1000.0, 1200.0, 800.0, 900.0] for value in item.values.values())
                    for stmt in result.statements
                    for item in stmt.line_items
                ) if result.statements else False
            }
            
            self.analytics_collection.insert_one(pattern_doc)
        except Exception as e:
            logger.error(f"Failed to track extraction patterns: {str(e)}")

    def save_document(self, result: ExtractionResult) -> Optional[str]:
        try:
            if not self.validate_financial_document(result):
                logger.warning(f"Document validation failed for {result.filename}")
            
            doc = result.dict()
            doc["upload_timestamp"] = datetime.utcnow()
            doc["extraction_quality"] = self.calculate_quality_score(result)
            doc["statement_count"] = len(result.statements)
            doc["currencies"] = list(set(stmt.currency for stmt in result.statements)) if result.statements else []
            doc["rounding_scales"] = list(set(stmt.rounding for stmt in result.statements)) if result.statements else []
            
            inserted = self.collection.insert_one(doc)
            
            self.track_extraction_patterns(result)
            
            logger.info(f"Document saved with ID: {inserted.inserted_id}")
            return str(inserted.inserted_id)
        except Exception as e:
            logger.error(f"Failed to save document: {e}")
            return None
        
    def get_document(self, document_id: str) -> Optional[Dict[str, Any]]:
        try:
            doc = self.collection.find_one({"_id": ObjectId(document_id)})
            if doc:
                doc["_id"] = str(doc["_id"])
                logger.debug(f"Document retrieved: {doc['_id']}")
            return doc
        except Exception as e:
            logger.error(f"Failed to retrieve document {document_id}: {e}")
            return None
        
    def get_all_documents(self, limit: int = 100) -> List[Dict[str, Any]]:
        try:
            docs = []
            for doc in self.collection.find().sort("upload_timestamp", -1).limit(limit):
                doc["_id"] = str(doc["_id"])
                docs.append(doc)
            logger.debug(f"Retrieved {len(docs)} documents.")
            return docs
        except Exception as e:
            logger.error(f"Failed to retrieve documents: {e}")
            return []

    def get_documents_by_currency(self, currency: str, limit: int = 100) -> List[Dict[str, Any]]:
        try:
            docs = []
            query = {"statements.currency": currency}
            for doc in self.collection.find(query).sort("upload_timestamp", -1).limit(limit):
                doc["_id"] = str(doc["_id"])
                docs.append(doc)
            logger.debug(f"Retrieved {len(docs)} documents with currency {currency}")
            return docs
        except Exception as e:
            logger.error(f"Failed to retrieve documents by currency {currency}: {e}")
            return []

    def get_documents_by_rounding(self, rounding: str, limit: int = 100) -> List[Dict[str, Any]]:
        try:
            docs = []
            query = {"statements.rounding": rounding}
            for doc in self.collection.find(query).sort("upload_timestamp", -1).limit(limit):
                doc["_id"] = str(doc["_id"])
                docs.append(doc)
            logger.debug(f"Retrieved {len(docs)} documents with rounding {rounding}")
            return docs
        except Exception as e:
            logger.error(f"Failed to retrieve documents by rounding {rounding}: {e}")
            return []

    def get_documents_with_quality_above(self, quality_threshold: float, limit: int = 100) -> List[Dict[str, Any]]:
        try:
            docs = []
            query = {"extraction_quality": {"$gte": quality_threshold}}
            for doc in self.collection.find(query).sort("extraction_quality", -1).limit(limit):
                doc["_id"] = str(doc["_id"])
                docs.append(doc)
            logger.debug(f"Retrieved {len(docs)} documents with quality >= {quality_threshold}")
            return docs
        except Exception as e:
            logger.error(f"Failed to retrieve high-quality documents: {e}")
            return []

    def search_financial_statements(self, filters: Dict[str, Any], limit: int = 100) -> List[Dict[str, Any]]:
        try:
            query = {}
            
            if "currency" in filters:
                query["statements.currency"] = filters["currency"]
            
            if "rounding" in filters:
                query["statements.rounding"] = filters["rounding"]
            
            if "statement_type" in filters:
                query["statements.statement_type"] = filters["statement_type"]
            
            if "min_quality" in filters:
                query["extraction_quality"] = {"$gte": filters["min_quality"]}
            
            if "company_name" in filters:
                query["statements.company_name"] = {"$regex": filters["company_name"], "$options": "i"}
            
            if "date_from" in filters:
                query["upload_timestamp"] = {"$gte": filters["date_from"]}
            
            if "date_to" in filters:
                if "upload_timestamp" in query:
                    query["upload_timestamp"]["$lte"] = filters["date_to"]
                else:
                    query["upload_timestamp"] = {"$lte": filters["date_to"]}
            
            docs = []
            for doc in self.collection.find(query).sort("upload_timestamp", -1).limit(limit):
                doc["_id"] = str(doc["_id"])
                docs.append(doc)
            
            logger.debug(f"Search returned {len(docs)} documents")
            return docs
        except Exception as e:
            logger.error(f"Failed to search financial statements: {e}")
            return []

    def update_status(self, document_id: str, status: str, message: str = ""):
        try:
            if len(document_id) == 24:
                query = {"_id": ObjectId(document_id)}
            else:
                query = {"custom_id": document_id}
            
            update_data = {
                "status": status, 
                "message": message,
                "last_updated": datetime.utcnow()
            }
            
            result = self.collection.update_one(query, {"$set": update_data})
            
            if result.modified_count > 0:
                logger.debug(f"Status updated for document {document_id}")
            
        except Exception as e:
            logger.error(f"Failed to update status: {e}")

    def bulk_update_quality_scores(self) -> int:
        try:
            updated_count = 0
            
            for doc in self.collection.find({"extraction_quality": {"$exists": False}}):
                try:
                    result = ExtractionResult(**doc)
                    quality_score = self.calculate_quality_score(result)
                    
                    self.collection.update_one(
                        {"_id": doc["_id"]},
                        {"$set": {"extraction_quality": quality_score}}
                    )
                    updated_count += 1
                except Exception as e:
                    logger.warning(f"Failed to update quality for document {doc.get('_id')}: {e}")
            
            logger.info(f"Updated quality scores for {updated_count} documents")
            return updated_count
        except Exception as e:
            logger.error(f"Failed to bulk update quality scores: {e}")
            return 0

    def get_extraction_statistics(self) -> Dict[str, Any]:
        try:
            pipeline = [
                {
                    "$group": {
                        "_id": None,
                        "total_documents": {"$sum": 1},
                        "avg_quality": {"$avg": "$extraction_quality"},
                        "avg_processing_time": {"$avg": "$processing_time"},
                        "currencies": {"$addToSet": "$currencies"},
                        "rounding_scales": {"$addToSet": "$rounding_scales"}
                    }
                }
            ]
            
            result = list(self.collection.aggregate(pipeline))
            
            if result:
                stats = result[0]
                stats.pop("_id", None)
                
                currency_counts = {}
                rounding_counts = {}
                
                for docs in self.collection.find({}, {"currencies": 1, "rounding_scales": 1}):
                    for currency in docs.get("currencies", []):
                        currency_counts[currency] = currency_counts.get(currency, 0) + 1
                    for rounding in docs.get("rounding_scales", []):
                        rounding_counts[rounding] = rounding_counts.get(rounding, 0) + 1
                
                stats["currency_distribution"] = currency_counts
                stats["rounding_distribution"] = rounding_counts
                
                high_quality_count = self.collection.count_documents({"extraction_quality": {"$gte": 0.8}})
                low_quality_count = self.collection.count_documents({"extraction_quality": {"$lt": 0.5}})
                
                stats["high_quality_documents"] = high_quality_count
                stats["low_quality_documents"] = low_quality_count
                
                return stats
            else:
                return {
                    "total_documents": 0,
                    "avg_quality": 0.0,
                    "avg_processing_time": 0.0,
                    "currency_distribution": {},
                    "rounding_distribution": {},
                    "high_quality_documents": 0,
                    "low_quality_documents": 0
                }
                
        except Exception as e:
            logger.error(f"Failed to get extraction statistics: {e}")
            return {}

    def health_check(self) -> Dict[str, Any]:
        try:
            server_status = self.client.admin.command("serverStatus")
            
            collection_stats = self.db.command("collStats", COLLECTION_NAME)
            
            index_info = self.collection.list_indexes()
            indexes = [idx["name"] for idx in index_info]
            
            recent_docs = self.collection.count_documents({
                "upload_timestamp": {"$gte": datetime.utcnow() - timedelta(days=7)}
            })
            
            return {
                "status": "healthy",
                "server_version": server_status.get("version", "unknown"),
                "connection_status": "connected",
                "document_count": collection_stats.get("count", 0),
                "collection_size_mb": round(collection_stats.get("size", 0) / (1024 * 1024), 2),
                "indexes": indexes,
                "recent_documents": recent_docs,
                "last_check": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "last_check": datetime.utcnow().isoformat()
            }

    def delete_document(self, document_id: str) -> bool:
        try:
            result = self.collection.delete_one({"_id": ObjectId(document_id)})
            if result.deleted_count > 0:
                logger.info(f"Document deleted: {document_id}")
                return True
            else:
                logger.warning(f"No document found to delete with ID: {document_id}")
                return False
        except Exception as e:
            logger.error(f"Failed to delete document {document_id}: {e}") 
            return False
        
    def save_upload_document(self, document_id: str, filename: str, file_size: int, file_path: str) -> Optional[str]:
        """Save uploaded document metadata before processing"""
        try:
            upload_doc = {
                "document_id": document_id,
                "filename": filename,
                "file_size": file_size,
                "file_path": file_path,
                "upload_timestamp": datetime.utcnow(),
                "status": "uploaded",  # uploaded, processing, completed, failed
                "message": "File uploaded successfully",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            # Use a separate collection for upload tracking
            upload_collection = self.db["upload_queue"]
            result = upload_collection.insert_one(upload_doc)
            
            logger.info(f"Upload document saved: {document_id}")
            return str(result.inserted_id)
            
        except Exception as e:
            logger.error(f"Failed to save upload document: {e}")
            return None

    def get_upload_document(self, document_id: str) -> Optional[Dict[str, Any]]:
        """Get upload document by ID"""
        try:
            upload_collection = self.db["upload_queue"]
            doc = upload_collection.find_one({"document_id": document_id})
            
            if doc:
                doc["_id"] = str(doc["_id"])
                
            return doc
            
        except Exception as e:
            logger.error(f"Failed to get upload document {document_id}: {e}")
            return None

    def get_uploaded_documents(self) -> List[Dict[str, Any]]:
        """Get all uploaded documents"""
        try:
            upload_collection = self.db["upload_queue"]
            docs = []
            
            for doc in upload_collection.find().sort("upload_timestamp", -1):
                doc["_id"] = str(doc["_id"])
                docs.append(doc)
                
            return docs
            
        except Exception as e:
            logger.error(f"Failed to get uploaded documents: {e}")
            return []

    def get_upload_queue(self) -> List[Dict[str, Any]]:
        """Get documents waiting for processing"""
        try:
            upload_collection = self.db["upload_queue"]
            docs = []
            
            # Get documents with status 'uploaded' or 'processing'
            query = {"status": {"$in": ["uploaded", "processing"]}}
            
            for doc in upload_collection.find(query).sort("upload_timestamp", 1):
                doc["_id"] = str(doc["_id"])
                docs.append(doc)
                
            return docs
            
        except Exception as e:
            logger.error(f"Failed to get upload queue: {e}")
            return []

    def update_upload_status(self, document_id: str, status: str, message: str = None):
        """Update upload document status"""
        try:
            upload_collection = self.db["upload_queue"]
            
            update_data = {
                "status": status,
                "updated_at": datetime.utcnow()
            }
            
            if message:
                update_data["message"] = message
                
            result = upload_collection.update_one(
                {"document_id": document_id},
                {"$set": update_data}
            )
            
            if result.modified_count > 0:
                logger.debug(f"Upload status updated: {document_id} -> {status}")
            else:
                logger.warning(f"No upload document found to update: {document_id}")
                
        except Exception as e:
            logger.error(f"Failed to update upload status: {e}")

    def delete_upload_document(self, document_id: str) -> bool:
        """Delete upload document from queue"""
        try:
            upload_collection = self.db["upload_queue"]
            result = upload_collection.delete_one({"document_id": document_id})
            
            if result.deleted_count > 0:
                logger.info(f"Upload document deleted: {document_id}")
                return True
            else:
                logger.warning(f"No upload document found to delete: {document_id}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to delete upload document: {e}")
            return False

    def clear_upload_queue(self) -> int:
        """Clear all uploaded documents (not processing/completed)"""
        try:
            upload_collection = self.db["upload_queue"]
            
            # Only delete documents in 'uploaded' status
            result = upload_collection.delete_many({"status": "uploaded"})
            
            logger.info(f"Upload queue cleared: {result.deleted_count} documents")
            return result.deleted_count
            
        except Exception as e:
            logger.error(f"Failed to clear upload queue: {e}")
            return 0

    def clear_extraction_results(self) -> int:
        """Clear all completed extraction results"""
        try:
            # Clear from main documents collection
            main_result = self.collection.delete_many({"status": "completed"})
            
            # Clear from upload queue (completed/failed)
            upload_collection = self.db["upload_queue"]
            upload_result = upload_collection.delete_many({"status": {"$in": ["completed", "failed"]}})
            
            total_cleared = main_result.deleted_count + upload_result.deleted_count
            
            logger.info(f"Extraction results cleared: {total_cleared} documents")
            return total_cleared
            
        except Exception as e:
            logger.error(f"Failed to clear extraction results: {e}")
            return 0

    def get_processing_summary(self) -> Dict[str, Any]:
        """Get summary of processing status"""
        try:
            upload_collection = self.db["upload_queue"]
            
            # Count by status
            pipeline = [
                {
                    "$group": {
                        "_id": "$status",
                        "count": {"$sum": 1}
                    }
                }
            ]
            
            status_counts = {}
            for result in upload_collection.aggregate(pipeline):
                status_counts[result["_id"]] = result["count"]
            
            # Get total extraction results
            total_extractions = self.collection.count_documents({})
            
            return {
                "upload_queue": status_counts,
                "total_extractions": total_extractions,
                "queue_total": sum(status_counts.values())
            }
            
        except Exception as e:
            logger.error(f"Failed to get processing summary: {e}")
            return {}

    def cleanup_old_uploads(self, days_old: int = 7) -> int:
        """Clean up old upload documents"""
        try:
            upload_collection = self.db["upload_queue"]
            cutoff_date = datetime.utcnow() - timedelta(days=days_old)
            
            # Delete old completed/failed uploads
            result = upload_collection.delete_many({
                "status": {"$in": ["completed", "failed"]},
                "updated_at": {"$lt": cutoff_date}
            })
            
            logger.info(f"Cleaned up {result.deleted_count} old upload documents")
            return result.deleted_count
            
        except Exception as e:
            logger.error(f"Failed to cleanup old uploads: {e}")
            return 0

    # Add indexes for the upload_queue collection
    def create_upload_indexes(self):
        """Create indexes for upload queue collection"""
        try:
            upload_collection = self.db["upload_queue"]
            
            # Create indexes
            upload_collection.create_index("document_id", unique=True)
            upload_collection.create_index("status")
            upload_collection.create_index("upload_timestamp")
            upload_collection.create_index("updated_at")
            upload_collection.create_index([("status", 1), ("upload_timestamp", 1)])
            
            logger.info("Upload queue indexes created successfully")
            
        except Exception as e:
            logger.error(f"Failed to create upload indexes: {e}")
        
db = Database()