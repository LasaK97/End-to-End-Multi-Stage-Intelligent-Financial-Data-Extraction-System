import { useCallback } from 'react';
import { useUploadDocument } from './useApi';
import { useUploadStore } from '../stores/useUploadStore';
import { validateFile } from '../utils/validation';
import toast from 'react-hot-toast';

export const useUpload = () => {
  const uploadMutation = useUploadDocument();
  const { 
    files, 
    addFiles, 
    updateFileProgress, 
    updateFileStatus, 
    setUploading,
    isUploading 
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
          const result = await uploadMutation.mutateAsync({
            file,
            onProgress: (progress) => {
              updateFileProgress(fileRecord.id, progress);
            },
          });

          updateFileStatus(fileRecord.id, 'success', undefined, result.document_id);
          toast.success(`${file.name} uploaded successfully`);
        } catch (error: any) {
          const errorMessage = error.details || error.message || 'Upload failed';
          updateFileStatus(fileRecord.id, 'error', errorMessage);
          toast.error(`${file.name}: ${errorMessage}`);
        }
      }
    } finally {
      setUploading(false);
    }
  }, [files, uploadMutation, updateFileStatus, updateFileProgress, setUploading]);

  const retryUpload = useCallback((fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file) {
      uploadFiles([file.file]);
    }
  }, [files, uploadFiles]);

  return {
    files,
    isUploading,
    handleFileAdd,
    retryUpload,
    uploadProgress: uploadMutation.isPending,
  };
};