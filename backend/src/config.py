import os 
from pathlib import Path 
from typing import Dict, Any, List 
from utils.logger import get_logger
import json
from dotenv import load_dotenv

#create logger
logger = get_logger("config")

# base paths 
BASE_DIR = Path(__file__).parent.parent 
DATA_DIR = BASE_DIR / "data" 
MODELS_DIR = BASE_DIR / "models"
UPLOAD_DIR = DATA_DIR / "uploads"
OUTPUT_DIR = DATA_DIR / "outputs"
LOGS_DIR = DATA_DIR / "logs"

# create dirs 
for dir_path in [DATA_DIR, MODELS_DIR, UPLOAD_DIR, OUTPUT_DIR, LOGS_DIR]:
    try:
        dir_path.mkdir(parents=True, exist_ok=True)
        logger.info(f"Directory structure is created.")
    except Exception as e:
        logger.error(f"Error creating the directory structure: {str(e)}")
        raise

EXTRACTION_LOGGING = {
    "log_pdf_text_chunks": True,
    "log_llm_prompts": True, 
    "log_llm_responses": True,
    "log_extraction_validation": True,
    "max_log_text_length": 1000,  
}

# DB settings 
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017/")
DATABASE_NAME = "financial_data"
COLLECTION_NAME = "documents" 

# models settings
USE_GPU = os.getenv("USE_GPU", "true").lower() == "true"
MODELS = {
    "layoutlm": {
        "name": "microsoft/layoutlmv3-base",
        "cache_dir": str(MODELS_DIR),
        "device": "cuda" if USE_GPU else "cpu"
    },
    "table_transformer": {
        "name": "microsoft/table-transformer-detection",
        "cache_dir": str(MODELS_DIR),
        "device": "cuda" if USE_GPU else "cpu"
    },
    "mistral": {
        "model_path": str(MODELS_DIR / "mistral-7b-instruct-v0.3.q4_k_m.gguf"),
        "n_ctx": 8192,
        "n_gpu_layers": -1 if USE_GPU else 0,
        "temperature": 0.1,  
        "top_p": 0.9,
        "repeat_penalty": 1.1
    }
}

FINANCIAL_CONFIG = {
    "max_context_length": 8192,  
    "enable_mock_mode": False,   
    "currency_validation": True,
    "rounding_validation": True,
    "debug_extraction": True,
    "log_llm_responses": True,   
    "value_validation_threshold": 0.8,  
}

ROUNDING_PATTERNS = {
    "millions": [
        r'\$M\b',
        r'\bmillions?\b.*dollars?',
        r'amounts.*in.*millions?',
        r'figures.*millions?',
        r'\(\$.*millions?\)',
    ],
    "thousands": [
        r'\$[0-9,]+,000\b',
        r'\bthousands?\b.*dollars?',
        r'amounts.*in.*thousands?',
        r'figures.*thousands?',
        r'\(\$.*thousands?\)',
    ],
    "units": [
        r'^\$[0-9,]+$',  
    ]
}

CURRENCY_PATTERNS = {
    "AUD": [r'\bAUD\b', r'Australian.*dollars?', r'A\$'],
    "USD": [r'\bUSD\b', r'US.*dollars?', r'United.*States.*dollars?'],
    "GBP": [r'\bGBP\b', r'British.*pounds?', r'£'],
    "EUR": [r'\bEUR\b', r'euros?', r'€'],
}

# processing settings
MAX_FILE_SIZE_MB = 50
ALLOWED_EXTENSIONS = {".pdf"}
PROCESSING_TIMEOUT = 120 
EXTRACTION_SETTINGS = {
    "max_retry_attempts": 3,
    "enable_fallback_extraction": True,
    "require_metadata_validation": True,
    "min_extraction_confidence": 0.7,
}


def validate_financial_config() -> bool:
    try:
        assert len(ROUNDING_PATTERNS) > 0, "No rounding patterns defined"
        assert len(CURRENCY_PATTERNS) > 0, "No currency patterns defined"
        
        assert MODELS["mistral"]["n_ctx"] >= 4096, "Context length too small for financial documents"
        
        return True
    except Exception as e:
        logger.error(f"Financial configuration validation failed: {e}")
        return False

def get_pattern_for_detection(detection_type: str) -> Dict[str, List[str]]:
    if detection_type == "rounding":
        return ROUNDING_PATTERNS
    elif detection_type == "currency":
        return CURRENCY_PATTERNS
    else:
        raise ValueError(f"Unknown detection type: {detection_type}")


# API host
load_dotenv()

API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", 8000))

_cors_origins_raw = os.getenv("CORS_ORIGINS", "")

if _cors_origins_raw.startswith("[") and _cors_origins_raw.endswith("]"):
    _cors_origins_raw = _cors_origins_raw.strip("[]")
    CORS_ORIGINS = [o.strip().strip('"').strip("'") for o in _cors_origins_raw.split(",")]
else:
    CORS_ORIGINS = [o.strip() for o in _cors_origins_raw.split(",") if o.strip()]

if not CORS_ORIGINS:
    CORS_ORIGINS = ["http://localhost:8000"]

UPLOAD_MAX_SIZE_MB = int(os.getenv("UPLOAD_MAX_SIZE_MB", 50))
API_DEBUG = os.getenv("API_DEBUG", "false").lower() == "true"



def get_settings() -> Dict[str, Any]:
    return {
        "base_dir": str(BASE_DIR),
        "data_dir": str(DATA_DIR),
        "models_dir": str(MODELS_DIR),
        "upload_dir": str(UPLOAD_DIR),
        "output_dir": str(OUTPUT_DIR),
        "mongodb_url": MONGODB_URL,
        "database_name": DATABASE_NAME,
        "collection_name": COLLECTION_NAME,
        "models": MODELS,
        "financial_config": FINANCIAL_CONFIG,
        "rounding_patterns": ROUNDING_PATTERNS,
        "currency_patterns": CURRENCY_PATTERNS,
        "extraction_settings": EXTRACTION_SETTINGS,
        "extraction_logging": EXTRACTION_LOGGING,
        "max_file_size_mb": MAX_FILE_SIZE_MB,
        "allowed_extensions": list(ALLOWED_EXTENSIONS),
        "processing_timeout": PROCESSING_TIMEOUT,
        "api_host": API_HOST,
        "api_port": API_PORT,
        "cors_origins": CORS_ORIGINS,
        "upload_max_size_mb": UPLOAD_MAX_SIZE_MB,
        "api_debug": API_DEBUG
    }

