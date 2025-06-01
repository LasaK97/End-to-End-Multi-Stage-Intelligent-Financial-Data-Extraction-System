
import sys
import asyncio
from pathlib import Path
sys.path.append('.')

from src.pipeline import get_pipeline
from src.config import UPLOAD_DIR, OUTPUT_DIR
from utils.logger import get_logger

logger = get_logger("test_extraction_pipeline")

async def test_single_document():
    """test single document"""
    logger.info("Testing single document processing...")
    
    test_files = list(UPLOAD_DIR.glob("*.pdf"))
    if not test_files:
        logger.error("No test PDF files found in uploads directory")
        logger.info(f"Please place a test PDF in: {UPLOAD_DIR}")
        return False
    
    test_file = test_files[0]
    logger.info(f"Using test file: {test_file.name}")
    
    pipeline = await get_pipeline()
    
    success, result = await pipeline.process_doc(test_file)
    
    if success:
        logger.info("✅ Document processed successfully!")
        logger.info(f"Found {len(result.statements)} financial statements")
        
        for stmt in result.statements:
            logger.info(f"\nStatement: {stmt.statement_type}")
            logger.info(f"Company: {stmt.company_name}")
            logger.info(f"Currency: {stmt.currency} ({stmt.rounding})")
            logger.info(f"Years: {', '.join(stmt.financial_years)}")
            logger.info(f"Line items: {len(stmt.line_items)}")
            
            for item in stmt.line_items[:5]:
                logger.info(f"  - {item.label}: {item.values}")
                if item.note_references:
                    logger.info(f"    Notes: {', '.join(item.note_references)}")
    else:
        logger.error("❌ Document processing failed!")
        logger.error(f"Errors: {result.errors}")
    
    return success


async def test_batch_processing():
    """testt batch processing"""
    logger.info("\nTesting batch processing...")
    
    pdf_files = list(UPLOAD_DIR.glob("*.pdf"))[:3]  
    
    if len(pdf_files) < 2:
        logger.warning("Need at least 2 PDFs for batch testing")
        return False
    
    logger.info(f"Processing {len(pdf_files)} documents in batch")
    
    pipeline = await get_pipeline()
    
    results = await pipeline.process_batch(pdf_files)
    
    successful = sum(1 for r in results if r.status == "completed")
    failed = sum(1 for r in results if r.status == "failed")
    
    logger.info(f"\nBatch processing completed:")
    logger.info(f"  Successful: {successful}")
    logger.info(f"  Failed: {failed}")
    
    for result in results:
        logger.info(f"\n  {result.filename}: {result.status}")
        if result.status == "completed":
            logger.info(f"    Statements: {len(result.statements)}")
            total_items = sum(len(s.line_items) for s in result.statements)
            logger.info(f"    Total line items: {total_items}")
    
    return successful > 0


async def test_status_tracking():
    """test status tracking"""
    logger.info("\nTesting status tracking...")
    
    test_files = list(UPLOAD_DIR.glob("*.pdf"))
    if not test_files:
        logger.error("No test files found")
        return False
    
    test_file = test_files[0]
    pipeline = await get_pipeline()
    
    document_id = f"test_{int(asyncio.get_event_loop().time())}"
    process_task = asyncio.create_task(
        pipeline.process_doc(test_file, document_id)
    )
    
    prev_progress = -1
    while not process_task.done():
        status = pipeline.get_status(document_id)
        if status and status.progress != prev_progress:
            logger.info(f"Progress: {status.progress}% - {status.message}")
            prev_progress = status.progress
        await asyncio.sleep(0.5)
    
    success, result = await process_task
    final_status = pipeline.get_status(document_id)
    
    logger.info(f"\nFinal status: {final_status.status}")
    logger.info(f"Final message: {final_status.message}")
    
    return success


async def main():
    """main"""
    logger.info("="*60)
    logger.info("Starting Extraction Pipeline Tests")
    logger.info("="*60)
    
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    tests = [
        ("Single Document", test_single_document),
        ("Status Tracking", test_status_tracking),
        ("Batch Processing", test_batch_processing),
    ]
    
    results = []
    for test_name, test_func in tests:
        logger.info(f"\n{'='*40}")
        logger.info(f"Running: {test_name}")
        logger.info(f"{'='*40}")
        
        try:
            success = await test_func()
            results.append((test_name, success))
        except Exception as e:
            logger.error(f"Test failed with exception: {str(e)}")
            results.append((test_name, False))
    
    logger.info(f"\n{'='*60}")
    logger.info("Test Summary:")
    logger.info(f"{'='*60}")
    
    for test_name, success in results:
        status = "✅ PASSED" if success else "❌ FAILED"
        logger.info(f"{test_name}: {status}")
    
    pipeline = await get_pipeline()
    await pipeline.cleanup()
    
    return all(success for _, success in results)


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)