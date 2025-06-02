export const API_ENDPOINTS = {
  UPLOAD: '/upload',
  STATUS: (id: string) => `/status/${id}`,
  RESULTS: (id: string) => `/results/${id}`,
  DOCUMENTS: '/documents',
  DELETE_DOCUMENT: (id: string) => `/documents/${id}`,
  HEALTH: '/health',
  STATS: '/stats',
} as const;

export const FILE_CONSTRAINTS = {
  MAX_SIZE_MB: parseInt(import.meta.env.VITE_MAX_FILE_SIZE_MB || '50'),
  ALLOWED_TYPES: ['application/pdf'],
  ALLOWED_EXTENSIONS: ['.pdf'],
} as const;

export const PROCESSING_STATUS = {
  UPLOADED: 'uploaded',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const POLLING_INTERVALS = {
  STATUS_CHECK: 2000,
  HEALTH_CHECK: 30000,
} as const;

export const UI_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_UPLOAD_QUEUE: 10,
  TOAST_DURATION: 4000,
} as const;

export const QUALITY_THRESHOLDS = {
  HIGH: 0.8,
  MEDIUM: 0.5,
  LOW: 0,
} as const;