import { Link } from 'react-router-dom';
import { 
  DocumentTextIcon, 
  PlayIcon, 
  TrashIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent, Button, ProgressBar } from '../components/ui/Index';
import { UploadZone } from '../components/features/upload/UploadZone';
import { UploadQueue } from '../components/features/upload/UploadQueue';
import { useUpload } from '../hooks/useUpload';
import { useBatchProcess } from '../hooks/useBatchProcess';
import { useUploadStore } from '../stores/useUploadStore';

export const Upload = () => {
  const { handleFileAdd, isUploading, getStats } = useUpload();
  const { 
    isProcessing, 
    isClearing,
    startProcessing, 
    clearUploadQueue,
    clearExtractionResults,
    getQueueStats
  } = useBatchProcess();
  
  const { getProcessingStats } = useUploadStore();

  const stats = getStats();
  const processingStats = getProcessingStats();
  const queueStats = getQueueStats();
  
  const hasProcessableFiles = stats.processable > 0;
  const hasFailedFiles = stats.failed > 0;

  const handleStartProcessing = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await startProcessing();
      console.log('Processing started successfully');
    } catch (error) {
      console.error('Failed to start processing:', error);
    }
  };

  console.log('Upload Page State:', {
    totalFiles: stats.total,
    processableFiles: stats.processable,
    isProcessing,
    processingStats,
    queueStats
  });

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
            
            {(isUploading || isProcessing || processingStats.isProcessing) && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-blue-700">
                    {isUploading ? 'Uploading files...' : 'Processing documents...'}
                  </p>
                  {(isProcessing || processingStats.isProcessing) && (
                    <span className="text-xs text-blue-600">
                      {processingStats.completed}/{processingStats.processing + processingStats.completed} completed
                    </span>
                  )}
                </div>
                {(isProcessing || processingStats.isProcessing) && (
                  <ProgressBar 
                    value={processingStats.progressPercentage} 
                    color="primary" 
                    size="sm" 
                    showLabel 
                  />
                )}
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
                  {(isProcessing || processingStats.isProcessing) ? (
                    <div className="animate-pulse">
                      <DocumentTextIcon className="mx-auto h-12 w-12 text-blue-500" />
                    </div>
                  ) : processingStats.completed > 0 && !processingStats.isProcessing ? (
                    <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
                  ) : (
                    <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                  )}
                  
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {(isProcessing || processingStats.isProcessing) ? 'Processing in Progress' : 'Processing Control'}
                    </h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Total files: {stats.total}</p>
                      <p>Ready to process: <span className="font-medium text-green-600">{stats.processable}</span></p>
                      {(isProcessing || processingStats.isProcessing) && (
                        <>
                          <p className="text-blue-600 font-medium">
                            Processing: {queueStats.processing} • Completed: {queueStats.completed}
                          </p>
                          <p className="text-blue-500 text-xs">
                            Progress: {processingStats.progressPercentage}%
                          </p>
                        </>
                      )}
                      {hasFailedFiles && (
                        <p className="flex items-center justify-center text-red-600">
                          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                          Failed: {stats.failed}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* CRITICAL: Proper button event handling */}
                    <button
                      type="button"
                      onClick={handleStartProcessing}
                      disabled={!hasProcessableFiles || isProcessing || processingStats.isProcessing}
                      className={`w-full inline-flex items-center justify-center px-6 py-3 text-base font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                        !hasProcessableFiles || isProcessing || processingStats.isProcessing
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-primary-500 hover:bg-primary-600 text-white'
                      }`}
                    >
                      <PlayIcon className="h-5 w-5 mr-2" />
                      {(isProcessing || processingStats.isProcessing)
                        ? `Extracting Data... (${processingStats.progressPercentage}%)`
                        : `Extract Data (${stats.processable} files)`
                      }
                    </button>

                    <div className="flex space-x-2">
                      <Button
                        variant="secondary"
                        onClick={clearUploadQueue}
                        disabled={isProcessing || processingStats.isProcessing || isClearing || stats.total === 0}
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
                        disabled={isProcessing || processingStats.isProcessing || isClearing}
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