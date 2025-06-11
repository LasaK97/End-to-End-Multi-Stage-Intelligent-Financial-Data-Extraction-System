import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import * as api from '../services/api';
import type { DocumentFilters } from '../types/common';
import type { StatusResponse } from '../types/api';
import { useUploadStore } from '../stores/useUploadStore';
import toast from 'react-hot-toast';

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
  return useQuery<StatusResponse>({
    queryKey: ['status', docId],
    queryFn: () => api.getProcessingStatus(docId),
    enabled: enabled && !!docId,
    refetchInterval: 2000, 
    refetchIntervalInBackground: false,
  });
};

export const useEnhancedProcessingStatus = (docId: string, enabled = true) => {
  const { updateFileStatus, files } = useUploadStore();
  const lastProcessedStatus = useRef<string>('');
  
  const query = useQuery<StatusResponse>({
    queryKey: ['enhanced-status', docId],
    queryFn: (): Promise<StatusResponse> => api.getProcessingStatus(docId),
    enabled: enabled && !!docId,
    refetchInterval: 2000,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (query.data && query.data.status !== lastProcessedStatus.current) {
      const data = query.data;
      const file = files.find(f => f.documentId === docId);
      
      console.log(`Status update for ${docId}: ${lastProcessedStatus.current} -> ${data.status}`);
      
      if (file) {
        if (file.status !== data.status) {
          lastProcessedStatus.current = data.status;
          
          if (data.status === 'completed') {
            updateFileStatus(file.id, 'completed', undefined, docId);
            toast.success(`${data.filename} processing completed!`);
          } else if (data.status === 'failed') {
            updateFileStatus(file.id, 'error', data.error_details?.join(', ') || 'Processing failed', docId);
            toast.error(`${data.filename} processing failed`);
          } else if (data.status === 'processing') {
            updateFileStatus(file.id, 'processing', undefined, docId);
          }
        }
      }
    }
  }, [query.data?.status, docId]); 

  return query;
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

export const useBatchProcess = () => {
  const queryClient = useQueryClient();
  const { updateFileStatus, setProcessing, files } = useUploadStore();
  
  return useMutation({
    mutationFn: api.processBatch,
    onMutate: (documentIds: string[]) => {
      setProcessing(true);
      
      documentIds.forEach(docId => {
        const file = files.find(f => f.documentId === docId);
        if (file && file.status !== 'processing') {
          updateFileStatus(file.id, 'processing', undefined, docId);
        }
      });
    },
    onSuccess: (result, documentIds) => {
      const successCount = result.processed_documents?.length || 0;
      const failedCount = result.failed_documents?.length || 0;

      if (successCount > 0) {
        toast.success(`Started processing ${successCount} document${successCount > 1 ? 's' : ''}`);
        
        result.processed_documents?.forEach((docId: string) => {
          queryClient.invalidateQueries({ queryKey: ['enhanced-status', docId] });
        });
      }

      if (failedCount > 0) {
        toast.error(`Failed to process ${failedCount} document${failedCount > 1 ? 's' : ''}`);
        
        result.failed_documents?.forEach((failedDoc: any) => {
          const file = files.find(f => f.documentId === failedDoc.doc_id);
          if (file) {
            updateFileStatus(file.id, 'error', failedDoc.error, failedDoc.doc_id);
          }
        });
      }

      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (error: any, documentIds) => {
      toast.error('Failed to start processing');
      console.error('Processing error:', error);
      
      documentIds.forEach(docId => {
        const file = files.find(f => f.documentId === docId);
        if (file) {
          updateFileStatus(file.id, 'success', undefined, docId);
        }
      });
      
      setProcessing(false);
    },
  });
};

export const useClearQueue = () => {
  const queryClient = useQueryClient();
  const { clearAll } = useUploadStore();
  
  return useMutation({
    mutationFn: api.clearQueue,
    onSuccess: (result) => {
      clearAll();
      toast.success(`Queue cleared: ${result.cleared_count} files removed`);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: () => {
      toast.error('Failed to clear queue');
    }
  });
};

export const useClearResults = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.clearResults,
    onSuccess: (result) => {
      toast.success(`Results cleared: ${result.cleared_count} results removed`);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: () => {
      toast.error('Failed to clear results');
    }
  });
};