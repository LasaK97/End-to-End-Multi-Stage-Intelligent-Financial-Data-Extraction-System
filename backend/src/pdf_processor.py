import warnings
with warnings.catch_warnings():
    warnings.filterwarnings("ignore", message="Some weights of")
import time
import asyncio
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
import re
import fitz 
from PIL import Image 
import torch 
from transformers import LayoutLMv3Processor, LayoutLMv3ForTokenClassification
from transformers import AutoImageProcessor, AutoModelForObjectDetection
import numpy as np 

from .config import MODELS, MAX_FILE_SIZE_MB, FINANCIAL_CONFIG, ROUNDING_PATTERNS, CURRENCY_PATTERNS
from utils.logger import get_logger 

logger = get_logger("pdf_processor")

class PDFProcessor:
    
    _instance = None 
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance  

    def __init__(self, max_workers: int = 4):
        
        if getattr(self, '_initialized', False):
            return
        
        try:
            self.layout_processor = None 
            self.layout_model = None 
            self.table_processor = None
            self.table_model = None 
            self.device = MODELS["layoutlm"]["device"]
            self.models_loaded = False 
            self.model_lock = threading.Lock()

            self.thread_pool = ThreadPoolExecutor(max_workers=max_workers)
            
            self._initialized = True
            logger.info("PDF Processor initialized.")
        except Exception as e:
            logger.error(f"Error initiating PDF Processor: {str(e)}")

    def __enter__(self):
        return self 
    
    def __exit__(self, exec_type, exc_val, exc_tb):
        self.cleanup()
    
    def cleanup(self):
        self.thread_pool.shutdown(wait=True)
        logger.info("PDF Processor cleaned.")

    def load_models(self) -> bool:

        with self.model_lock:
            if self.models_loaded:
                return True 
            
            try:
                st = time.time()

                futures = []

                future1 = self.thread_pool.submit(self.load_layout_model)
                futures.append(future1)

                future2 = self.thread_pool.submit(self.load_tableT_model)
                futures.append(future2)

                for future in as_completed(futures):
                    result = future.result()
                    if not result:
                        return False 
                
                load_time = time.time() - st 
                self.models_loaded = True 
                logger.info(f"All models loaded successfully in {load_time:.2f}s.")
                return True 
            except Exception as e:
                logger.error(f"Error loading models: {str(e)}")
                self.models_loaded = False 
                return False
            
    def load_layout_model(self) -> bool:
        try:
            logger.info("Loading the LayoutLMv3 model...")
            self.layout_processor = LayoutLMv3Processor.from_pretrained(
                MODELS["layoutlm"]["name"],
                cache_dir=MODELS["layoutlm"]["cache_dir"]
            )
            self.layout_model = LayoutLMv3ForTokenClassification.from_pretrained(
                MODELS["layoutlm"]["name"],
                cache_dir=MODELS["layoutlm"]["cache_dir"]
            )
            self.layout_model.to(self.device)
            self.layout_model.eval()
            logger.info("LayoutLMv3 model loaded successfully.")
            return True 

        except Exception as e:
            logger.error("Error loading the LayoutLMv3 model.")
            return False 

    def load_tableT_model(self) -> bool:
        try:
            logger.info("Loading the Table Transformer model...")
            self.table_processor = AutoImageProcessor.from_pretrained(
                MODELS["table_transformer"]["name"],
                cache_dir=MODELS["table_transformer"]["cache_dir"]
            )
            self.table_model = AutoModelForObjectDetection.from_pretrained(
                MODELS["table_transformer"]["name"],
                cache_dir=MODELS["table_transformer"]["cache_dir"]
            )
            self.table_model.to(self.device)
            self.table_model.eval()
            logger.info("Table Transformer model loaded successfully.")
            return True 
        except Exception as e:
            logger.error("Error loading the Table Transformer model.")
            return False 
        
    async def process_pdf_async(self, file_path: Path) -> Dict[str, Any]:
        loop = asyncio.get_event_loop()

        result = await loop.run_in_executor(
            self.thread_pool,
            self.process_pdf_sync,
            file_path
        )

        return result
    
    def process_pdf_sync(self, file_path: Path) -> Dict[str, Any]:
        try:
            st = time.time()

            is_valid, message = self.validate_pdf(file_path)
            if not is_valid:
                raise ValueError(f"Invalid PDF: {message}")

            pdf = fitz.open(file_path)
            page_count = len(pdf)

            with ThreadPoolExecutor(max_workers=min(4, page_count)) as executor:
                
                futures = []

                for page_num in range(page_count):
                    future = executor.submit(
                        self.process_single_page,
                        file_path,
                        page_num
                    )
                    futures.append((page_num, future))

                pages_data = [None] * page_count
                for page_num, future in futures:
                    try:
                        page_data = future.result()
                        pages_data[page_num] = page_data
                    except Exception as e:
                        logger.warning(f"Failed to process page {page_num}: {str(e)}")
                        pages_data[page_num] = None 
            
            pdf.close()

            pages_data = [p for p in pages_data if p is not None]

            sections_future = self.thread_pool.submit(
                self.find_financial_sections,
                pages_data
            )

            full_text = self.combine_text(pages_data)

            sections = sections_future.result()

            document_metadata = self.extract_financial_metadata(pages_data)

            result = {
                'filename': file_path.name,
                'page_count': len(pages_data),
                'pages': pages_data,
                'sections': sections,
                'full_text': full_text,
                'document_metadata': document_metadata,
                'processing_time': time.time() - st
            }
            
            logger.info(f"Processed PDF '{file_path.name}' | Pages: {len(pages_data)} | Sections: {len([s for s in sections.values() if s])} | Time: {result['processing_time']:.2f}s")
            return result
        except Exception as e:
            logger.error(f"Error processing PDF: {str(e)}")
            raise

    def validate_pdf(self, file_path: Path) -> Tuple[bool, str]:
        try:
            if not file_path.exists():
                return False, "File not found"
            
            file_size_mb = file_path.stat().st_size / (1024 * 1024)
            if file_size_mb > MAX_FILE_SIZE_MB:
                return False, f"File too large: {file_size_mb:.1f}MB > {MAX_FILE_SIZE_MB}MB"
            
            try:
                pdf = fitz.open(file_path)
                page_count = len(pdf)
                pdf.close()

                if page_count == 0:
                    return False, "PDF has no pages"

                return True, "Valid"
            
            except Exception as e:
                return False, f"Invalid PDF: {str(e)}"
            
        except Exception as e:
            logger.error(f"Error in PDF validation: {str(e)}")
            return False, f"Error in PDF validation: {str(e)}"
        
    def process_single_page(self, file_path: Path, page_num: int) -> Dict[str, Any]:
        pdf = fitz.open(file_path)
        page = pdf[page_num] 

        try:
            text_instances = []
            words = page.get_text("words")
            
            for word in words:
                text_instances.append({
                    'text': word[4],
                    'bbox': [word[0], word[1], word[2], word[3]],
                    'page': page_num,
                    'confidence': 1.0
                })

            tables = []
            if self.models_loaded and self.table_model:
                mat = fitz.Matrix(2.0, 2.0)
                pix = page.get_pixmap(matrix=mat)
                img_data = pix.tobytes("png")
                tables = self.detect_tables(img_data)

            structured_text = self.extract_structured_text(page)

            return {
                'page_num': page_num,
                'text_instances': text_instances,
                'tables': tables,
                'structured_text': structured_text,
                'width': page.rect.width,
                'height': page.rect.height
            }
        
        finally:
            pdf.close()

    def extract_structured_text(self, page) -> Dict[str, Any]:
        
        blocks = page.get_text("dict")
        
        headers = []
        tables = []
        paragraphs = []
        financial_data = []
        
        for block in blocks.get("blocks", []):
            if "lines" in block:
                block_text = ""
                block_bbox = block["bbox"]
                
                for line in block["lines"]:
                    for span in line["spans"]:
                        text = span["text"].strip()
                        if text:
                            block_text += text + " "
                
                block_text = block_text.strip()
                if not block_text:
                    continue
                
                if self.is_financial_header(block_text):
                    headers.append({
                        'text': block_text,
                        'bbox': block_bbox,
                        'type': 'header'
                    })
                elif self.is_financial_table_row(block_text):
                    tables.append({
                        'text': block_text,
                        'bbox': block_bbox,
                        'type': 'table_row'
                    })
                elif self.contains_financial_data(block_text):
                    financial_data.append({
                        'text': block_text,
                        'bbox': block_bbox,
                        'type': 'financial_data'
                    })
                else:
                    paragraphs.append({
                        'text': block_text,
                        'bbox': block_bbox,
                        'type': 'paragraph'
                    })
        
        return {
            'headers': headers,
            'tables': tables,
            'paragraphs': paragraphs,
            'financial_data': financial_data
        }

    def is_financial_header(self, text: str) -> bool:
        text_upper = text.upper()
        header_patterns = [
            'CONSOLIDATED STATEMENT OF COMPREHENSIVE INCOME',
            'STATEMENT OF COMPREHENSIVE INCOME',
            'STATEMENT OF PROFIT OR LOSS AND OTHER COMPREHENSIVE INCOME',
            'STATEMENT OF PROFIT OR LOSS',
            'CONSOLIDATED STATEMENT OF PROFIT OR LOSS',
            'STATEMENT OF FINANCIAL POSITION',
            'CONSOLIDATED STATEMENT OF FINANCIAL POSITION',
            'STATEMENT OF CASH FLOWS',
            'CONSOLIDATED STATEMENT OF CASH FLOWS',
            'BALANCE SHEET',
            'INCOME STATEMENT',
            'NOTE', 'NOTES TO THE FINANCIAL STATEMENTS',
            'NOTES TO THE CONSOLIDATED FINANCIAL STATEMENTS'
        ]
        
        return any(pattern in text_upper for pattern in header_patterns)

    def is_financial_table_row(self, text: str) -> bool:
        pattern = r'^[A-Za-z\s&,().-]+\s+[\d,\(\)\-\s.]+[\d,\(\)\-\s.]*$'
        return bool(re.match(pattern, text)) and any(char.isdigit() for char in text)

    def contains_financial_data(self, text: str) -> bool:
        financial_keywords = [
            'revenue', 'income', 'expense', 'profit', 'loss', 'assets', 'liabilities',
            'cash', 'dividend', 'interest', 'tax', 'total', 'net', 'gross'
        ]
        text_lower = text.lower()
        has_keyword = any(keyword in text_lower for keyword in financial_keywords)
        has_numbers = bool(re.search(r'\d+[,.]?\d*', text))
        return has_keyword and has_numbers

    def detect_tables(self, img_data: bytes) -> List[Dict[str, Any]]:
        try:
            with self.model_lock:
                if not self.models_loaded:
                    return []
                
                import io
                from PIL import Image
                
                img = Image.open(io.BytesIO(img_data))

                inputs = self.table_processor(images=img, return_tensors="pt")
                inputs = {k: v.to(self.device) for k, v in inputs.items()}

                with torch.no_grad():
                    outputs = self.table_model(**inputs)

                target_sizes = torch.tensor([img.size[::-1]])
                results = self.table_processor.post_process_object_detection(
                    outputs, 
                    target_sizes=target_sizes, 
                    threshold=0.7
                )[0]
                
                tables = []
                for score, label, box in zip(
                    results["scores"], 
                    results["labels"], 
                    results["boxes"]
                ):
                    tables.append({
                        "bbox": box.tolist(),
                        "confidence": score.item(),
                        "label": self.table_model.config.id2label[label.item()]
                    })
                
                return tables
            
        except Exception as e:
            logger.warning(f"Error detecting tables: {str(e)}")
            return []

    def extract_financial_metadata(self, pages_data: List[Dict[str, Any]]) -> Dict[str, str]:
        currency = "AUD"
        rounding = "units"
        rounding_note = None
        
        for page in pages_data:
            if not page:
                continue

            page_text = " ".join([
                t['text'] for t in page['text_instances']
            ])
            
            detected_currency = self.detect_currency_from_page(page_text)
            if detected_currency:
                currency = detected_currency
            
            detected_rounding, note = self.detect_rounding_from_page(page_text)
            if detected_rounding:
                rounding = detected_rounding
                if note:
                    rounding_note = note
        
        return {
            "currency": currency,
            "rounding": rounding,
            "rounding_note": rounding_note
        }

    def detect_currency_from_page(self, text: str) -> Optional[str]:
        text_upper = text.upper()
        for currency, patterns in CURRENCY_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, text_upper):
                    return currency
        return None

    def detect_rounding_from_page(self, text: str) -> Tuple[Optional[str], Optional[str]]:
        text_lower = text.lower()
        
        for rounding_type, patterns in ROUNDING_PATTERNS.items():
            for pattern in patterns:
                match = re.search(pattern, text_lower)
                if match:
                    context_start = max(0, match.start() - 50)
                    context_end = min(len(text_lower), match.end() + 50)
                    context = text_lower[context_start:context_end].strip()
                    return rounding_type, context
        
        rounding_statements = [
            r'amounts.*rounded.*nearest.*hundred.*thousand.*dollars',
            r'figures.*rounded.*nearest.*thousand.*dollars',
            r'amounts.*expressed.*millions.*dollars',
            r'figures.*expressed.*millions.*dollars',
            r'amounts.*stated.*millions',
            r'figures.*stated.*millions'
        ]
        
        for pattern in rounding_statements:
            match = re.search(pattern, text_lower)
            if match:
                if 'million' in match.group():
                    return 'millions', match.group()
                elif 'thousand' in match.group():
                    return 'thousands', match.group()
        
        return None, None

    def find_financial_sections(self, pages_data: List[Dict[str, Any]]) -> Dict[str, Any]:

        sections = {
            'profit_loss': None,
            'comprehensive_income': None,
            'balance_sheet': None,
            'cash_flow': None,
            'notes': []
        }
        
        section_patterns = {
            'comprehensive_income': [
                r'CONSOLIDATED\s+STATEMENT\s+OF\s+COMPREHENSIVE\s+INCOME',
                r'STATEMENT\s+OF\s+COMPREHENSIVE\s+INCOME',
                r'STATEMENT\s+OF\s+PROFIT\s+OR\s+LOSS\s+AND\s+OTHER\s+COMPREHENSIVE\s+INCOME'
            ],
            'profit_loss': [
                r'CONSOLIDATED\s+STATEMENT\s+OF\s+PROFIT\s+(?:OR\s+LOSS|AND\s+LOSS)',
                r'STATEMENT\s+OF\s+PROFIT\s+(?:OR\s+LOSS|AND\s+LOSS)',
                r'INCOME\s+STATEMENT',
                r'PROFIT\s+(?:OR\s+LOSS|AND\s+LOSS)\s+STATEMENT'
            ],
            'balance_sheet': [
                r'CONSOLIDATED\s+STATEMENT\s+OF\s+FINANCIAL\s+POSITION',
                r'STATEMENT\s+OF\s+FINANCIAL\s+POSITION',
                r'BALANCE\s+SHEET',
                r'STATEMENT\s+OF\s+ASSETS?\s+AND\s+LIABILITIES'
            ],
            'cash_flow': [
                r'CONSOLIDATED\s+STATEMENT\s+OF\s+CASH\s+FLOWS?',
                r'STATEMENT\s+OF\s+CASH\s+FLOWS?',
                r'CASH\s+FLOWS?\s+STATEMENT'
            ]
        }

        for page in pages_data:
            if not page:
                continue

            page_text = " ".join([
                t['text'] for t in page['text_instances']
            ])
            page_text_upper = page_text.upper()

            for section_type, patterns in section_patterns.items():
                if sections[section_type] is None:
                    for pattern in patterns:
                        if re.search(pattern, page_text_upper):
                            section_text_instances = []
                            
                            section_text_instances.extend(page['text_instances'])
                            
                            structured_data = page.get('structured_text', {})
                            
                            sections[section_type] = {
                                'page': page['page_num'],
                                'text_instances': section_text_instances,
                                'structured_data': structured_data,
                                'pattern_matched': pattern
                            }
                            
                            logger.info(f"Found {section_type} on page {page['page_num']} using pattern: {pattern}")
                            break

            for text_inst in page['text_instances']:
                text = text_inst['text']
                note_patterns = [
                    r'^NOTE\s+(\d+)(?:\s|$)',
                    r'^(\d+)\.\s+[A-Z]',
                    r'\bNOTE\s+(\d+(?:,\s*\d+)*)\b'
                ]
                
                for pattern in note_patterns:
                    match = re.search(pattern, text.upper())
                    if match:
                        sections['notes'].append({
                            'text': text,
                            'page': page['page_num'],
                            'bbox': text_inst['bbox'],
                            'note_numbers': match.group(1) if match.group(1) else text
                        })
                        break
        
        if sections['comprehensive_income'] and not sections['profit_loss']:
            sections['profit_loss'] = sections['comprehensive_income']
        
        return sections

    def combine_text(self, pages_data: List[Dict[str, Any]]) -> str:
        full_text_parts = []
        
        for page in pages_data:
            if page:
                if 'structured_text' in page:
                    structured = page['structured_text']
                    
                    for header in structured['headers']:
                        full_text_parts.append(f"\n=== {header['text']} ===\n")
                    
                    for table_row in structured['tables']:
                        full_text_parts.append(table_row['text'])
                    
                    for financial_item in structured.get('financial_data', []):
                        full_text_parts.append(financial_item['text'])
                    
                    for paragraph in structured['paragraphs']:
                        full_text_parts.append(paragraph['text'])
                else:
                    page_text = " ".join([t['text'] for t in page['text_instances']])
                    full_text_parts.append(page_text)
                
                full_text_parts.append("\n--- PAGE BREAK ---\n")
        
        return "\n".join(full_text_parts)

    def process_batch(self, file_paths: List[Path]) -> List[Dict[str, Any]]:
        results = []

        with ThreadPoolExecutor(max_workers=min(4, len(file_paths))) as executor:
            
            futures = {
                executor.submit(self.process_pdf_sync, path): path for path in file_paths
            }
            
            for future in as_completed(futures):
                path = futures[future]

                try:
                    result = future.result()
                    results.append(result)
                except Exception as e:
                    logger.error(f"Failed to process {path}: {str(e)}")
                    results.append({
                        'filename': path.name,
                        'error': str(e),
                        'status': 'failed'
                    })
        return results


pdf_processor = None 
processor_lock = threading.Lock()

def get_pdf_processor() -> PDFProcessor:
    global pdf_processor 
    with processor_lock:
        if pdf_processor is None:
            pdf_processor = PDFProcessor()
        return pdf_processor