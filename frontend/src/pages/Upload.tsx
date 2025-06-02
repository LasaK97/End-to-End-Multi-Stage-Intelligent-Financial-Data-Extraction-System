import { Link } from 'react-router-dom';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { UploadZone } from '../components/features/upload/UploadZone';
import { UploadQueue } from '../components/features/upload/UploadQueue';
import { useUpload } from '../hooks/useUpload';

export const Upload = () => {
  const { handleFileAdd, files, isUploading } = useUpload();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Documents</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload PDF financial statements for automated data extraction
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Select Files</CardTitle>
          </CardHeader>
          <CardContent>
            <UploadZone onFilesAdded={handleFileAdd} disabled={isUploading} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <UploadQueue />
          
          {files.length > 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Processing Your Documents
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Your files are being processed. You can continue uploading or view results as they complete.
                </p>
                <Link to="/documents">
                  <Button>View All Documents</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};