import json
import time
import asyncio
from typing import Dict, List, Any, Optional
from pathlib import Path
import re
from concurrent.futures import ThreadPoolExecutor
import threading

try:
    from llama_cpp import Llama
except ImportError:
    Llama = None

from .config import MODELS, FINANCIAL_CONFIG, ROUNDING_PATTERNS, CURRENCY_PATTERNS
from .models import FinancialStatement, LineItem, ExtractionResult, DocumentMetadata
from utils.logger import get_logger

logger = get_logger("llm_extractor")

class LLMExtractor:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls, max_workers: int = 2):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self, max_workers: int = 2):
        if getattr(self, '_initialized', False):
            return
        try:
            self.llm = None 
            self.model_loaded = False 
            self.mock_mode = Llama is None 
            self.model_lock = threading.Lock()
            self.thread_pool = ThreadPoolExecutor(max_workers=max_workers)
            self._initialized = True
            logger.info(f"LLM Extractor initialized (mock mode: {self.mock_mode})")
            
        except Exception as e:
            logger.error(f"Error initiating LLM Extractor: {str(e)}")    

    def __enter__(self):
        return self 
    
    def __exit__(self, exec_type, exc_val, exc_tb):
        self.cleanup() 

    def cleanup(self):
        self.thread_pool.shutdown(wait=True)
        if self.llm:
            del self.llm
        logger.info("LLM Extractor cleaned.")

    async def load_model_async(self) -> bool:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self.thread_pool, self.load_model)
    
    def load_model(self) -> bool:
        with self.model_lock:
            if self.model_loaded:
                return True 
        
            if self.mock_mode:
                logger.warning("Running in mock mode--no LLM loaded.")
                self.model_loaded = True 
                return True 
            
            try:
                st = time.time()
                logger.info("Loading the LLM - Mistral-7B model...")

                model_path = Path(MODELS["mistral"]["model_path"])
                if not model_path.exists():
                    logger.error(f"Model not found: {model_path}")
                    return False 
                
                self.llm = Llama(
                    model_path=str(model_path),
                    n_ctx=MODELS["mistral"]["n_ctx"],
                    n_gpu_layers=MODELS["mistral"]["n_gpu_layers"],
                    n_threads=4,
                    verbose=False 
                )

                load_time = time.time() - st
                self.model_loaded = True 
                logger.info(f"Model loaded successfully in {load_time:.2f}s.")
                return True
            except Exception as e:
                logger.error(f"Error loading model: {str(e)}")
                self.model_loaded = False 
                return False

    def extract_document_metadata(self, text: str) -> Dict[str, str]:
        currency = self.detect_currency(text)
        rounding = self.detect_rounding(text)
        return {"currency": currency, "rounding": rounding}

    def detect_currency(self, text: str) -> str:
        text_upper = text.upper()
        for currency, patterns in CURRENCY_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, text_upper):
                    return currency
        
        if '$' in text:
            return 'AUD'
        return 'AUD'

    def detect_rounding(self, text: str) -> str:
        text_lower = text.lower()
        for rounding_type, patterns in ROUNDING_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    return rounding_type
        return 'units'
            
    async def extract_from_text_async(self, text: str, section_type: str = "profit_loss", pdf_metadata: Optional[Dict[str, str]] = None) -> Optional[FinancialStatement]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self.thread_pool,
            self.extract_from_text_with_retry,
            text,
            section_type,
            pdf_metadata
        )
    
    def extract_from_text_with_retry(self, text: str, section_type: str = "profit_loss", pdf_metadata: Optional[Dict[str, str]] = None, max_retries: int = 3) -> Optional[FinancialStatement]:
        for attempt in range(max_retries):
            try:
                logger.info(f"Extraction attempt {attempt + 1}/{max_retries} for {section_type}")
                
                if self.mock_mode and FINANCIAL_CONFIG.get("enable_mock_mode", False):
                    logger.warning("LLM library unavailable, using mock data")
                    return self.get_mock_statement()
                
                if not self.model_loaded:
                    self.load_model()

                result = self.extract_simplified(text, section_type, attempt, pdf_metadata)
                if result:
                    logger.info(f"Successful extraction on attempt {attempt + 1}")
                    return result
                    
            except Exception as e:
                logger.warning(f"Attempt {attempt + 1} failed: {str(e)}")
                if attempt == max_retries - 1:
                    logger.error(f"All {max_retries} attempts failed for {section_type}")
                continue
        
        return None

    def extract_simplified(self, text: str, section_type: str, attempt: int, pdf_metadata: Optional[Dict[str, str]] = None) -> Optional[FinancialStatement]:
        if pdf_metadata:
            metadata = pdf_metadata
        else:
            metadata = self.extract_document_metadata(text)
        
        if attempt == 0:
            return self.extract_line_by_line(text, section_type, metadata)
        elif attempt == 1:
            return self.extract_reduced_context(text, section_type, metadata)
        else:
            return self.extract_basic_structure(text, section_type, metadata)

    def extract_line_by_line(self, text: str, section_type: str, metadata: Dict[str, str]) -> Optional[FinancialStatement]:
        prompt = self.create_extraction_prompt(text, section_type, metadata)

        try:
            with self.model_lock:
                response = self.llm(
                    prompt,
                    max_tokens=3000,
                    temperature=MODELS["mistral"].get("temperature", 0.05),
                    stop=["```", "\n\n---", "END"],
                    echo=False
                )

            json_text = response['choices'][0]['text'].strip()
            json_text = self.clean_json_response(json_text)
            
            if FINANCIAL_CONFIG.get("log_llm_responses", False):
                logger.info(f"Generated JSON length: {len(json_text)}")
                logger.debug(f"JSON preview: {json_text[:200]}...")
            
            data = json.loads(json_text)
            return self.parse_statement_data(data, metadata)
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing failed: {str(e)}")
            logger.error(f"Problematic JSON: {json_text[:500]}...")
            return None
        except Exception as e:
            logger.error(f"Extraction failed: {str(e)}")
            return None

    def extract_reduced_context(self, text: str, section_type: str, metadata: Dict[str, str]) -> Optional[FinancialStatement]:
        lines = text.split('\n')
        financial_lines = []
        
        for line in lines[:50]:
            line = line.strip()
            if any(keyword in line.lower() for keyword in ['revenue', 'income', 'expense', 'profit', 'loss', 'asset', 'liability', 'cash']):
                if any(char.isdigit() for char in line):
                    financial_lines.append(line)
        
        reduced_text = '\n'.join(financial_lines[:20])

        currency = metadata['currency']
        rounding = metadata['rounding']
        
        prompt = f"""Extract key financial items. Return minimal JSON:

            {reduced_text}

            JSON format:
            {{
                "statement_type": "{section_type}",
                "company_name": "Company",
                "currency": "{currency}",
                "rounding": "{rounding}",
                "financial_years": ["2024"],
                "line_items": [
                    {{
                        "label": "Item",
                        "values": {{
                            "2024": 0
                        }},
                        "note_references": []
                    }}
                ]
            }}

            JSON:"""


        try:
            with self.model_lock:
                response = self.llm(
                    prompt,
                    max_tokens=1500,
                    temperature=0.1,
                    stop=["```", "\n\n"],
                    echo=False
                )

            json_text = response['choices'][0]['text'].strip()
            json_text = self.clean_json_response(json_text)
            
            data = json.loads(json_text)
            return self.parse_statement_data(data, metadata)
            
        except Exception as e:
            logger.error(f"Reduced context extraction failed: {str(e)}")
            return None

    def extract_basic_structure(self, text: str, section_type: str, metadata: Dict[str, str]) -> Optional[FinancialStatement]:
        company_name = self.extract_company_name(text)
        years = self.extract_years(text)
        
        statement = FinancialStatement(
            statement_type=section_type,
            company_name=company_name or "Unknown Company",
            currency=metadata['currency'],
            rounding=metadata['rounding'],
            financial_years=years or ["2024"],
            line_items=[]
        )
        
        logger.info(f"Created basic structure for {company_name}")
        return statement

    def extract_company_name(self, text: str) -> Optional[str]:
        lines = text.split('\n')[:10]
        
        for line in lines:
            line = line.strip().upper()
            if 'PTY' in line and 'LTD' in line:
                return line
            elif 'LIMITED' in line and len(line) < 100:
                return line
        
        return None

    def extract_years(self, text: str) -> List[str]:
        years = []
        year_pattern = r'\b(20\d{2})\b'
        matches = re.findall(year_pattern, text)
        
        for match in matches:
            if 2020 <= int(match) <= 2025:
                if match not in years:
                    years.append(match)
        
        return sorted(years) if years else ["2024"]

    def create_extraction_prompt(self, text: str, section_type: str, metadata: Dict[str, str]) -> str:
        if section_type == "cash_flow":
            section_name = "Cash Flow Statement"
            example_items = [
                {
                    "label": "Net cash from operating activities",
                    "values": {"2023": 100.5, "2024": 120.3},
                    "note_references": []
                }
            ]
        elif section_type == "balance_sheet":
            section_name = "Balance Sheet"
            example_items = [
                {
                    "label": "Total assets",
                    "values": {"2023": 500.2, "2024": 550.7},
                    "note_references": ["15"]
                }
            ]
        else:
            section_name = "Profit and Loss Statement"
            example_items = [
                {
                    "label": "Revenue",
                    "values": {"2023": 175.9, "2024": 233.3},
                    "note_references": ["3"]
                }
            ]

        currency = metadata['currency']
        rounding = metadata['rounding']
        example_json = json.dumps(example_items, indent=8)
        
        prompt = f"""You are a financial document analyzer. Extract structured data from the following {section_name}.
                    IMPORTANT INSTRUCTIONS:
                    1. Extract ALL line items with their EXACT values as shown (do not scale or convert)
                    2. Include note references (e.g., "Note 3", "4", "3,4")
                    3. Currency is {currency}, rounding scale is {rounding}
                    4. Handle negative values in parentheses: (27.6) means -27.6
                    5. Extract exact numbers as displayed: 233.3, 175.9, not rounded versions
                    6. Output ONLY valid JSON, no explanations

                    Financial Statement Text:
                    {text}

                    Extract and return JSON in this EXACT format:
                    {{
                        "statement_type": "{section_type}",
                        "company_name": "Company Name",
                        "currency": "{currency}",
                        "rounding": "{rounding}",
                        "financial_years": ["2023", "2024"],
                        "line_items": {example_json}
                    }}

                    JSON Output:"""
        return prompt

    def clean_json_response(self, text: str) -> str:
        text = re.sub(r'```json\s*', '', text)
        text = re.sub(r'```\s*', '', text)
        
        start = text.find('{')
        if start == -1:
            raise ValueError("No opening brace found")
        
        brace_count = 0
        end = -1
        
        for i, char in enumerate(text[start:], start):
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                if brace_count == 0:
                    end = i
                    break
        
        if end == -1:
            logger.warning("No matching closing brace found, attempting to fix...")
            text = text[start:] + ']}'
        else:
            text = text[start:end+1]
        
        text = re.sub(r',\s*}', '}', text)
        text = re.sub(r',\s*]', ']', text)
        
        return text.strip()

    def parse_statement_data(self, data: Dict[str, Any], metadata: Dict[str, str]) -> FinancialStatement:
        try:
            line_items = []
            for item in data.get('line_items', []):
                values = {}
                for year, amount in item.get('values', {}).items():
                    if amount is None:
                        logger.warning(f"None value found for {item.get('label', 'unknown')} in year {year}")
                        amount = 0.0
                    elif isinstance(amount, str):
                        amount = self.parse_financial_number(amount)
                    elif not isinstance(amount, (int, float)):
                        logger.warning(f"Unexpected amount type {type(amount)}: {amount}")
                        amount = 0.0
                        
                    values[str(year)] = float(amount)
                
                line_item = LineItem(
                    label=item.get('label', 'Unknown Item'),
                    values=values,
                    note_references=item.get('note_references', [])
                )
                line_items.append(line_item)
            
            statement = FinancialStatement(
                statement_type=data.get('statement_type', 'profit_and_loss'),
                company_name=data.get('company_name', 'Unknown'),
                currency=metadata.get('currency', data.get('currency', 'AUD')),
                rounding=metadata.get('rounding', data.get('rounding', 'units')),
                financial_years=data.get('financial_years', []),
                line_items=line_items
            )
            
            if self.validate_extraction_response(statement):
                logger.info(f"Parsed statement: {len(line_items)} line items")
                return statement
            else:
                logger.warning("Validation failed for extracted statement")
                return None
        
        except Exception as e:
            logger.error(f"Failed to parse statement data: {str(e)}")
            raise

    def parse_financial_number(self, amount_str: str) -> float:
        if not amount_str:
            return 0.0
        
        amount_str = str(amount_str).strip()
        
        is_negative = False
        if amount_str.startswith('(') and amount_str.endswith(')'):
            is_negative = True
            amount_str = amount_str[1:-1]
        
        cleaned = re.sub(r'[^\d.-]', '', amount_str)
        
        if not cleaned:
            return 0.0
        
        try:
            value = float(cleaned)
            return -value if is_negative else value
        except ValueError:
            logger.warning(f"Could not parse amount '{amount_str}', using 0.0")
            return 0.0

    def validate_extraction_response(self, statement: FinancialStatement) -> bool:
        if not statement or not statement.line_items:
            return False
        
        suspicious_values = [1000.0, 1200.0, 800.0, 900.0, 1500.0, 1800.0]
        
        for item in statement.line_items:
            for value in item.values.values():
                if value in suspicious_values:
                    logger.warning(f"Suspicious mock-like value detected: {value}")
                    return False
        
        return True

    def get_mock_statement(self) -> FinancialStatement:
        return FinancialStatement(
            statement_type="profit_and_loss",
            company_name="B & E FOODS PTY LTD",
            currency="AUD",
            rounding="thousands",
            financial_years=["2023", "2024"],
            line_items=[
                LineItem(
                    label="Revenue",
                    values={"2023": 315.4, "2024": 320.0},
                    note_references=["3"]
                ),
                LineItem(
                    label="Other income",
                    values={"2023": 0.3, "2024": 0.4},
                    note_references=["4"]
                ),
                LineItem(
                    label="Employee benefits expenses",
                    values={"2023": -5.2, "2024": -5.2},
                    note_references=[]
                ),
                LineItem(
                    label="Profit before income tax",
                    values={"2023": 1.0, "2024": 1.2},
                    note_references=[]
                )
            ]
        )

    async def extract_from_doc_async(self, pdf_data: Dict[str, Any]) -> ExtractionResult:
        st = time.time()
        statements = []
        errors = []

        sections_to_process = [
            ('profit_loss', pdf_data.get('sections', {}).get('profit_loss')),
            ('balance_sheet', pdf_data.get('sections', {}).get('balance_sheet')),
            ('cash_flow', pdf_data.get('sections', {}).get('cash_flow'))
        ]

        sections_to_process = [(name, section) for name, section in sections_to_process if section]

        if not sections_to_process:
            # No sections found, use full text extraction
            full_text = pdf_data.get('full_text', '')
            logger.info("No sections found, using full text extraction")
            pdf_metadata = pdf_data.get('document_metadata', {})
            statement = await self.extract_from_text_async(full_text, "profit_loss", pdf_metadata)
            if statement:
                statements.append(statement)
        else:
            # Process each section individually
            for section_name, section_data in sections_to_process:
                try:
                    section_text = " ".join([
                        t['text'] for t in section_data['text_instances']
                    ])
                    
                    logger.info(f"Processing {section_name} section ({len(section_text)} chars)")
                    
                    pdf_metadata = pdf_data.get('document_metadata', {})
                    # Fix: Use section_text instead of full_text, and correct section_name
                    statement = await self.extract_from_text_async(section_text, section_name, pdf_metadata)
                    if statement:
                        statements.append(statement)
                        logger.info(f"Successfully extracted {section_name}")
                    else:
                        errors.append(f"Failed to extract {section_name}")
                        logger.warning(f"Failed to extract {section_name}")
                        
                except Exception as e:
                    error_msg = f"Error in {section_name}: {str(e)}"
                    logger.error(error_msg)
                    errors.append(error_msg)

        processing_time = time.time() - st 

        result = ExtractionResult(
            filename=pdf_data['filename'],
            processing_time=processing_time,
            statements=statements,
            status="completed" if statements else "failed",
            errors=errors
        )

        total_items = sum(len(s.line_items) for s in statements)
        logger.info(f"Extraction completed for {pdf_data['filename']}: {len(statements)} statements, {total_items} line items in {processing_time:.2f}s")
            
        return result


llm_extractor = None 
extractor_lock = threading.Lock()

def get_llm_extractor() -> LLMExtractor:
    global llm_extractor
    with extractor_lock:
        if llm_extractor is None:
            llm_extractor = LLMExtractor()
        return llm_extractor