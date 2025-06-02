import { create } from 'zustand';
import type { DocumentSummary } from '../types/api';

interface DocumentStore {
  selectedDocuments: DocumentSummary[];
  viewMode: 'grid' | 'list';
  setSelectedDocuments: (documents: DocumentSummary[]) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  clearSelection: () => void;
}

export const useDocumentStore = create<DocumentStore>((set) => ({
  selectedDocuments: [],
  viewMode: 'grid',
  setSelectedDocuments: (documents) => set({ selectedDocuments: documents }),
  setViewMode: (mode) => set({ viewMode: mode }),
  clearSelection: () => set({ selectedDocuments: [] }),
}));
