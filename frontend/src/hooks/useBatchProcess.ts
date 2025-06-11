import { useState, useEffect } from 'react';
import { useUploadStore } from '../stores/useUploadStore';
import { processBatch, clearQueue, clearResults } from '../services/api';
import { useStatusPolling } from './useStatusPolling';
import toast from 'react-hot-toast';

export const useBatchProcess = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [processingDocIds, setProcessingDocIds] = useState<string[]>([]);
  const { getProcessableFiles, clearAll, files, updateFileStatus, setProcessing } = useUploadStore();

  const { isPolling } = useStatusPolling(processingDocIds);

  const startProcessing = async () => {
    console.log('startProcessing called');
    
    const processableFiles = getProcessableFiles();
    const documentIds = processableFiles
      .map(file => file.documentId)
      .filter((id): id is string => Boolean(id));

    console.log('Processing files:', { processableFiles, documentIds });

    if (documentIds.length === 0) {
      toast.error('No valid files ready for processing');
      return;
    }

    setIsProcessing(true);
    setProcessing(true);

    processableFiles.forEach(file => {
      updateFileStatus(file.id, 'processing', undefined, file.documentId);
    });

    try {
      console.log('Calling processBatch API...');
      const result = await processBatch(documentIds);
      console.log('ProcessBatch result:', result);

      const successCount = result.processed_documents?.length || 0;
      const failedCount = result.failed_documents?.length || 0;

      if (successCount > 0) {
        toast.success(`Started processing ${successCount} document${successCount > 1 ? 's' : ''}`);
        
        setProcessingDocIds(result.processed_documents || []);
      }

      if (failedCount > 0) {
        toast.error(`Failed to process ${failedCount} document${failedCount > 1 ? 's' : ''}`);
        
        result.failed_documents?.forEach((failedDoc: any) => {
          const file = processableFiles.find(f => f.documentId === failedDoc.doc_id);
          if (file) {
            updateFileStatus(file.id, 'error', failedDoc.error, failedDoc.doc_id);
          }
        });
      }

      return result;

    } catch (error: any) {
      console.error('Processing error:', error);
      toast.error('Failed to start processing');
      
      processableFiles.forEach(file => {
        updateFileStatus(file.id, 'success', undefined, file.documentId);
      });
      
      setProcessing(false);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    const stillProcessing = files.some(f => f.status === 'processing');
    if (!stillProcessing && processingDocIds.length > 0) {
      console.log('All processing complete, stopping polling');
      setProcessingDocIds([]);
      setProcessing(false);
    }
  }, [files, processingDocIds.length, setProcessing]);

  const clearUploadQueue = async () => {
    if (isClearing) return;

    setIsClearing(true);
    try {
      const result = await clearQueue();
      clearAll();
      setProcessingDocIds([]); // Stop polling
      toast.success(`Queue cleared: ${result.cleared_count} files removed`);
      return result;
    } catch (error: any) {
      toast.error('Failed to clear queue');
      throw error;
    } finally {
      setIsClearing(false);
    }
  };

  const clearExtractionResults = async () => {
    if (isClearing) return;

    setIsClearing(true);
    try {
      const result = await clearResults();
      toast.success(`Results cleared: ${result.cleared_count} results removed`);
      return result;
    } catch (error: any) {
      toast.error('Failed to clear results');
      throw error;
    } finally {
      setIsClearing(false);
    }
  };

  const getQueueStats = () => {
    const totalFiles = files.length;
    const uploadedFiles = files.filter(f => f.status === 'success').length;
    const pendingFiles = files.filter(f => f.status === 'pending').length;
    const uploadingFiles = files.filter(f => f.status === 'uploading').length;
    const processingFiles = files.filter(f => f.status === 'processing' || f.status === 'ready').length;
    const completedFiles = files.filter(f => f.status === 'completed').length;
    const errorFiles = files.filter(f => f.status === 'error').length;

    return {
      total: totalFiles,
      uploaded: uploadedFiles,
      pending: pendingFiles,
      uploading: uploadingFiles,
      processing: processingFiles,
      completed: completedFiles,
      errors: errorFiles,
      readyToProcess: uploadedFiles,
      failed: errorFiles,
      processable: getProcessableFiles().length,
      isPolling,
    };
  };

  return {
    isProcessing: isProcessing || isPolling,
    isClearing,
    startProcessing,
    clearUploadQueue,
    clearExtractionResults,
    getQueueStats,
  };
};

export const useBatchProcessSimple = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const { getProcessableFiles, clearAll, files, updateFileStatus, setProcessing } = useUploadStore();

  const startProcessing = async () => {
    console.log('startProcessing called');
    
    const processableFiles = getProcessableFiles();
    const documentIds = processableFiles
      .map(file => file.documentId)
      .filter((id): id is string => Boolean(id));

    if (documentIds.length === 0) {
      toast.error('No valid files ready for processing');
      return;
    }

    setIsProcessing(true);
    setProcessing(true);

    processableFiles.forEach(file => {
      updateFileStatus(file.id, 'processing', undefined, file.documentId);
    });

    try {
      const result = await processBatch(documentIds);
      const successCount = result.processed_documents?.length || 0;

      if (successCount > 0) {
        toast.success(`Started processing ${successCount} document${successCount > 1 ? 's' : ''}`);
        
        setTimeout(() => {
          processableFiles.forEach(file => {
            updateFileStatus(file.id, 'completed', undefined, file.documentId);
          });
          setProcessing(false);
          toast.success('Processing completed! (simulated)');
        }, 10000);
      }

      return result;
    } catch (error: any) {
      console.error('Processing error:', error);
      toast.error('Failed to start processing');
      setProcessing(false);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const clearUploadQueue = async () => {
    if (isClearing) return;
    setIsClearing(true);
    try {
      const result = await clearQueue();
      clearAll();
      toast.success(`Queue cleared: ${result.cleared_count} files removed`);
      return result;
    } finally {
      setIsClearing(false);
    }
  };

  const clearExtractionResults = async () => {
    if (isClearing) return;
    setIsClearing(true);
    try {
      const result = await clearResults();
      toast.success(`Results cleared: ${result.cleared_count} results removed`);
      return result;
    } finally {
      setIsClearing(false);
    }
  };

  const getQueueStats = () => {
    const totalFiles = files.length;
    const uploadedFiles = files.filter(f => f.status === 'success').length;
    const processingFiles = files.filter(f => f.status === 'processing').length;
    const completedFiles = files.filter(f => f.status === 'completed').length;
    const errorFiles = files.filter(f => f.status === 'error').length;

    return {
      total: totalFiles,
      uploaded: uploadedFiles,
      processing: processingFiles,
      completed: completedFiles,
      errors: errorFiles,
      processable: getProcessableFiles().length,
    };
  };

  return {
    isProcessing,
    isClearing,
    startProcessing,
    clearUploadQueue,
    clearExtractionResults,
    getQueueStats,
  };
};