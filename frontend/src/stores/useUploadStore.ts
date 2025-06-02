import { create } from 'zustand';
import type { UploadFile } from '../types/common';

interface UploadStore {
  files: UploadFile[];
  isUploading: boolean;
  isProcessing: boolean;
  
  addFiles: (files: File[]) => void;
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
  getPendingFiles: () => UploadFile[];
  getFailedFiles: () => UploadFile[];
}

export const useUploadStore = create<UploadStore>((set, get) => ({
  files: [],
  isUploading: false,
  isProcessing: false,

  addFiles: (files: File[]) => {
    const newFiles: UploadFile[] = files.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      progress: 0,
      status: 'pending',
    }));

    set((state) => ({
      files: [...state.files, ...newFiles],
    }));
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
    set((state) => ({
      files: state.files.map((file) =>
        file.id === id
          ? { 
              ...file, 
              status, 
              error, 
              documentId, 
              progress: status === 'success' ? 100 : file.progress 
            }
          : file
      ),
    }));
  },

  removeFile: (id: string) => {
    set((state) => ({
      files: state.files.filter((file) => file.id !== id),
    }));
  },

  clearCompleted: () => {
    set((state) => ({
      files: state.files.filter((file) => 
        file.status === 'pending' || file.status === 'uploading'
      ),
    }));
  },

  clearAll: () => {
    set({ files: [] });
  },

  setUploading: (uploading: boolean) => {
    set({ isUploading: uploading });
  },

  setProcessing: (processing: boolean) => {
    set({ isProcessing: processing });
  },

  getUploadedFiles: () => {
    return get().files.filter(file => file.status === 'success');
  },

  getProcessableFiles: () => {
    return get().files.filter(file => 
      file.status === 'success' && file.documentId
    );
  },

  getPendingFiles: () => {
    return get().files.filter(file => file.status === 'pending');
  },

  getFailedFiles: () => {
    return get().files.filter(file => file.status === 'error');
  },
}));