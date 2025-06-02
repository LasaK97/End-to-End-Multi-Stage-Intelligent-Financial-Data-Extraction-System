import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { ProgressBar } from '../../ui/Index';
import { formatFileSize } from '../../../utils/formatting';
import type { UploadFile } from '../../../types/common';

interface UploadProgressProps {
  file: UploadFile;
}

export const UploadProgress = ({ file }: UploadProgressProps) => {
  const getStatusIcon = () => {
    switch (file.status) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'error':
        return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (file.status) {
      case 'pending':
        return 'Waiting...';
      case 'uploading':
        return `Uploading... ${file.progress}%`;
      case 'success':
        return 'Upload complete';
      case 'error':
        return file.error || 'Upload failed';
      default:
        return '';
    }
  };

  const getProgressColor = () => {
    switch (file.status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      default:
        return 'primary';
    }
  };

  return (
    <div className="p-3 border border-gray-200 rounded-lg">
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

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600">{getStatusText()}</span>
        {file.status === 'success' && file.documentId && (
          <span className="text-xs text-green-600">ID: {file.documentId.slice(0, 8)}...</span>
        )}
      </div>
    </div>
  );
};