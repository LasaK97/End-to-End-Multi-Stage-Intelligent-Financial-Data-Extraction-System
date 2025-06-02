import { DocumentTextIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Badge, Button, ProgressBar } from '../../ui/Index';
import { useUploadStore } from '../../../stores/useUploadStore';
import { useUpload } from '../../../hooks/useUpload';
import { formatFileSize, formatTimeAgo } from '../../../utils/formatting';

export const UploadQueue = () => {
  const { files, removeFile, clearCompleted } = useUploadStore();
  const { retryUpload } = useUpload();

  if (files.length === 0) {
    return null;
  }

  const completedFiles = files.filter(f => f.status === 'success' || f.status === 'error');
  const hasCompleted = completedFiles.length > 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="gray">Pending</Badge>;
      case 'uploading':
        return <Badge variant="info">Uploading</Badge>;
      case 'success':
        return <Badge variant="success">Ready</Badge>;
      case 'error':
        return <Badge variant="error">Failed</Badge>;
      default:
        return <Badge variant="gray">Unknown</Badge>;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'uploading':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Upload Queue</h3>
        {hasCompleted && (
          <Button variant="ghost" size="sm" onClick={clearCompleted}>
            Clear Completed
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {files.map((file) => (
          <div 
            key={file.id} 
            className={`flex items-center space-x-4 p-3 rounded-lg border ${getStatusColor(file.status)}`}
          >
            <DocumentTextIcon className="h-8 w-8 text-gray-400 flex-shrink-0" />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.file.name}
                </p>
                {getStatusBadge(file.status)}
              </div>
              
              <p className="text-xs text-gray-500">
                {formatFileSize(file.file.size)} • Added {formatTimeAgo(new Date().toISOString())}
              </p>
              
              {file.status === 'uploading' && (
                <div className="mt-2">
                  <ProgressBar value={file.progress} showLabel size="sm" color="primary" />
                </div>
              )}
              
              {file.error && (
                <p className="text-xs text-red-600 mt-1">{file.error}</p>
              )}

              {file.status === 'success' && file.documentId && (
                <p className="text-xs text-green-600 mt-1">
                  Document ID: {file.documentId.slice(0, 8)}...
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {file.status === 'error' && (
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={() => retryUpload(file.id)}
                >
                  <ArrowPathIcon className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              )}
              
              <button
                onClick={() => removeFile(file.id)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="Remove file"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {files.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Total files: {files.length}</span>
            <span>
              Ready: {files.filter(f => f.status === 'success').length} | 
              Failed: {files.filter(f => f.status === 'error').length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};