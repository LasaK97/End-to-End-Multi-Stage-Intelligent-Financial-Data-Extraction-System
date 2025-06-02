import { Link } from 'react-router-dom';
import { 
  DocumentTextIcon, 
  PlayIcon, 
  TrashIcon, 
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent, Button } from '../components/ui/Index';
import { UploadZone } from '../components/features/upload/UploadZone';
import { UploadQueue } from '../components/features/upload/UploadQueue';
import { useUpload } from '../hooks/useUpload';
import { useBatchProcess } from '../hooks/useBatchProcess';

export const Upload = () => {
  const { handleFileAdd, isUploading, getStats } = useUpload();
  const { 
    isProcessing, 
    isClearing,
    startProcessing, 
    clearUploadQueue,
    clearExtractionResults
  } = useBatchProcess();

  const stats = getStats();
  const hasProcessableFiles = stats.processable > 0;
  const hasFailedFiles = stats.failed > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Documents</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload PDF financial statements and extract data when ready
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Select Files</CardTitle>
          </CardHeader>
          <CardContent>
            <UploadZone 
              onFilesAdded={handleFileAdd} 
              disabled={isUploading || isProcessing} 
            />
            
            {(isUploading || isProcessing) && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-700">
                  {isUploading ? 'Uploading files...' : 'Processing documents...'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <UploadQueue />
          
          {stats.total > 0 && (
            <Card>
              <CardContent className="py-6">
                <div className="text-center space-y-4">
                  <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                  
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Processing Control
                    </h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Total files: {stats.total}</p>
                      <p>Ready to process: <span className="font-medium text-green-600">{stats.processable}</span></p>
                      {hasFailedFiles && (
                        <p className="flex items-center justify-center text-red-600">
                          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                          Failed uploads: {stats.failed}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button
                      onClick={startProcessing}
                      disabled={!hasProcessableFiles || isProcessing || isClearing}
                      loading={isProcessing}
                      className="w-full"
                      size="lg"
                    >
                      <PlayIcon className="h-5 w-5 mr-2" />
                      {isProcessing 
                        ? 'Extracting Data...' 
                        : `Extract Data (${stats.processable} files)`
                      }
                    </Button>

                    <div className="flex space-x-2">
                      <Button
                        variant="secondary"
                        onClick={clearUploadQueue}
                        disabled={isProcessing || isClearing || stats.total === 0}
                        loading={isClearing}
                        size="sm"
                        className="flex-1"
                      >
                        <TrashIcon className="h-4 w-4 mr-1" />
                        Clear Queue
                      </Button>

                      <Button
                        variant="secondary"
                        onClick={clearExtractionResults}
                        disabled={isProcessing || isClearing}
                        loading={isClearing}
                        size="sm"
                        className="flex-1"
                      >
                        <TrashIcon className="h-4 w-4 mr-1" />
                        Clear Results
                      </Button>
                    </div>

                    <Link to="/documents" className="block">
                      <Button variant="ghost" size="sm" className="w-full">
                        View All Documents
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};