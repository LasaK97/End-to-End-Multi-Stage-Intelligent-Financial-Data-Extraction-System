import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent, Button, Spinner } from '../components/ui/Index';
import { StatementViewer } from '../components/features/results/StatementViewer';
import { QualityScore } from '../components/features/results/QualityScore';
import { ExportMenu } from '../components/features/results/ExportMenu';
import { useExtractionResults } from '../hooks/useApi';
import { formatTimestamp, formatDuration } from '../utils/formatting';

export const DocumentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: result, isLoading, isError } = useExtractionResults(id!);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !result) {
    return (
      <div className="text-center py-12">
        <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Document not found</h3>
        <p className="mt-1 text-sm text-gray-500">
          The document you're looking for doesn't exist or has been deleted.
        </p>
        <Link to="/documents" className="mt-4 inline-block">
          <Button>Back to Documents</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link to="/documents">
            <Button variant="ghost" size="sm">
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{result.filename}</h1>
            <p className="text-sm text-gray-500">
              Processed {formatTimestamp(result.upload_timestamp)} • 
              {formatDuration(result.processing_time)}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <QualityScore statements={result.statements} />
          <ExportMenu result={result} />
        </div>
      </div>

      {result.errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Processing Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1">
              {result.errors.map((error, index) => (
                <li key={index} className="text-sm text-red-600">{error}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Document Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="text-sm text-gray-900">{result.status}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Statements</dt>
              <dd className="text-sm text-gray-900">{result.statements.length}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Processing Time</dt>
              <dd className="text-sm text-gray-900">{formatDuration(result.processing_time)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Upload Date</dt>
              <dd className="text-sm text-gray-900">{formatTimestamp(result.upload_timestamp)}</dd>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          <StatementViewer statements={result.statements} />
        </div>
      </div>
    </div>
  );
};