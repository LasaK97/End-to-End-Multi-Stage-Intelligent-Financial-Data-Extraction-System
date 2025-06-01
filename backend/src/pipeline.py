import asyncio 
import time 
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor
import threading
from datetime import datetime
import traceback

from .pdf_processor import get_pdf_processor, PDFProcessor 
from .llm_extractor import get_llm_extractor, LLMExtractor 
from .database import db 
from .models import ExtractionResult, ProcessingStatus, DocumentMetadata, FinancialStatement
from utils.logger import get_logger 
from .config import UPLOAD_DIR, OUTPUT_DIR, FINANCIAL_CONFIG, EXTRACTION_SETTINGS

logger = get_logger("extraction_pipeline")

class ExtractionPipeline:

    _instance = None 
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False 
        return cls._instance 
    
    def __init__(self):
        if getattr(self, '_initialized', False):
            return
        try:

            self.pdf_processor = None 
            self.llm_extractor = None 
            self.processing_queue = asyncio.Queue()
            self.status_cache = {}
            self.lock = threading.Lock()
            self._initialized = True
            logger.info(f"Extraction Pipeline initialized.")
        except Exception as e:
            logger.error(f"Error initializing Extraction Pipeline: {str(e)}")

    async def initialize(self):
        try:
            self.pdf_processor = get_pdf_processor()
            self.llm_extractor = get_llm_extractor()

            tasks = [
                asyncio.create_task(self.load_pdf_models()),
                asyncio.create_task(self.load_llm_model())
            ]

            results = await asyncio.gather(*tasks, return_exceptions=True)

            for idx, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error(f"Error in component initialization {idx}: {str(result)}")
                    return False 
            
            logger.info("Pipeline components initialized successfully.")
            return True 
        except Exception as e:
            logger.error(f"Error in initializing pipeline components: {str(e)}")
            return False

    async def load_pdf_models(self):
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.pdf_processor.load_models)
        
    async def load_llm_model(self):
        return await self.llm_extractor.load_model_async()
    
    async def process_doc(self, file_path: Path, doc_id: Optional[str] = None) -> Tuple[bool, ExtractionResult]:
        st = time.time()

        if not doc_id:
            doc_id = f"{file_path.stem}_{int(time.time())}"    

        self.update_status(doc_id, "processing", 0, "Starting PDF processing") 

        try:
            logger.info(f"Processing PDF: {file_path.name}")
            pdf_data = await self.pdf_processor.process_pdf_async(file_path) 
            
            if FINANCIAL_CONFIG.get("debug_extraction", False):
                logger.info(f"PDF metadata detected: {pdf_data.get('document_metadata', {})}")
                logger.info(f"Sections found: {list(pdf_data.get('sections', {}).keys())}")
            
            self.update_status(doc_id, "processing", 30, "PDF processed, starting extraction")

            logger.info(f"Extracting financial data from {file_path.name}")
            result = await self.llm_extractor.extract_from_doc_async(pdf_data)
            
            if FINANCIAL_CONFIG.get("debug_extraction", False):
                logger.info(f"Extracted {len(result.statements)} statements")
                for stmt in result.statements:
                    logger.info(f"Statement: {stmt.statement_type}, Currency: {stmt.currency}, Rounding: {stmt.rounding}, Items: {len(stmt.line_items)}")
            
            self.update_status(doc_id, "processing", 70, "Extraction completed, validating results")

            validation_errors = self.validate_extraction_results(result, pdf_data.get('document_metadata', {}))
            if validation_errors:
                logger.warning(f"Validation warnings for {file_path.name}: {validation_errors}")
                result.errors.extend(validation_errors)
            
            self.update_status(doc_id, "processing", 80, "Validation completed, saving to database")

            logger.info(f"Saving extracted data to database")
            db_id = db.save_document(result)
            result.document_id = db_id
            self.update_status(doc_id, "processing", 90, "Saved to database") 

            output_path = OUTPUT_DIR / f"{doc_id}_result.json"
            self.save_json_output(result, output_path)

            total_time = time.time() - st 
            self.update_status(doc_id, "completed", 100, f"Processing completed in {total_time:.2f}s", result)

            logger.info(f"Document processed successfully: {file_path.name} in {total_time:.2f}s")

            return True, result 
        
        except Exception as e:
            logger.error(f"Error processing the document: {file_path.name}: {str(e)}")
            error_msg = f"Error: {str(e)}"

            error_result = ExtractionResult(
                filename=file_path.name,
                processing_time=time.time() - st,
                statements=[],
                status="failed",
                errors=[error_msg, traceback.format_exc()]
            )

            self.update_status(doc_id, "failed", 0, error_msg, error_result)

            return False, error_result

    def validate_extraction_results(self, result: ExtractionResult, pdf_metadata: Dict[str, Any]) -> List[str]:
        errors = []
        
        if not result.statements:
            errors.append("No financial statements extracted")
            return errors
        
        suspicious_values = [1000.0, 1200.0, 800.0, 900.0, 1500.0, 1800.0, -200.0, -300.0, 500.0, 600.0]
        
        for statement in result.statements:
            if not statement.line_items:
                errors.append(f"No line items in {statement.statement_type} statement")
                continue
            
            for item in statement.line_items:
                for year, value in item.values.items():
                    if value in suspicious_values:
                        errors.append(f"Suspicious mock-like value {value} detected for {item.label} in {year}")
            
            if pdf_metadata:
                pdf_currency = pdf_metadata.get('currency')
                pdf_rounding = pdf_metadata.get('rounding')
                
                if pdf_currency and statement.currency != pdf_currency:
                    errors.append(f"Currency mismatch: PDF={pdf_currency}, Extracted={statement.currency}")
                
                if pdf_rounding and statement.rounding != pdf_rounding:
                    errors.append(f"Rounding mismatch: PDF={pdf_rounding}, Extracted={statement.rounding}")
        
        return errors

    def assess_extraction_quality(self, result: ExtractionResult) -> float:
        if not result.statements:
            return 0.0
        
        score = 1.0
        total_items = sum(len(stmt.line_items) for stmt in result.statements)
        
        if total_items == 0:
            return 0.0
        
        suspicious_count = 0
        for statement in result.statements:
            for item in statement.line_items:
                for value in item.values.values():
                    if value in [1000.0, 1200.0, 800.0, 900.0]:
                        suspicious_count += 1
        
        if suspicious_count > 0:
            score -= (suspicious_count / total_items) * 0.5
        
        if result.errors:
            score -= len(result.errors) * 0.1
        
        return max(0.0, min(1.0, score))
        
    def update_status(self, doc_id: str, status: str, progress: int, message: str, result: Optional[ExtractionResult] = None, filename: str = "processing"):
        with self.lock:
            self.status_cache[doc_id] = ProcessingStatus(
                document_id=doc_id,
                filename=result.filename if result else filename,
                status=status,
                progress=progress,
                message=message,
                result=result
            )

            if status in ["completed", "failed"] and result:
                try:
                    db.update_status(doc_id, status, message)
                    if FINANCIAL_CONFIG.get("debug_extraction", False):
                        logger.info("Database status updated.")
                except Exception as e:
                    logger.warning(f"Error in updating the database status: {str(e)}")

    def save_json_output(self, result: ExtractionResult, output_path: Path):
        try:
            import json 

            export_data = {
                "extraction_timestamp": datetime.utcnow().isoformat(),
                "filename": result.filename,
                "processing_time": result.processing_time,
                "status": result.status,
                "errors": result.errors,
                "extraction_quality": self.assess_extraction_quality(result),
                "statements": []
            }
            
            for statement in result.statements:
                stmt_data = {
                    "type": statement.statement_type,
                    "company_name": statement.company_name,
                    "currency": statement.currency,
                    "rounding": statement.rounding,
                    "financial_years": statement.financial_years,
                    "extraction_confidence": getattr(statement, 'extraction_confidence', 1.0),
                    "line_items": []
                }
                
                for item in statement.line_items:
                    item_data = {
                        "label": item.label,
                        "values": item.values,
                        "note_references": item.note_references,
                        "confidence": item.confidence
                    }
                    stmt_data["line_items"].append(item_data)
                
                export_data["statements"].append(stmt_data)

            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(export_data, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Results saved to {output_path}")
            
        except Exception as e:
            logger.error(f"Failed to save JSON output: {str(e)}")

    async def process_batch(self, file_paths: List[Path]) -> List[ExtractionResult]:
        logger.info(f"Starting batch processing for {len(file_paths)} documents")
        st = time.time()
        tasks = []
        for file_path in file_paths:
            task = asyncio.create_task(self.process_doc(file_path))
            tasks.append(task)
        
        results = []
        for task in asyncio.as_completed(tasks):
            try:
                success, result = await task
                results.append(result)
            except Exception as e:
                logger.error(f"Error in batch processing: {str(e)}")

                failed_result = ExtractionResult(
                    filename="unknown",
                    processing_time=0,
                    statements=[],
                    status="failed",
                    errors=[str(e)]
                )
                results.append(failed_result)
        
        total_time = time.time() - st 
        logger.info(f"Batch processing completed: {len(results)} documents processed in {total_time:.2f}s")
        
        return results

    def get_status(self, doc_id: str) -> Optional[ProcessingStatus]:
        with self.lock:
            return self.status_cache.get(doc_id)
        
    def get_all_status(self) -> Dict[str, ProcessingStatus]:
        with self.lock:
            return self.status_cache.copy()
        
    async def cleanup(self):
        try:
            if self.pdf_processor:
                self.pdf_processor.cleanup()
            if self.llm_extractor:
                self.llm_extractor.cleanup()
            logger.info("Successfully cleaned the pipeline components.")
        except Exception as e:
            logger.error(f"Error cleaning the pipeline components: {str(e)}")
    

pipeline = None 
pipeline_lock = threading.Lock()

async def get_pipeline() -> ExtractionPipeline:
    global pipeline 
    with pipeline_lock:
        if pipeline is None:
            pipeline = ExtractionPipeline()
            await pipeline.initialize()
        return pipeline 
    
def get_pipeline_sync() -> ExtractionPipeline:
    global pipeline 
    with pipeline_lock:
        if pipeline is None:
            pipeline = ExtractionPipeline()
        return pipeline