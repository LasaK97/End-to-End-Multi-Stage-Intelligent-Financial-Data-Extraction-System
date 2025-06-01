import sys
import os 
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from transformers import LayoutLMv3Processor, LayoutLMv3ForTokenClassification
from transformers import AutoModelForObjectDetection
import requests
from tqdm import tqdm
from pathlib import Path
import hashlib

from src.config import MODELS, MODELS_DIR
from utils.logger import get_logger

#create logger
logger =  get_logger("download_models")

def download_file(url: str, dest_path: Path, chunk_size: int = 8192) -> bool:
    """download files"""
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()

        total_size = int(response.headers.get('content-length', 0))

        with open(dest_path, 'wb') as f:
            with tqdm(desc=dest_path.name, total=total_size, unit='iB', unit_scale=True, unit_divisor=1024) as pbar:
                for chunk in response.iter_content(chunk_size=chunk_size):
                    size = f.write(chunk)
                    pbar.update(size)
        
        return True 
    except Exception as e:
        logger.error(f"Failed to download {url}: {str(e)}")
        return False 
    
def download_transformer_models():
    """Download tarnsformer models"""
    logger.info("Downloading transformer models...")
    
    try:
        #download LayoutLMv3
        logger.info("Downloading LayoutLMv3...")
        processor = LayoutLMv3Processor.from_pretrained(
            MODELS["layoutlm"]["name"],
            cache_dir=MODELS["layoutlm"]["cache_dir"]
        )
        model = LayoutLMv3ForTokenClassification.from_pretrained(
            MODELS["layoutlm"]["name"],
            cache_dir=MODELS["layoutlm"]["cache_dir"]
        )
        logger.info("LayoutLMv3 downloaded")
        
        #download Table Transformer
        logger.info("Downloading Table Transformer...")
        table_model = AutoModelForObjectDetection.from_pretrained(
            MODELS["table_transformer"]["name"],
            cache_dir=MODELS["table_transformer"]["cache_dir"]
        )
        logger.info("Table Transformer downloaded")
        
        return True
        
    except Exception as e:
        logger.error(f"Error downloading transformer models: {str(e)}")
        return False

def download_mistral_model():
    """Download /mistral-7B model"""

    MODEL_URLS = {
        "mistral-7b-instruct-v0.3.q4_k_m.gguf": "https://huggingface.co/MaziyarPanahi/Mistral-7B-Instruct-v0.3-GGUF/resolve/main/Mistral-7B-Instruct-v0.3.Q4_K_M.gguf" 
                                                                                                                                
    }
    model_path = Path(MODELS["mistral"]["model_path"])
    model_path.parent.mkdir(parents=True, exist_ok=True)

    if model_path.exists():
        logger.info(f"Model exists at {model_path}")
        return True 
    
    url = MODEL_URLS.get(model_path.name)
    if not url:
        logger.error(f"No model fount at {url}. Please download manually.")
        return False 
    
    logger.info(f"Downloading from {url}")
    success = download_file(url, model_path)

    if success:
        logger.info(f"Mistral model downloaded successfully to {model_path}")
    else:
        logger.error(f"Error downloading the Mistral model.")
    return success 

def verify_models():
    """Verify downloaded models"""
    logger.info("Verifying models...")

    all_good = True 
    layoutlm_path = Path(MODELS["layoutlm"]["cache_dir"]) / "models--microsoft--layoutlmv3-base"
    if not layoutlm_path.exists():
        logger.warning("LayoutLMv3 model not found")
        all_good = False
    else:
        logger.info("LayoutLMv3 model found")

    table_path = Path(MODELS["table_transformer"]["cache_dir"]) / "models--microsoft--table-transformer-detection"
    if not table_path.exists():
        logger.warning("Table Transformer model not found")
        all_good = False
    else:
        logger.info("Table Transformer model found")
    
    mistral_path = Path(MODELS["mistral"]["model_path"])
    if not mistral_path.exists():
        logger.warning(f"Mistral model not found at {mistral_path}")
        all_good = False
    else:
        logger.info(f"Mistral model found ({mistral_path.stat().st_size / 1024**3:.2f} GB)")
    
    return all_good

def main():
    logger.info("Strating the downloads...")

    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    #transformer models
    success = download_transformer_models()
    if not success:
        logger.error("Failed to download transformer models")
        return 1
    
    #mistral
    success = download_mistral_model()
    if not success:
        logger.error("Failed to download Mistral model")
        return 1
    
    #verifying
    logger.info("\n" + "="*50)
    if verify_models():
        logger.info("All models verifyied.!")
    else:
        logger.warning("Theres a problem of verifying some models.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
