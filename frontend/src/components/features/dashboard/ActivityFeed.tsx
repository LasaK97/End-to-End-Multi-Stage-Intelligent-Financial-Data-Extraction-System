import { Link } from 'react-router-dom';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '../../ui/Index';
import { useDocuments } from '../../../hooks/useApi';
import { formatTimeAgo, formatQualityScore } from '../../../utils/formatting';

export const ActivityFeed = () => {
  const { data: documentsData, isLoading } = useDocuments();

  const recentDocuments = documentsData?.documents?.slice(0, 5) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse flex space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : recentDocuments.length === 0 ? (
          <div className="text-center py-6">
            <DocumentTextIcon className="mx-auto h-8 w-8 text-gray-400" />
            <p className="text-sm text-gray-500 mt-2">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentDocuments.map((doc) => (
              <div key={doc.document_id} className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <DocumentTextIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {doc.filename}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge 
                      variant={
                        doc.status === 'completed' ? 'success' :
                        doc.status === 'failed' ? 'error' :
                        doc.status === 'processing' ? 'warning' : 'gray'
                      }
                      size="sm"
                    >
                      {doc.status}
                    </Badge>
                    {doc.extraction_quality && (
                      <span className="text-xs text-gray-500">
                        Quality: {formatQualityScore(doc.extraction_quality)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTimeAgo(doc.upload_timestamp)}
                  </p>
                </div>
                {doc.status === 'completed' && (
                  <Link to={`/documents/${doc.document_id}`}>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </Link>
                )}
              </div>
            ))}
            
            <div className="pt-4 border-t border-gray-200">
              <Link to="/documents">
                <Button variant="ghost" size="sm" className="w-full">
                  View All Documents
                </Button>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};