import { DocumentTextIcon, XMarkIcon, CogIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { Badge, Button, ProgressBar, Spinner } from '../../ui/Index';
import { useUploadStore } from '../../../stores/useUploadStore';
import { formatFileSize, formatTimeAgo } from '../../../utils/formatting';
import { useNavigate } from 'react-router-dom';
import type { UploadFile } from '../../../types/common';

const FileRow = ({ file }: { file: UploadFile }) => {
  const { removeFile } = useUploadStore();
  const navigate = useNavigate();

  const getStatusDisplay = () => {
    switch (file.status) {
      case 'pending':
        return {
          badge: <Badge variant="gray">Pending</Badge>,
          icon: <DocumentTextIcon className="h-5 w-5 text-gray-400" />,
          text: 'Waiting to upload...',
          showProgress: false,
        };
      case 'uploading':
        return {
          badge: <Badge variant="info">Uploading</Badge>,
          icon: <Spinner size="sm" color="primary" />,
          text: `Uploading... ${file.progress}%`,
          showProgress: true,
        };
      case 'success':
        return {
          badge: <Badge variant="success">Ready to Process</Badge>,
          icon: <CheckCircleIcon className="h-5 w-5 text-green-500" />,
          text: 'Upload complete - Ready for processing',
          showProgress: false,
        };
      case 'processing':
      case 'ready':
        return {
          badge: <Badge variant="warning">Processing</Badge>,
          icon: <CogIcon className="h-5 w-5 text-yellow-500 animate-spin" />,
          text: 'Extracting financial data...',
          showProgress: false,
        };
      case 'completed':
        return {
          badge: <Badge variant="success">Completed</Badge>,
          icon: <CheckCircleIcon className="h-5 w-5 text-green-500" />,
          text: 'Data extraction completed',
          showProgress: false,
        };
      case 'error':
        return {
          badge: <Badge variant="error">Failed</Badge>,
          icon: <ExclamationCircleIcon className="h-5 w-5 text-red-500" />,
          text: file.error || 'Processing failed',
          showProgress: false,
        };
      default:
        return {
          badge: <Badge variant="gray">Unknown</Badge>,
          icon: <DocumentTextIcon className="h-5 w-5 text-gray-400" />,
          text: 'Unknown status',
          showProgress: false,
        };
    }
  };

  const statusDisplay = getStatusDisplay();
  const shouldShowViewResults = file.status === 'completed' && file.documentId;
  const shouldShowRetry = file.status === 'error';

  const handleViewResults = () => {
    if (file.documentId) {
      console.log('Navigating to document:', file.documentId);
      navigate(`/documents/${file.documentId}`);
    } else {
      console.error('No document ID available for file:', file.file.name);
    }
  };

  const handleRetry = () => {
    console.log('Retry clicked for file:', file.file.name);
  };

  return (
    <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg transition-all duration-200">
      {statusDisplay.icon}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900 truncate">
            {file.file.name}
          </p>
          {statusDisplay.badge}
        </div>
        
        <p className="text-xs text-gray-500">
          {formatFileSize(file.file.size)} • Added {formatTimeAgo(new Date().toISOString())}
        </p>
        
        {statusDisplay.showProgress && (
          <div className="mt-2">
            <ProgressBar value={file.progress} showLabel size="sm" />
          </div>
        )}
        
        <p className="text-xs text-gray-600 mt-1">{statusDisplay.text}</p>
        
        {file.documentId && (
          <p className="text-xs text-gray-500 font-mono mt-1">
            ID: {file.documentId.slice(0, 12)}...
          </p>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {shouldShowViewResults && (
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={handleViewResults}
            className="whitespace-nowrap"
          >
            View Results
          </Button>
        )}
        
        {shouldShowRetry && (
          <Button size="sm" variant="secondary" onClick={handleRetry}>
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
  );
};

export const UploadQueue = () => {
  const { files, clearCompleted } = useUploadStore();

  if (files.length === 0) {
    return null;
  }

  const completedFiles = files.filter(f => 
    f.status === 'success' || f.status === 'error' || f.status === 'completed'
  );
  const hasCompleted = completedFiles.length > 0;

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
          <FileRow key={file.id} file={file} />
        ))}
      </div>
    </div>
  );
};