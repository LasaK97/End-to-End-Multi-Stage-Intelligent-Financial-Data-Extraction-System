import { CheckCircleIcon, ExclamationCircleIcon, ClockIcon, CogIcon } from '@heroicons/react/24/outline';
import { Badge, Spinner } from '../../ui/Index';
import type { ProcessingStatus } from '../../../types/common';

interface UploadStatusProps {
  status: ProcessingStatus;
  progress?: number;
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  processingTime?: number;
}

export const UploadStatus = ({ 
  status, 
  progress, 
  message, 
  size = 'md',
  showDetails = false,
  processingTime
}: UploadStatusProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'uploaded':
        return {
          icon: ClockIcon,
          text: 'Ready to Process',
          variant: 'info' as const,
          color: 'text-blue-500',
          bgColor: 'bg-blue-50',
        };
      case 'processing':
        return {
          icon: CogIcon,
          text: 'Processing',
          variant: 'warning' as const,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-50',
          animate: true,
        };
      case 'completed':
        return {
          icon: CheckCircleIcon,
          text: 'Completed',
          variant: 'success' as const,
          color: 'text-green-500',
          bgColor: 'bg-green-50',
        };
      case 'failed':
        return {
          icon: ExclamationCircleIcon,
          text: 'Failed',
          variant: 'error' as const,
          color: 'text-red-500',
          bgColor: 'bg-red-50',
        };
      default:
        return {
          icon: ClockIcon,
          text: 'Unknown',
          variant: 'gray' as const,
          color: 'text-gray-500',
          bgColor: 'bg-gray-50',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs p-2',
    md: 'text-sm p-3',
    lg: 'text-base p-4',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <div className={`flex items-center space-x-2 rounded-lg border ${config.bgColor} ${sizeClasses[size]}`}>
      {status === 'processing' ? (
        <Spinner size={size === 'lg' ? 'md' : 'sm'} color="primary" />
      ) : (
        <Icon className={`${iconSizes[size]} ${config.color} ${config.animate ? 'animate-spin' : ''}`} />
      )}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <Badge variant={config.variant} size={size === 'lg' ? 'md' : 'sm'}>
            {config.text}
            {status === 'processing' && progress !== undefined && ` ${progress}%`}
          </Badge>
          
          {processingTime && (
            <span className="text-xs text-gray-500">
              {processingTime}s
            </span>
          )}
        </div>
        
        {showDetails && message && (
          <p className="text-xs text-gray-600 mt-1 truncate">
            {message}
          </p>
        )}
      </div>
    </div>
  );
};