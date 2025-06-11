import { useEffect } from 'react';
import { useUploadStore } from '../stores/useUploadStore';
import { useEnhancedProcessingStatus } from './useApi';

export const useProcessingMonitor = () => {
  const { files, setProcessing } = useUploadStore();
  
  const processingFiles = files.filter(f => 
    f.status === 'processing' || f.status === 'ready'
  );

  const statusQueries = processingFiles.map(file => {
    return useEnhancedProcessingStatus(file.documentId || '', !!file.documentId);
  });

  useEffect(() => {
    const stillProcessing = files.some(f => f.status === 'processing' || f.status === 'ready');
    
    if (!stillProcessing && files.length > 0) {
      setProcessing(false);
    }
  }, [files, setProcessing]);

  return {
    processingCount: processingFiles.length,
    statusQueries,
  };
};