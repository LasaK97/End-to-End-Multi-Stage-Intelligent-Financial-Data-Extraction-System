import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { Button } from '../../ui/Index';
import { validateFile } from '../../../utils/validation';
import { FILE_CONSTRAINTS } from '../../../utils/constants';
import toast from 'react-hot-toast';

interface UploadZoneProps {
  onFilesAdded: (files: File[]) => void;
  disabled?: boolean;
}

export const UploadZone = ({ onFilesAdded, disabled = false }: UploadZoneProps) => {
  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach((rejection) => {
        toast.error(`${rejection.file.name}: ${rejection.errors[0].message}`);
      });
    }

    const validFiles = acceptedFiles.filter((file) => {
      const validation = validateFile(file);
      if (!validation.isValid) {
        toast.error(`${file.name}: ${validation.error}`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      onFilesAdded(validFiles);
    }
  }, [onFilesAdded]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxSize: FILE_CONSTRAINTS.MAX_SIZE_MB * 1024 * 1024,
    disabled,
    noClick: true,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        relative border-2 border-dashed rounded-lg p-12 text-center transition-colors duration-200
        ${isDragActive 
          ? 'border-primary-400 bg-primary-50' 
          : 'border-gray-300 bg-gray-50'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400'}
      `}
    >
      <input {...getInputProps()} />
      
      <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
      
      <div className="mt-4">
        <p className="text-lg font-medium text-gray-900">
          {isDragActive ? 'Drop your PDF files here' : 'Drag & drop your PDF files here'}
        </p>
        <p className="mt-2 text-sm text-gray-500">or</p>
        
        <Button 
          onClick={open} 
          disabled={disabled}
          className="mt-4"
        >
          Browse Files
        </Button>
        
        <p className="mt-4 text-xs text-gray-500">
          Maximum file size: {FILE_CONSTRAINTS.MAX_SIZE_MB}MB • Supported: PDF only
        </p>
      </div>
    </div>
  );
};