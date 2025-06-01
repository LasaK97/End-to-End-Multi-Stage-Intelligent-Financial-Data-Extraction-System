import sys
sys.path.append('.')

from src.database import db
from src.models import ExtractionResult, FinancialStatement, LineItem
from datetime import datetime
from utils.logger import get_logger 

logger = get_logger("testdb")

def test_connection():
    logger.info("Testing MongoDB connection...")
    
    # Create test data
    test_result = ExtractionResult(
        filename="test_document.pdf",
        processing_time=5.23,
        statements=[
            FinancialStatement(
                statement_type="profit_and_loss",
                company_name="Test Company Ltd",
                currency="AUD",
                rounding="thousands",
                financial_years=["2023", "2024"],
                line_items=[
                    LineItem(
                        label="Revenue",
                        values={"2023": 1000000, "2024": 1200000},
                        note_references=["3"]
                    )
                ]
            )
        ]
    )
    
    # test save
    doc_id = db.save_document(test_result)
    logger.info(f"Document saved with ID: {doc_id}")

    doc = db.get_document(doc_id)
    if doc:
        logger.info(f"Document retrieved: {doc['filename']}")

    docs = db.get_all_documents()
    logger.info(f"Found {len(docs)} documents in database")

    db.delete_document(doc_id)
    logger.info("Test document deleted")

    logger.info("Database connection test passed.")


if __name__ == "__main__":
    test_connection()