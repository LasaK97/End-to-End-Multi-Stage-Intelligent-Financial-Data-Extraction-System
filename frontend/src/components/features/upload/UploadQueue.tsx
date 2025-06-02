import { DocumentTextIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Badge, Button, ProgressBar } from '../../ui/Index';
import { useUploadStore } from '../../../stores/useUploadStore';
import { formatFileSize, formatTimeAgo } from '../../../utils/formatting';

export const UploadQueue = () => {
  const { files, removeFile, clearCompleted } = useUploadStore();

  if (files.length === 0) {
    return null;
  }

  const completedFiles = files.filter(f => f.status === 'success' || f.status === 'error');
  const hasCompleted = completedFiles.length > 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'uploading':
        return <Badge variant="info">Uploading</Badge>;
      case 'success':
        return <Badge variant="success">Completed</Badge>;
      case 'error':
        return <Badge variant="error">Failed</Badge>;
      default:
        return <Badge variant="gray">Pending</Badge>;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Processing Queue</h3>
        {hasCompleted && (
          <Button variant="ghost" size="sm" onClick={clearCompleted}>
            Clear Completed
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {files.map((file) => (
          <div key={file.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
            <DocumentTextIcon className="h-8 w-8 text-gray-400 flex-shrink-0" />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
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
                  <ProgressBar value={file.progress} showLabel size="sm" />
                </div>
              )}
              
              {file.error && (
                <p className="text-xs text-red-600 mt-1">{file.error}</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {file.status === 'success' && file.documentId && (
                <Button size="sm" variant="secondary">
                  View Results
                </Button>
              )}
              
              {file.status === 'error' && (
                <Button size="sm" variant="secondary">
                  Retry
                </Button>
              )}
              
              <button
                onClick={() => removeFile(file.id)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};