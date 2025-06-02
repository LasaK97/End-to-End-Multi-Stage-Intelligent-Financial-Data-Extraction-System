import { format, formatDistanceToNow } from 'date-fns';

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const formatTimestamp = (timestamp: string): string => {
  return format(new Date(timestamp), 'MMM dd, yyyy HH:mm');
};

export const formatTimeAgo = (timestamp: string): string => {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
};

export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  return `${minutes}m ${remainingSeconds}s`;
};

export const formatPercentage = (value: number, decimals = 1): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};

export const formatCurrency = (
  amount: number,
  currency: string = 'AUD',
  scale: string = 'units'
): string => {
  let displayAmount = amount;
  let suffix = '';

  switch (scale) {
    case 'thousands':
      suffix = 'K';
      break;
    case 'millions':
      suffix = 'M';
      break;
    case 'billions':
      suffix = 'B';
      break;
  }

  const formatter = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return `${formatter.format(displayAmount)}${suffix}`;
};

export const formatQualityScore = (score?: number): string => {
  if (score === undefined || score === null) return 'N/A';
  return formatPercentage(score, 0);
};