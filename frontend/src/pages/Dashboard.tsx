import { Link } from 'react-router-dom';
import { CloudArrowUpIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent, Button } from '../components/ui/Index';
import { StatisticsCards } from '../components/features/dashboard/StatisticsCards';
import { HealthIndicator } from '../components/features/dashboard/HealthIndicator';
import { ActivityFeed } from '../components/features/dashboard/ActivityFeed';
import { UploadZone } from '../components/features/upload/UploadZone';
import { useUpload } from '../hooks/useUpload';

export const Dashboard = () => {
  const { handleFileAdd } = useUpload();

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
              <CardTitle>Upload Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <UploadZone onFilesAdded={handleFileAdd} />
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};