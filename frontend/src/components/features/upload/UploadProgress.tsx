import { CheckCircleIcon, ExclamationCircleIcon, ClockIcon, CogIcon } from '@heroicons/react/24/outline';
import { ProgressBar, Spinner } from '../../ui/Index';
import { formatFileSize } from '../../../utils/formatting';
import type { UploadFile } from '../../../types/common';

interface UploadProgressProps {
  file: UploadFile;
  showProcessingProgress?: boolean;
}

export const UploadProgress = ({ file, showProcessingProgress = false }: UploadProgressProps) => {
  const getStatusIcon = () => {
    switch (file.status) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'error':
        return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />;
      case 'uploading':
        return <Spinner size="sm" color="primary" />;
      case 'ready':
        return <CogIcon className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (file.status) {
      case 'pending':
        return 'Waiting to upload...';
      case 'uploading':
        return `Uploading... ${file.progress}%`;
      case 'success':
        return 'Upload complete - Ready for processing';
      case 'ready':
        return 'Processing data extraction...';
      case 'error':
        return file.error || 'Failed';
      default:
        return 'Unknown status';
    }
  };

  const getProgressColor = () => {
    switch (file.status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'ready':
        return 'warning';
      default:
        return 'primary';
    }
  };

  const getBorderColor = () => {
    switch (file.status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'uploading':
        return 'border-blue-200 bg-blue-50';
      case 'ready':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className={`p-3 border rounded-lg transition-all duration-200 ${getBorderColor()}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          {getStatusIcon()}
          <span className="text-sm font-medium text-gray-900 truncate">
            {file.file.name}
          </span>
        </div>
        <span className="text-xs text-gray-500 ml-2">
          {formatFileSize(file.file.size)}
        </span>
      </div>

      {(file.status === 'uploading' || file.status === 'pending') && (
        <ProgressBar
          value={file.progress}
          color={getProgressColor()}
          size="sm"
          className="mb-2"
        />
      )}

      {file.status === 'ready' && showProcessingProgress && (
        <div className="mb-2">
          <ProgressBar
            value={100}
            color="warning"
            size="sm"
            className="animate-pulse"
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600">{getStatusText()}</span>
        {file.status === 'success' && file.documentId && (
          <span className="text-xs text-green-600 font-mono">
            {file.documentId.slice(0, 8)}...
          </span>
        )}
        {file.status === 'ready' && (
          <span className="text-xs text-yellow-600 animate-pulse">
            Extracting...
          </span>
        )}
      </div>
    </div>
  );
};