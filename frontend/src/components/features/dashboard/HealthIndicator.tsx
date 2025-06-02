import { CheckCircleIcon, ExclamationTriangleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '../../ui/Index';
import { useHealth } from '../../../hooks/useApi';
import { useUpload } from '../../../hooks/useUpload';
import { useBatchProcess } from '../../../hooks/useBatchProcess';
import { formatTimestamp } from '../../../utils/formatting';

export const HealthIndicator = () => {
  const { data: health, isLoading, isError } = useHealth();
  const { getStats } = useUpload();
  const { isProcessing } = useBatchProcess();
  
  const uploadStats = getStats();
  const isHealthy = health?.status === 'healthy';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {isHealthy ? (
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
          ) : (
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
          )}
          <span>System Health</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ) : isError || !health ? (
          <div className="text-center py-4">
            <Badge variant="error">System Unavailable</Badge>
            <p className="text-sm text-gray-500 mt-2">
              Unable to connect to the system
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Overall Status</span>
              <Badge variant={isHealthy ? 'success' : 'error'}>
                {health.status}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Models Loaded</span>
              <Badge variant={health.models_loaded ? 'success' : 'warning'}>
                {health.models_loaded ? 'Ready' : 'Loading'}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Pipeline</span>
              <Badge variant={health.pipeline_ready ? 'success' : 'warning'}>
                {health.pipeline_ready ? 'Ready' : 'Not Ready'}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Database</span>
              <Badge variant={health.database.status === 'healthy' ? 'success' : 'error'}>
                {health.database.status}
              </Badge>
            </div>
            
            <div className="pt-2 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Processing</span>
                <div className="flex items-center space-x-1">
                  {isProcessing && (
                    <ClockIcon className="h-3 w-3 text-yellow-500" />
                  )}
                  <Badge variant={isProcessing ? 'warning' : 'gray'}>
                    {isProcessing ? 'Active' : 'Idle'}
                  </Badge>
                </div>
              </div>
            </div>
            
            {uploadStats.total > 0 && (
              <div className="bg-gray-50 p-3 rounded-md">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Upload Queue</h4>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Total files:</span>
                    <span className="font-medium">{uploadStats.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ready to process:</span>
                    <span className="font-medium text-green-600">{uploadStats.processable}</span>
                  </div>
                  {uploadStats.failed > 0 && (
                    <div className="flex justify-between">
                      <span>Failed uploads:</span>
                      <span className="font-medium text-red-600">{uploadStats.failed}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Last checked: {formatTimestamp(health.timestamp)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};