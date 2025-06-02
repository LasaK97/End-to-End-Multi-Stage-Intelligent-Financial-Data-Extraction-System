from datetime import datetime 
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, field_validator, model_validator
import re 
from utils.logger import get_logger 

#create logger
logger = get_logger("models")

class NoteReference(BaseModel):
    note_number: str
    confidence: float = 1.0 

class DocumentMetadata(BaseModel):
    currency: str = Field(..., description="3-letter ISO currency code")
    rounding: str = Field(..., description="Rounding scale used in document")
    rounding_note: Optional[str] = Field(None, description="Original rounding text found")
    fiscal_year_end: Optional[str] = Field(None, description="Fiscal year end date") 

    @field_validator('currency')
    def validate_currency_code(cls, v):
        if not re.match(r'^[A-Z]{3}$', v):
            raise ValueError(f'Currency must be 3-letter code, got: {v}')
        
        valid_currencies = ['AUD', 'USD', 'GBP', 'EUR', 'CAD', 'NZD']
        if v not in valid_currencies:
            pass
        return v

    @field_validator('rounding')
    def validate_rounding_scale(cls, v):
        valid_rounding = ['units', 'thousands', 'millions', 'billions']
        if v.lower() not in valid_rounding:
            raise ValueError(f'Rounding must be one of {valid_rounding}, got: {v}')
        return v.lower()

class LineItem(BaseModel):
    label: str 
    values: Dict[str, float] 
    note_references: List[str] = []
    confidence: float = 1.0 

    value_type: Optional[str] = Field(None, description="positive, negative, or calculated")
    formatting: Optional[str] = Field(None, description="original formatting like (27.6)")
    
    @field_validator('values')
    def validate_value_format(cls, v):
        for year, value in v.items():
            if not isinstance(value, (int, float)):
                raise ValueError(f"Value must be numeric, got {type(value)} for year {year}")
            if not (-1e12 < value < 1e12):  
                raise ValueError(f"Value out of reasonable range: {value}")
        return v

class FinancialStatement(BaseModel):
    statement_type: str  
    company_name: str
    currency: str = Field(..., description="Currency code (AUD, USD, etc)")
    rounding: str = Field(..., description="Rounding scale (units, thousands, millions)") 
    financial_years: List[str]
    line_items: List[LineItem]

    document_metadata: Optional[DocumentMetadata] = None
    extraction_confidence: float = Field(default=1.0, ge=0.0, le=1.0)

    @field_validator('currency')
    def validate_currency_consistency(cls, v):
        return v.upper()  

    @field_validator('rounding')
    def validate_rounding_consistency(cls, v):
        valid_rounding = ['units', 'thousands', 'millions', 'billions']
        if v.lower() not in valid_rounding:
            raise ValueError(f'Invalid rounding scale: {v}')
        return v.lower()

    @model_validator(mode='before')
    def validate_financial_data_consistency(cls, values):
        rounding = values.get('rounding', '').lower()
        line_items = values.get('line_items', [])

        for item in line_items:
            for year, value in item.values.items():
                if value in [1000.0, 1200.0, 800.0, 900.0, 1500.0, 1800.0]:
                    logger.warning(f"Suspicious mock-like value detected: {value}")

        if rounding == 'millions':
            pass

        return values

class ExtractionResult(BaseModel):
    filename: str
    document_id: Optional[str] = None
    upload_timestamp: datetime = Field(default_factory=datetime.utcnow)
    processing_time: float
    statements: List[FinancialStatement]
    status: str = "completed"  # "completed"/ "failed"/ "partial"
    errors: List[str] = []

class ProcessingStatus(BaseModel):
    document_id: str
    filename: str
    status: str
    progress: int = 0
    message: str = ""
    result: Optional[ExtractionResult] = None 


# API models
class UploadResponse(BaseModel):
    document_id: str 
    filename: str 
    message: str 
    status: str 

class StatusResponse(BaseModel):
    document_id: str 
    filename: str
    status: str 
    progress: int
    message: str 
    processing_time: Optional[float] = None 
    error_details: Optional[List[str]] = None 

class DocumentSummary(BaseModel):
    document_id: str 
    filename: str 
    upload_timestamp: str 
    status: str 
    extraction_quality: Optional[float] = None 
    statement_count: int 
    currencies: List[str]
    rounding_scales: List[str]

class HealthResponse(BaseModel):
    status: str 
    timestamp: str 
    database: Dict[str, Any]
    models_loaded: bool
    pipeline_ready: bool 
    system_info: Dict[str, Any]

class ErrorResponse(BaseModel):
    error: str 
    detail: str 
    timestamp: str 

class UploadDocument(BaseModel):
    document_id: str
    filename: str
    file_size: int
    file_path: str
    upload_timestamp: datetime = Field(default_factory=datetime.utcnow)
    status: str = "uploaded"  # uploaded, processing, completed, failed
    message: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class BatchProcessRequest(BaseModel):
    document_ids: List[str]

class BatchProcessResponse(BaseModel):
    message: str
    processed_documents: List[str]
    failed_documents: List[Dict[str, str]]

class QueueResponse(BaseModel):
    queue: List[Dict[str, Any]]
    count: int

class ClearResponse(BaseModel):
    message: str
    cleared_count: int

class ProcessingSummaryResponse(BaseModel):
    upload_queue: Dict[str, int]
    total_extractions: int
    queue_total: int



 
