import { create } from 'zustand';
import type { UploadFile } from '../types/common';

interface UploadStore {
  files: UploadFile[];
  isUploading: boolean;
  isProcessing: boolean;
  processedCount: number;
  totalProcessing: number;

  addFiles: (files: File[]) => { id: string; file: File }[];
  updateFileProgress: (id: string, progress: number) => void;
  updateFileStatus: (
    id: string,
    status: UploadFile['status'],
    error?: string,
    documentId?: string
  ) => void;
  removeFile: (id: string) => void;
  clearCompleted: () => void;
  clearAll: () => void;

  setUploading: (uploading: boolean) => void;
  setProcessing: (processing: boolean) => void;

  getUploadedFiles: () => UploadFile[];
  getProcessableFiles: () => UploadFile[];
  getProcessingFiles: () => UploadFile[];
  getCompletedFiles: () => UploadFile[];
  getPendingFiles: () => UploadFile[];
  getFailedFiles: () => UploadFile[];
  getProcessingStats: () => {
    total: number;
    readyToProcess: number;
    processing: number;
    completed: number;
    failed: number;
    isProcessing: boolean;
    progressPercentage: number;
  };
}

export const useUploadStore = create<UploadStore>((set, get) => ({
  files: [],
  isUploading: false,
  isProcessing: false,
  processedCount: 0,
  totalProcessing: 0,

  addFiles: (files: File[]) => {
    const newFiles: UploadFile[] = files.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      progress: 0,
      status: 'pending',
      uploadTimestamp: new Date().toISOString(),
    }));

    set((state) => ({
      files: [...state.files, ...newFiles],
    }));

    return newFiles.map(f => ({ id: f.id, file: f.file }));
  },

  updateFileProgress: (id: string, progress: number) => {
    set((state) => ({
      files: state.files.map((file) =>
        file.id === id ? { ...file, progress } : file
      ),
    }));
  },

  updateFileStatus: (
    id: string,
    status: UploadFile['status'],
    error?: string,
    documentId?: string
  ) => {
    set((state) => {
      const newFiles = state.files.map((file) =>
        file.id === id
          ? {
              ...file,
              status,
              error,
              documentId,
              progress: status === 'success' || status === 'completed' ? 100 : file.progress,
            }
          : file
      );

      const processingFiles = newFiles.filter(f => f.status === 'processing' || f.status === 'ready');
      const completedFiles = newFiles.filter(f => f.status === 'completed');
      const failedFiles = newFiles.filter(f => f.status === 'error');
      const totalInProgress = processingFiles.length + completedFiles.length + failedFiles.length;

      return {
        files: newFiles,
        processedCount: completedFiles.length + failedFiles.length,
        totalProcessing: totalInProgress > 0 ? totalInProgress : state.totalProcessing,
      };
    });
  },

  removeFile: (id: string) => {
    set((state) => ({
      files: state.files.filter((file) => file.id !== id),
    }));
  },

  clearCompleted: () => {
    set((state) => ({
      files: state.files.filter(
        (file) => file.status === 'pending' || file.status === 'uploading' || file.status === 'processing'
      ),
    }));
  },

  clearAll: () => {
    set({ 
      files: [], 
      isProcessing: false,
      processedCount: 0,
      totalProcessing: 0,
    });
  },

  setUploading: (uploading: boolean) => {
    set({ isUploading: uploading });
  },

  setProcessing: (processing: boolean) => {
    set({ isProcessing: processing });
  },

  getUploadedFiles: () => {
    return get().files.filter((file) => file.status === 'success');
  },

  getProcessableFiles: () => {
    return get().files.filter(
      (file) => file.status === 'success' && file.documentId
    );
  },

  getProcessingFiles: () => {
    return get().files.filter((file) => file.status === 'processing' || file.status === 'ready');
  },

  getCompletedFiles: () => {
    return get().files.filter((file) => file.status === 'completed');
  },

  getPendingFiles: () => {
    return get().files.filter((file) => file.status === 'pending');
  },

  getFailedFiles: () => {
    return get().files.filter((file) => file.status === 'error');
  },

  getProcessingStats: () => {
    const state = get();
    const files = state.files;
    
    const total = files.length;
    const readyToProcess = files.filter(f => f.status === 'success' && f.documentId).length;
    const processing = files.filter(f => f.status === 'processing' || f.status === 'ready').length;
    const completed = files.filter(f => f.status === 'completed').length;
    const failed = files.filter(f => f.status === 'error').length;
    
    const isProcessing = processing > 0 || state.isProcessing;
    
    const totalStartedProcessing = processing + completed + failed;
    const finishedProcessing = completed + failed;
    const progressPercentage = totalStartedProcessing > 0 
      ? Math.round((finishedProcessing / totalStartedProcessing) * 100)
      : 0;
    
    return {
      total,
      readyToProcess,
      processing,
      completed,
      failed,
      isProcessing,
      progressPercentage,
    };
  },
}));