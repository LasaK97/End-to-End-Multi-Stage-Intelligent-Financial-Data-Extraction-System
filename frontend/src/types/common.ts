export type ProcessingStatus = 'uploaded' | 'processing' | 'completed' | 'failed';

export type DocumentViewMode = 'grid' | 'list';

export interface DocumentFilters {
  search?: string;
  company?: string;
  currency?: string;
  rounding?: string;
  qualityMin?: number;
  dateRange?: [Date, Date];
  status?: ProcessingStatus[];
}

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
}

export interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}

export interface ApiError {
  message: string;
  status: number;
  details?: string;
}

export interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error' | 'ready' | 'processing' | 'completed';
  documentId?: string;
  error?: string;
  uploadTimestamp?: string;
  processingStarted?: boolean;
}
