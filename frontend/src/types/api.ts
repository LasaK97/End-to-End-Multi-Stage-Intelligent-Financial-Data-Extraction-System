export interface UploadResponse {
  document_id: string;
  filename: string;
  message: string;
  status: string;
}

export interface StatusResponse {
  document_id: string;
  filename: string;
  status: string;
  progress: number;
  message: string;
  processing_time?: number;
  error_details?: string[];
}

export interface LineItem {
  label: string;
  values: Record<string, number>;
  note_references: string[];
  confidence: number;
}

export interface FinancialStatement {
  statement_type: string;
  company_name: string;
  currency: string;
  rounding: string;
  financial_years: string[];
  line_items: LineItem[];
  extraction_confidence: number;
}

export interface ExtractionResult {
  filename: string;
  document_id?: string;
  upload_timestamp: string;
  processing_time: number;
  statements: FinancialStatement[];
  status: string;
  errors: string[];
}

export interface DocumentSummary {
  document_id: string;
  filename: string;
  upload_timestamp: string;
  status: string;
  extraction_quality?: number;
  statement_count: number;
  currencies: string[];
  rounding_scales: string[];
}

export interface DocumentsResponse {
  documents: DocumentSummary[];
  total: number;
  returned: number;
  limit: number;
  skip: number;
  filters: Record<string, any>;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  database: Record<string, any>;
  models_loaded: boolean;
  pipeline_ready: boolean;
  system_info: Record<string, any>;
}

export interface StatsResponse {
  total_documents: number;
  avg_quality: number;
  avg_processing_time: number;
  currency_distribution: Record<string, number>;
  rounding_distribution: Record<string, number>;
  high_quality_documents: number;
  low_quality_documents: number;
}

export interface ErrorResponse {
  error: string;
  detail: string;
  timestamp: string;
}