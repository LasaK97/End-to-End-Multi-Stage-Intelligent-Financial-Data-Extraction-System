import { Link } from 'react-router-dom';
import { CloudArrowUpIcon, DocumentTextIcon, PlayIcon } from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent, Button } from '../components/ui/Index';
import { StatisticsCards } from '../components/features/dashboard/StatisticsCards';
import { HealthIndicator } from '../components/features/dashboard/HealthIndicator';
import { ActivityFeed } from '../components/features/dashboard/ActivityFeed';
import { UploadZone } from '../components/features/upload/UploadZone';
import { useUpload } from '../hooks/useUpload';
import { useBatchProcess } from '../hooks/useBatchProcess';

export const Dashboard = () => {
  const { handleFileAdd, isUploading, getStats } = useUpload();
  const { isProcessing, startProcessing } = useBatchProcess();
  
  const stats = getStats();
  const hasProcessableFiles = stats.processable > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor your document processing and system status
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Upload</CardTitle>
            </CardHeader>
            <CardContent>
              <UploadZone 
                onFilesAdded={handleFileAdd} 
                disabled={isUploading || isProcessing}
              />
              
              {stats.total > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      <p>Files in queue: <span className="font-medium">{stats.total}</span></p>
                      <p>Ready to process: <span className="font-medium text-green-600">{stats.processable}</span></p>
                    </div>
                    
                    {hasProcessableFiles && (
                      <Button
                        onClick={startProcessing}
                        disabled={isProcessing}
                        loading={isProcessing}
                        size="sm"
                      >
                        <PlayIcon className="h-4 w-4 mr-1" />
                        Extract Data
                      </Button>
                    )}
                  </div>
                </div>
              )}
              
              {isUploading && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-700">Uploading files...</p>
                </div>
              )}
              
              {isProcessing && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-700">Processing documents...</p>
                </div>
              )}
            </CardContent>
          </Card>

          <StatisticsCards />
        </div>

        <div className="space-y-6">
          <HealthIndicator />
          <ActivityFeed />
          
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/upload" className="block">
                <Button className="w-full justify-start" variant="secondary">
                  <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                  Upload More Files
                </Button>
              </Link>
              <Link to="/documents" className="block">
                <Button className="w-full justify-start" variant="secondary">
                  <DocumentTextIcon className="h-4 w-4 mr-2" />
                  View All Documents
                </Button>
              </Link>
              
              {hasProcessableFiles && (
                <Button
                  onClick={startProcessing}
                  disabled={isProcessing}
                  loading={isProcessing}
                  className="w-full justify-start"
                >
                  <PlayIcon className="h-4 w-4 mr-2" />
                  Process Queue ({stats.processable})
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};