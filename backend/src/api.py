import os
import asyncio
from pathlib import Path
from typing import List, Optional, Dict, Any
import time
import shutil
from datetime import datetime
import traceback

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from .config import (
    API_HOST, API_PORT, CORS_ORIGINS, UPLOAD_DIR, 
    ALLOWED_EXTENSIONS, MAX_FILE_SIZE_MB, API_DEBUG,
    get_settings
)
from .pipeline import get_pipeline
from .database import db
from .models import ExtractionResult, ProcessingStatus, UploadResponse, StatusResponse, DocumentSummary, HealthResponse, ErrorResponse 
from utils.logger import get_logger

logger = get_logger("api")


#init FastAPI
app = FastAPI(
        title="Financial Data Extraction Tool",
        description="API for extractingt financial data from PDF documnets.",
        version="1.0.0",
        debug=API_DEBUG, 
        docs_url="/docs" if API_DEBUG else None,
        redoc_url="/redoc" if API_DEBUG else None
    )

#add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    # allow_origins=[
    #     "http://localhost:3000",    # Frontend dev server
    #     "http://localhost:5173",   # Alternative Vite port
    #     "http://127.0.0.1:3000",
    #     "http://127.0.0.1:5173"
    # ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "PUT", "OPTIONS", "HEAD"],
    allow_headers=["*"]
)

#pipline
pipeline_instance = None 

async def get_pipeline_instance():
    global pipeline_instance
    if pipeline_instance is None:
        try:
            from .pipeline import get_pipeline
            pipeline_instance = await get_pipeline()
            logger.info("Successfully initialized the pipeline.")
        except Exception as e:
            logger.error(f"Error in initializing the pipeline: {str(e)}")
            raise HTTPException(
                status_code=503,
                detail=f"Error in initializing the pipeline: {str(e)}"
            )
    return pipeline_instance 

# def process_document_background(pipeline, file_path: Path, doc_id: str, filename: str):
#     import asyncio
    
#     try:
#         logger.info(f"Starting the processing the document: {doc_id}")
        
#         loop = asyncio.new_event_loop()
#         asyncio.set_event_loop(loop)
        
#         try:
#             success, result = loop.run_until_complete(pipeline.process_doc(file_path, doc_id))
            
#             if success:
#                 logger.info(f"Successfully processed: {doc_id}")
#             else:
#                 logger.error(f"Error in processing document: {doc_id} | {result.errors}")
                
#         finally:
#             loop.close()

#     except Exception as e:
#         logger.error(f"Error in processing document: {doc_id} | {str(e)}")

#         try:
#             pipeline.update_status(
#                 doc_id, "failed", 0,
#                 f"Processing error: {str(e)}",
#                 None,
#                 filename
#             )
#         except:
#             pass

def process_document_background(pipeline, file_path: Path, doc_id: str, filename: str):
    import asyncio
    
    try:
        logger.info(f"Starting background processing: {doc_id}")
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            success, result = loop.run_until_complete(pipeline.process_doc(file_path, doc_id))
            
            if success:
                logger.info(f"Successfully processed: {doc_id}")
                # Update upload document status
                db.update_upload_status(doc_id, "completed")
            else:
                logger.error(f"Processing failed: {doc_id} | {result.errors}")
                db.update_upload_status(doc_id, "failed", str(result.errors))
                
        finally:
            loop.close()

    except Exception as e:
        logger.error(f"Background processing error: {doc_id} | {str(e)}")
        try:
            db.update_upload_status(doc_id, "failed", str(e))
            pipeline.update_status(
                doc_id, "failed", 0,
                f"Processing error: {str(e)}",
                None,
                filename
            )
        except:
            pass
#API routes
@app.get("/", response_model=Dict[str, str])
async def root():
    return {
        "message": "Financial Docuemnt Extractor App",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs" if API_DEBUG else "disabled",
        "health": "/health"
    }

@app.post("/upload", response_model=UploadResponse)
async def upload_document(background_tasks: BackgroundTasks, file: UploadFile = File(...), pipeline = Depends(get_pipeline_instance)):

    try: 
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided.")
        
        filename = str(file.filename).strip()
        if not filename:
            raise HTTPException(status_code=400, detail="Invalid filename.")
        
        file_ext = Path(filename).suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"Invalid file type '{file_ext}'. Allowed: {list(ALLOWED_EXTENSIONS)}")
        
        content = await file.read()
        file_size = len(content) 

        if file_size > MAX_FILE_SIZE_MB * 1024 * 1024:
            raise HTTPException(status_code=400, detail=f"File too large({file_size / (1024*1024):.1f}MB). Max size: {MAX_FILE_SIZE_MB}MB")

        if file_size == 0:
            raise HTTPException(status_code=400, detail="File is empty.")

        #
        timestamp = int(time.time())
        clean_filename ="".join(c for c in Path(filename).stem if c.isalnum() or c in ('-', '_'))
        if not clean_filename: 
            clean_filename = "document"
        doc_id = f"{clean_filename}_{timestamp}" 

        #
        file_path = UPLOAD_DIR / f"{doc_id}{file_ext}"

        try:
            with open(file_path, "wb") as buffer:
                buffer.write(content)
        except Exception as e:
            raise HTTPException(status_code=500, detail= f"Failed to save file: {str(e)}")
        
        upload_doc = db.save_upload_document(doc_id, filename, file_size, str(file_path))

        
        pipeline.update_status(doc_id, "uploaded", 0, "File uploaded successfully, queued for processing",  None, filename)

        logger.info(f"File uploaded and queued: {filename} -> {doc_id}")
        

        # background_tasks.add_task(
        #     process_document_background, pipeline, file_path, doc_id, filename
        # )

        logger.info(f"File uploaded and queued: {filename} -> {doc_id}")

        return UploadResponse(
            document_id=doc_id,
            filename=filename,
            message="File uploaded successfully. Processing started in background.",
            status="uploaded"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.post("/process-batch")
async def process_batch(
    background_tasks: BackgroundTasks, 
    request: dict,
    pipeline = Depends(get_pipeline_instance)
):
    try:
        document_ids = request.get('document_ids', [])
        
        if not document_ids:
            raise HTTPException(status_code=400, detail="No document IDs provided")
        
        processed_docs = []
        failed_docs = []
        
        for doc_id in document_ids:
            # Get upload document info
            upload_doc = db.get_upload_document(doc_id)
            if not upload_doc:
                failed_docs.append({"doc_id": doc_id, "error": "Document not found"})
                continue
                
            # Check if file exists
            file_path = Path(upload_doc['file_path'])
            if not file_path.exists():
                failed_docs.append({"doc_id": doc_id, "error": "File not found on disk"})
                continue
            
            # Update status to processing
            db.update_upload_status(doc_id, "processing")
            pipeline.update_status(doc_id, "processing", 10, "Starting extraction process", None, upload_doc['filename'])
            
            # Start background processing
            background_tasks.add_task(
                process_document_background, pipeline, file_path, doc_id, upload_doc['filename']
            )
            processed_docs.append(doc_id)
                
        logger.info(f"Batch processing started: {len(processed_docs)} documents, {len(failed_docs)} failed")
        
        return {
            "message": f"Started processing {len(processed_docs)} documents",
            "processed_documents": processed_docs,
            "failed_documents": failed_docs
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Batch processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Batch processing failed: {str(e)}")

@app.delete("/clear-queue")
async def clear_queue():
    try:
        # Get all uploaded documents
        uploaded_docs = db.get_uploaded_documents()
        
        cleared_count = 0
        for doc in uploaded_docs:
            # Only clear documents that are in "uploaded" status (not processing/completed)
            if doc.get('status') == 'uploaded':
                # Delete file from disk
                file_path = Path(doc.get('file_path', ''))
                if file_path.exists():
                    file_path.unlink()
                
                # Remove from database
                db.delete_upload_document(doc['document_id'])
                cleared_count += 1
        
        logger.info(f"Queue cleared: {cleared_count} documents removed")
        
        return {
            "message": f"Queue cleared successfully. Removed {cleared_count} documents.",
            "cleared_count": cleared_count
        }
        
    except Exception as e:
        logger.error(f"Clear queue error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to clear queue: {str(e)}")

@app.delete("/clear-results")
async def clear_results():
    try:
        # Clear all completed extraction results
        cleared_count = db.clear_extraction_results()
        
        logger.info(f"Results cleared: {cleared_count} extraction results removed")
        
        return {
            "message": f"Results cleared successfully. Removed {cleared_count} results.",
            "cleared_count": cleared_count
        }
        
    except Exception as e:
        logger.error(f"Clear results error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to clear results: {str(e)}")

@app.get("/upload-queue")
async def get_upload_queue():
    try:
        # Get all uploaded documents waiting for processing
        queue_docs = db.get_upload_queue()
        
        return {
            "queue": queue_docs,
            "count": len(queue_docs)
        }
        
    except Exception as e:
        logger.error(f"Get upload queue error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get upload queue: {str(e)}")
    

@app.get("/status/{doc_id}", response_model=StatusResponse)
async def get_processing_status(doc_id: str, pipeline = Depends(get_pipeline_instance)):
    try:
        status = pipeline.get_status(doc_id)

        if not status:
            raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found.")
        
        return StatusResponse(
            document_id=doc_id,
            filename=status.filename,
            status=status.status,
            progress=status.progress,
            message=status.message,
            processing_time=status.result.processing_time if status.result else None,
            error_details=status.result.errors if status.result and status.result.errors else None 
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in checking status for {doc_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")


@app.get("/results/{doc_id}")
async def get_extraction_results(doc_id: str, include_raw: bool = False, pipeline = Depends(get_pipeline_instance)):
    try:
        status = pipeline.get_status(doc_id)

        if status and status.result and status.status == "completed":
            result_data = status.result.dict()
            if not include_raw:
                for stmt in result_data.get('statements', []):
                    stmt.pop('raw_text', None)
            return result_data 
        
        doc = None 

        try:
            if len(doc_id) == 24:
                doc = db.get_document(doc_id)
        except:
            pass 

        if not doc:
            docs = db.get_all_documents(limit=100)
            doc = next((d for d in docs if doc_id in d.get('filename', '')), None)

        if not doc:
            raise HTTPException(status_code=404, detail=f"Results for document '{doc_id}' not found.")
        
        if not include_raw:
            for stmt in doc.get('statements', []):
                stmt.pop('raw_text', None)
        
        return doc 
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in retrieving results for {doc_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get results: {str(e)}")

@app.get("/documents", response_model=Dict[str, Any])
async def list_documents(limit: int = 50, skip: int = 0, currency: Optional[str] = None, rounding: Optional[str] = None, min_quality: Optional[float] = None):
    try:
        filters = {}

        if currency:
            filters["currency"] = currency
        if rounding:
            filters["rounding"] = rounding 
        if min_quality is not None:
            filters["min_quality"] = min_quality 

        if filters:
            docs = db.search_financial_statements(filters, limit=limit + skip)
        else:
            docs = db.get_all_documents(limit=limit+skip)

        paginated_docs = docs[skip:skip + limit]

        summaries = []
        for doc in paginated_docs:
            summary = DocumentSummary(
                document_id=str(doc.get('_id', doc.get('document_id', ''))),
                filename=doc.get('filename', 'Unknown'),
                upload_timestamp=doc.get('upload_timestamp', datetime.utcnow()).isoformat(),
                status=doc.get('status', 'unknown'),
                extraction_quality=doc.get('extraction_quality'),
                statement_count=doc.get('statement_count', 0),
                currencies=doc.get('currencies', []),
                rounding_scales=doc.get('rounding_scales', [])
            )
            summaries.append(summary.dict()) 

        return {
            "documents": summaries,
            "total": len(docs),
            "returned": len(summaries),
            "limit": limit,
            "skip": skip,
            "filters": filters
        }
    
    except Exception as e:
        logger.error(f"Error in document listing: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list documents: {str(e)}")
    

@app.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    
    try:
        success = db.delete_document(doc_id)

        if not success:
            raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found.")
        
        deleted_files = []
        try:
            upload_files = list(UPLOAD_DIR.glob(f"*{doc_id}*"))
            for file_path in upload_files:
                file_path.unlink()
                deleted_files.append(str(file_path.name))
        except Exception as e:
            logger.warning(f"Could not delete uploaded files for {doc_id}: {str(e)}")
        
        return {
            "message": f"Successfully deleted the document '{doc_id}'.",
            "deleted_files": deleted_files
        }
    except HTTPException:
        raise 
    except Exception as e:
        logger.error(f"Error in deleting the document fro {doc_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")
        
@app.get("/health", response_model=HealthResponse)
async def health_check():
    try:
        db_health = db.health_check()
        
        pipeline_ready = False
        models_loaded = False
        
        try:
            pipeline = await get_pipeline_instance()
            pipeline_ready = True
            
            models_loaded = (
                pipeline.pdf_processor and 
                pipeline.pdf_processor.models_loaded and
                pipeline.llm_extractor and 
                pipeline.llm_extractor.model_loaded
            )
        except Exception as e:
            logger.warning(f"Pipeline health check failed: {e}")
        
        system_info = {
            "upload_dir_exists": UPLOAD_DIR.exists(),
            "upload_dir_writable": os.access(UPLOAD_DIR, os.W_OK),
            "max_file_size_mb": MAX_FILE_SIZE_MB,
            "allowed_extensions": list(ALLOWED_EXTENSIONS),
            "cors_origins": CORS_ORIGINS,
            "debug_mode": API_DEBUG
        }
        
        overall_status = "healthy" if (
            db_health.get("status") == "healthy" and 
            pipeline_ready and 
            models_loaded
        ) else "unhealthy"
        
        return HealthResponse(
            status=overall_status,
            timestamp=datetime.utcnow().isoformat(),
            database=db_health,
            models_loaded=models_loaded,
            pipeline_ready=pipeline_ready,
            system_info=system_info
        )
        
    except Exception as e:
        logger.error(f"Error in checking health: {str(e)}")
        return HealthResponse(
            status="unhealthy",
            timestamp=datetime.utcnow().isoformat(),
            database={"status": "error", "error": str(e)},
            models_loaded=False,
            pipeline_ready=False,
            system_info={"error": str(e)}
        )

@app.get("/settings")
async def get_api_settings():
    if not API_DEBUG:
        raise HTTPException(status_code=404, detail="not found.")
    
    settings = get_settings()

    safe_settings = {k: v for k, v in settings.items() if not any(sensitive in k.lower() for sensitive in ['password', 'secret', 'key', 'token'])}
    return safe_settings 

@app.get("/stats")
async def get_extraction_statistics():
    try:
        stats = db.get_extraction_statistics()
        return stats 
    except Exception as e:
        logger.error(f"Error in satistics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Filaed to get sattistics: {str(e)}") 
    
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=exc.detail,
            detail=str(exc.detail),
            timestamp=datetime.utcnow().isoformat()
        ).dict()
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="Internal server error",
            detail=str(exc) if API_DEBUG else "An unexpected error occurred",
            timestamp=datetime.utcnow().isoformat()
        ).dict()
    )

@app.on_event("startup")
async def startup_events():
    try:
        logger.info("Starting the financial document extractor API...")

        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

        await get_pipeline_instance()

        logger.info("Successfully started the API.")
        logger.info(f"API running on {API_HOST}:{API_PORT}")
        logger.info(f"Debug mode: {API_DEBUG}")
        logger.info(f"CORS origins: {CORS_ORIGINS}")
        
    except Exception as e:
        logger.error(f"Startup failed: {str(e)}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    try:
        logger.info("Shutting down API...")
        
        global pipeline_instance
        if pipeline_instance:
            await pipeline_instance.cleanup()
        
        logger.info("Successfully shutdown the API.")
    except Exception as e:
        logger.error(f"Shutdown error: {str(e)}")

if __name__ == "__main__":
    import uvicorn 
    uvicorn.run(
        "src.api:app",
        host=API_HOST,
        port=API_PORT,
        reload=API_DEBUG,
        log_level="info" if not API_DEBUG else "debug",
        access_log=API_DEBUG
    )