import { useCallback } from 'react';
import { useUploadStore } from '../stores/useUploadStore';
import { validateFile } from '../utils/validation';
import { uploadDocument } from '../services/api';
import toast from 'react-hot-toast';

export const useUpload = () => {
  const { 
    files, 
    addFiles, 
    updateFileProgress,
    updateFileStatus, 
    setUploading,
    isUploading,
    getProcessableFiles,
    getUploadedFiles,
    getPendingFiles,
    getFailedFiles
  } = useUploadStore();

  const handleFileAdd = useCallback((newFiles: File[]) => {
    const validFiles = newFiles.filter(file => {
      const validation = validateFile(file);
      if (!validation.isValid) {
        toast.error(`${file.name}: ${validation.error}`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      addFiles(validFiles);
      uploadFiles(validFiles);
    }
  }, [addFiles]);

  const uploadFiles = useCallback(async (filesToUpload: File[]) => {
    setUploading(true);

    try {
      for (const file of filesToUpload) {
        const fileRecord = files.find(f => f.file === file);
        if (!fileRecord) continue;

        updateFileStatus(fileRecord.id, 'uploading');

        try {
          const result = await uploadDocument(file, (progress) => {
            updateFileProgress(fileRecord.id, progress);
          });

          updateFileStatus(fileRecord.id, 'success', undefined, result.document_id);
          toast.success(`${file.name} uploaded successfully`);
          
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail || error.message || 'Upload failed';
          updateFileStatus(fileRecord.id, 'error', errorMessage);
          toast.error(`${file.name}: ${errorMessage}`);
        }
      }
    } finally {
      setUploading(false);
    }
  }, [files, updateFileStatus, updateFileProgress, setUploading]);

  const retryUpload = useCallback((fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file && file.status === 'error') {
      uploadFiles([file.file]);
    }
  }, [files, uploadFiles]);

  const getStats = useCallback(() => {
    return {
      total: files.length,
      uploaded: getUploadedFiles().length,
      pending: getPendingFiles().length,
      failed: getFailedFiles().length,
      processable: getProcessableFiles().length,
    };
  }, [files, getUploadedFiles, getPendingFiles, getFailedFiles, getProcessableFiles]);

  return {
    files,
    isUploading,
    handleFileAdd,
    retryUpload,
    getProcessableFiles,
    getUploadedFiles,
    getPendingFiles,
    getFailedFiles,
    getStats,
  };
};