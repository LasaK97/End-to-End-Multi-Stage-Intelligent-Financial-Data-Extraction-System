import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { useUploadStore } from '../stores/useUploadStore';
import { uploadDocument } from '../services/api';
import { validateFile } from '../utils/validation';

export const useUpload = () => {
  const {
    files,
    addFiles,
    updateFileProgress,
    updateFileStatus,
    setUploading,
    getUploadedFiles,
    getPendingFiles,
    getFailedFiles,
  } = useUploadStore();

  const uploadFiles = useCallback(async (validFiles: File[]) => {
    setUploading(true);

    const newFileRefs = addFiles(validFiles);

    await Promise.all(
      newFileRefs.map(async ({ id, file }) => {
        try {
          updateFileStatus(id, 'uploading');

          const response = await uploadDocument(file, (progress) => {
            updateFileProgress(id, progress);
          });
          console.log('Upload response:', response); // ADD THIS
          console.log('Document ID:', response.document_id)
          updateFileStatus(id, 'success', undefined, response.document_id);
        } catch (error: any) {
          console.error(`Upload failed for ${file.name}:`, error);
          updateFileStatus(id, 'error', error?.message || 'Upload failed');
          toast.error(`${file.name}: Upload failed`);
        }
      })
    );

    setUploading(false);
  }, [addFiles, updateFileProgress, updateFileStatus, setUploading]);

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
      uploadFiles(validFiles);
    }
  }, [uploadFiles]);

  const retryUpload = useCallback((fileWithMeta: typeof files[0]) => {
    const { file, id } = fileWithMeta;
    updateFileStatus(id, 'pending', undefined);
    uploadFiles([file]);
  }, [uploadFiles, updateFileStatus]);

  const getStats = () => {
    return {
      total: files.length,
      uploaded: getUploadedFiles().length,
      pending: getPendingFiles().length,
      failed: getFailedFiles().length,
      processable: getUploadedFiles().length,
    };
  };

  return {
    handleFileAdd,
    uploadFiles,
    retryUpload,
    isUploading: useUploadStore.getState().isUploading,
    getStats,
  };
};
