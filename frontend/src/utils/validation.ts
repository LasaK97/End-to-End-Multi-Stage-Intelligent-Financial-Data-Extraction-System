import { FILE_CONSTRAINTS } from './constants';

export const validateFile = (file: File): { isValid: boolean; error?: string } => {
  if (!file.type.includes('pdf')) {
    return {
      isValid: false,
      error: 'Only PDF files are allowed',
    };
  }

  const maxSizeBytes = FILE_CONSTRAINTS.MAX_SIZE_MB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      error: `File size must be less than ${FILE_CONSTRAINTS.MAX_SIZE_MB}MB`,
    };
  }

  if (file.size === 0) {
    return {
      isValid: false,
      error: 'File cannot be empty',
    };
  }

  return { isValid: true };
};

export const validateDocumentFilters = (filters: Record<string, any>): boolean => {
  if (filters.qualityMin && (filters.qualityMin < 0 || filters.qualityMin > 1)) {
    return false;
  }

  if (filters.dateRange && filters.dateRange.length === 2) {
    const [start, end] = filters.dateRange;
    if (start > end) {
      return false;
    }
  }

  return true;
};

export const sanitizeString = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};