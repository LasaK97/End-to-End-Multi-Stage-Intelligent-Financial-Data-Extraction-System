import { useState, useMemo } from 'react';
import { useDocuments as useDocumentsQuery, useDeleteDocument } from './useApi';
import { useDebounce } from './useDebounce';
import type { DocumentFilters, DocumentSummary, PaginationState, SortState, DocumentViewMode } from '../types/common';

export const useDocuments = () => {
  const [filters, setFilters] = useState<DocumentFilters>({});
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 20,
    total: 0,
  });
  const [sort, setSort] = useState<SortState>({
    field: 'upload_timestamp',
    direction: 'desc',
  });
  const [viewMode, setViewMode] = useState<DocumentViewMode>('grid');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const debouncedFilters = useDebounce(filters, 300);

  const query = useDocumentsQuery(debouncedFilters);
  const deleteMutation = useDeleteDocument();

  const documents = useMemo(() => {
    if (!query.data?.documents) return [];

    let filtered = [...query.data.documents];

    if (sort.field) {
      filtered.sort((a, b) => {
        const aValue = a[sort.field as keyof DocumentSummary];
        const bValue = b[sort.field as keyof DocumentSummary];

        if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [query.data?.documents, sort]);

  const updateFilter = (key: keyof DocumentFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({});
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const updateSort = (field: string) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(documents.map(doc => doc.document_id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const deleteSelected = async () => {
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(id)));
      clearSelection();
    } catch (error) {
      console.error('Failed to delete documents:', error);
    }
  };

  return {
    documents,
    filters,
    pagination,
    sort,
    viewMode,
    selectedIds: Array.from(selectedIds),
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    updateFilter,
    clearFilters,
    updateSort,
    setViewMode,
    toggleSelection,
    selectAll,
    clearSelection,
    deleteSelected,
    isDeleting: deleteMutation.isPending,
    refetch: query.refetch,
  };
};