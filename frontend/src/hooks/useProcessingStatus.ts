import { useEffect, useState } from 'react';
import { useProcessingStatus as useProcessingStatusQuery } from './useApi';
import type { StatusResponse } from '../types/api';
import { useUploadStore } from '../stores/useUploadStore';

interface UseProcessingStatusOptions {
  onComplete?: (status: StatusResponse) => void;
  onError?: (status: StatusResponse) => void;
  pollInterval?: number;
}

export const useProcessingStatus = (
  documentId: string,
  options: UseProcessingStatusOptions = {}
) => {
  const { onComplete, onError, pollInterval = 2000 } = options;
  const [isPolling, setIsPolling] = useState(true);
  const { updateFileStatus } = useUploadStore();

  console.log('useProcessingStatus hook called with documentId:', documentId);
  const query = useProcessingStatusQuery(documentId, isPolling && !!documentId);

  useEffect(() => {
    console.log('useProcessingStatus useEffect triggered. query.data:', query.data);
    if (!query.data) return;

    const status = query.data;

    if (status.status === 'completed') {
      setIsPolling(false);
      onComplete?.(status);
      console.log('Status is completed. Calling updateFileStatus with ready for documentId:', documentId);
      updateFileStatus(documentId, 'ready');
    } else if (status.status === 'failed') {
      setIsPolling(false);
      onError?.(status);
      console.log('Status is failed. Calling updateFileStatus with error for documentId:', documentId);
      updateFileStatus(documentId, 'error', 'Processing failed');
    }
  }, [query.data, onComplete, onError, documentId, updateFileStatus]);

  const startPolling = () => setIsPolling(true);
  const stopPolling = () => setIsPolling(false);

  return {
    status: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isPolling,
    startPolling,
    stopPolling,
    refetch: query.refetch,
  };
};

export const useMultipleProcessingStatus = (documentIds: string[]) => {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());

  const activeIds = documentIds.filter(
    id => !completedIds.has(id) && !failedIds.has(id)
  );

  const statusQueries = activeIds.map(id => 
    useProcessingStatusQuery(id, true)
  );

  useEffect(() => {
    statusQueries.forEach((query, index) => {
      if (!query.data) return;

      const id = activeIds[index];
      const status = query.data.status;

      if (status === 'completed') {
        setCompletedIds(prev => new Set([...prev, id]));
      } else if (status === 'failed') {
        setFailedIds(prev => new Set([...prev, id]));
      }
    });
  }, [statusQueries, activeIds]);

  return {
    statusQueries,
    completedIds: Array.from(completedIds),
    failedIds: Array.from(failedIds),
    activeIds,
    allCompleted: documentIds.length > 0 && activeIds.length === 0,
  };
};