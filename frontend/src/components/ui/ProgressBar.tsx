import { HTMLAttributes } from 'react';
import clsx from 'clsx';

interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
}

export const ProgressBar = ({
  value,
  max = 100,
  size = 'md',
  color = 'primary',
  showLabel = false,
  className,
  ...props
}: ProgressBarProps) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const colorClasses = {
    primary: 'bg-primary-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  return (
    <div className={clsx('w-full', className)} {...props}>
      <div className={clsx('flex items-center', showLabel && 'mb-1')}>
        {showLabel && (
          <span className="text-sm font-medium text-gray-700 ml-auto">
            {Math.round(percentage)}%
          </span>
        )}
      </div>
      <div className={clsx('w-full bg-gray-200 rounded-full', sizeClasses[size])}>
        <div
          className={clsx('rounded-full transition-all duration-300', colorClasses[color], sizeClasses[size])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};