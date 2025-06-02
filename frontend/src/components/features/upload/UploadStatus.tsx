import { CheckCircleIcon, ExclamationCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { Badge } from '../../ui/Index';
import type { ProcessingStatus } from '../../../types/common';

interface UploadStatusProps {
  status: ProcessingStatus;
  progress?: number;
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const UploadStatus = ({ 
  status, 
  progress, 
  message, 
  size = 'md' 
}: UploadStatusProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'uploaded':
        return {
          icon: ClockIcon,
          text: 'Uploaded',
          variant: 'info' as const,
          color: 'text-blue-500',
        };
      case 'processing':
        return {
          icon: ClockIcon,
          text: 'Processing',
          variant: 'warning' as const,
          color: 'text-yellow-500',
        };
      case 'completed':
        return {
          icon: CheckCircleIcon,
          text: 'Completed',
          variant: 'success' as const,
          color: 'text-green-500',
        };
      case 'failed':
        return {
          icon: ExclamationCircleIcon,
          text: 'Failed',
          variant: 'error' as const,
          color: 'text-red-500',
        };
      default:
        return {
          icon: ClockIcon,
          text: 'Unknown',
          variant: 'gray' as const,
          color: 'text-gray-500',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <div className="flex items-center space-x-2">
      <Icon className={`${iconSizes[size]} ${config.color}`} />
      <Badge variant={config.variant} size={size === 'lg' ? 'md' : 'sm'}>
        {config.text}
        {status === 'processing' && progress !== undefined && ` ${progress}%`}
      </Badge>
      {message && (
        <span className={`${sizeClasses[size]} text-gray-600 truncate`}>
          {message}
        </span>
      )}
    </div>
  );
};