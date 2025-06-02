import { apiClient } from '../utils/api-client';
import { API_ENDPOINTS } from '../utils/constants';
import type {
  UploadResponse,
  StatusResponse,
  ExtractionResult,
  DocumentsResponse,
  HealthResponse,
  StatsResponse,
} from '../types/api';
import type { DocumentFilters } from '../types/common';

export const uploadDocument = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  return apiClient.post(API_ENDPOINTS.UPLOAD, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent: any) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress);
      }
    },
  });
};

export const getProcessingStatus = async (docId: string): Promise<StatusResponse> => {
  return apiClient.get(API_ENDPOINTS.STATUS(docId));
};

export const getExtractionResults = async (
  docId: string,
  includeRaw = false
): Promise<ExtractionResult> => {
  return apiClient.get(API_ENDPOINTS.RESULTS(docId), { include_raw: includeRaw });
};

export const getDocuments = async (filters?: DocumentFilters): Promise<DocumentsResponse> => {
  return apiClient.get(API_ENDPOINTS.DOCUMENTS, filters);
};

export const deleteDocument = async (docId: string): Promise<void> => {
  return apiClient.delete(API_ENDPOINTS.DELETE_DOCUMENT(docId));
};

export const getHealth = async (): Promise<HealthResponse> => {
  return apiClient.get(API_ENDPOINTS.HEALTH);
};

export const getStats = async (): Promise<StatsResponse> => {
  return apiClient.get(API_ENDPOINTS.STATS);
};