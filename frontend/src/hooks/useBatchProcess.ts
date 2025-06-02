import { useState } from 'react';
import { useUploadStore } from '../stores/useUploadStore';
import { processBatch, clearQueue, clearResults } from '../services/api';
import toast from 'react-hot-toast';

export const useBatchProcess = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const { getProcessableFiles, clearAll, files } = useUploadStore();

  const startProcessing = async () => {
    const processableFiles = getProcessableFiles();
    
    if (processableFiles.length === 0) {
      toast.error('No files ready for processing');
      return;
    }

    const documentIds = processableFiles
      .map(file => file.documentId)
      .filter(Boolean) as string[];

    if (documentIds.length === 0) {
      toast.error('No valid document IDs found');
      return;
    }

    setIsProcessing(true);
    
    try {
      const result = await processBatch(documentIds);
      
      const successCount = result.processed_documents?.length || 0;
      const failedCount = result.failed_documents?.length || 0;
      
      if (successCount > 0) {
        toast.success(`Started processing ${successCount} documents`);
      }
      
      if (failedCount > 0) {
        toast.error(`Failed to process ${failedCount} documents`);
        console.warn('Failed documents:', result.failed_documents);
      }
      
      return result;
      
    } catch (error: any) {
      toast.error('Failed to start processing');
      console.error('Processing error:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const clearUploadQueue = async () => {
    if (isClearing) return;
    
    const uploadedFiles = files.filter(f => f.status === 'success');
    
    if (uploadedFiles.length === 0) {
      toast.error('No files in queue to clear');
      return;
    }

    setIsClearing(true);
    
    try {
      const result = await clearQueue();
      
      // Clear from local state
      clearAll();
      
      toast.success(`Queue cleared: ${result.cleared_count} files removed`);
      return result;
      
    } catch (error: any) {
      toast.error('Failed to clear queue');
      console.error('Clear queue error:', error);
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
      console.error('Clear results error:', error);
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
    const errorFiles = files.filter(f => f.status === 'error').length;
    
    return {
      total: totalFiles,
      uploaded: uploadedFiles,
      pending: pendingFiles,
      uploading: uploadingFiles,
      errors: errorFiles,
      readyToProcess: uploadedFiles
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