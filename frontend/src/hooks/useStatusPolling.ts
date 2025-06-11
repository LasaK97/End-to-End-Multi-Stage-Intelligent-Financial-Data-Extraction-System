import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProcessingStatus } from '../services/api';
import { useUploadStore } from '../stores/useUploadStore';
import toast from 'react-hot-toast';
import type { StatusResponse } from '../types/api';

export const useStatusPolling = (documentIds: string[]) => {
  const { updateFileStatus, files } = useUploadStore();
  const lastKnownStatuses = useRef<Record<string, string>>({});
  const [isPolling, setIsPolling] = useState(false);

  const statusQuery = useQuery({
    queryKey: ['status-poll-all', documentIds],
    queryFn: async () => {
      if (documentIds.length === 0) return [];
      
      const statusPromises = documentIds.map(docId => 
        getProcessingStatus(docId).catch(error => ({
          document_id: docId,
          status: 'error',
          error: error.message
        }))
      );
      
      return Promise.all(statusPromises);
    },
    enabled: documentIds.length > 0,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (statusQuery.data && Array.isArray(statusQuery.data)) {
      statusQuery.data.forEach((data: any) => {
        const docId = data.document_id;
        
        if (data.status && data.status !== lastKnownStatuses.current[docId]) {
          const file = files.find(f => f.documentId === docId);
          
          if (file) {
            console.log(`Status change for ${docId}: ${lastKnownStatuses.current[docId]} -> ${data.status}`);
            lastKnownStatuses.current[docId] = data.status;
            
            switch (data.status) {
              case 'completed':
                if (file.status !== 'completed') {
                  updateFileStatus(file.id, 'completed', undefined, docId);
                  toast.success(`${data.filename || file.file.name} processing completed!`);
                }
                break;
              case 'failed':
                if (file.status !== 'error') {
                  updateFileStatus(file.id, 'error', data.error_details?.join(', ') || 'Processing failed', docId);
                  toast.error(`${data.filename || file.file.name} processing failed`);
                }
                break;
              case 'processing':
                if (file.status !== 'processing') {
                  updateFileStatus(file.id, 'processing', undefined, docId);
                }
                break;
            }
          }
        }
      });
    }
  }, [statusQuery.data, files, updateFileStatus]);

  useEffect(() => {
    setIsPolling(statusQuery.isFetching && documentIds.length > 0);
  }, [statusQuery.isFetching, documentIds.length]);

  return {
    isPolling,
    error: statusQuery.error,
  };
};