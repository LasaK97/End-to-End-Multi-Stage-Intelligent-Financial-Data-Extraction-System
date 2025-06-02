import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import type { DocumentFilters } from '../types/common';

export const useHealth = () => {
  return useQuery({
    queryKey: ['health'],
    queryFn: api.getHealth,
    refetchInterval: 30000,
    retry: false,
  });
};

export const useStats = () => {
  return useQuery({
    queryKey: ['stats'],
    queryFn: api.getStats,
    refetchInterval: 60000,
  });
};

export const useDocuments = (filters?: DocumentFilters) => {
  return useQuery({
    queryKey: ['documents', filters],
    queryFn: () => api.getDocuments(filters),
    staleTime: 30000,
  });
};

export const useProcessingStatus = (docId: string, enabled = true) => {
  return useQuery({
    queryKey: ['status', docId],
    queryFn: () => api.getProcessingStatus(docId),
    enabled: enabled && !!docId,
    refetchInterval: (data) => {
      if (!data) return false;
      return data.status === 'processing' || data.status === 'uploaded' ? 2000 : false;
    },
  });
};

export const useExtractionResults = (docId: string, includeRaw = false) => {
  return useQuery({
    queryKey: ['results', docId, includeRaw],
    queryFn: () => api.getExtractionResults(docId, includeRaw),
    enabled: !!docId,
  });
};

export const useUploadDocument = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ file, onProgress }: { file: File; onProgress?: (progress: number) => void }) =>
      api.uploadDocument(file, onProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
};

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
};