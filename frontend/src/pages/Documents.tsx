import { useState } from 'react';
import { 
  MagnifyingGlassIcon, 
  ViewColumnsIcon, 
  Squares2X2Icon,
  TrashIcon 
} from '@heroicons/react/24/outline';
import { Button, input, Badge } from '../components/ui/Index';
import { DocumentGrid } from '../components/features/documents/DocumentGrid';
import { DocumentList } from '../components/features/documents/DocumentList';
import { DocumentSearch } from '../components/features/documents/DocumentSearch';
import { useDocuments } from '../hooks/useDocuments';

export const Documents = () => {
  const {
    documents,
    viewMode,
    setViewMode,
    selectedIds,
    selectAll,
    clearSelection,
    deleteSelected,
    isDeleting,
    isLoading,
  } = useDocuments();

  const hasSelection = selectedIds.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and view your processed financial documents
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {hasSelection && (
            <div className="flex items-center space-x-2">
              <Badge variant="info">{selectedIds.length} selected</Badge>
              <Button
                variant="danger"
                size="sm"
                onClick={deleteSelected}
                loading={isDeleting}
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                Clear
              </Button>
            </div>
          )}

          <div className="flex border border-gray-300 rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none border-r"
            >
              <Squares2X2Icon className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <ViewColumnsIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <DocumentSearch />

      <div className="bg-white border border-gray-200 rounded-lg">
        {documents.length === 0 && !isLoading ? (
          <div className="text-center py-12">
            <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No documents found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search filters or upload some documents.
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <DocumentGrid documents={documents} />
        ) : (
          <DocumentList documents={documents} />
        )}
      </div>
    </div>
  );
};