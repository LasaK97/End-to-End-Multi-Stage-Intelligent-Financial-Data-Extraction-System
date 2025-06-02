import { Link } from 'react-router-dom';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { Card, CardContent, Badge } from '../../ui/Index';
import { DocumentActions } from './DocumentActions';
import { useDocuments } from '../../../hooks/useDocuments';
import { formatTimestamp, formatQualityScore } from '../../../utils/formatting';
import type { DocumentSummary } from '../../../types/api';

interface DocumentCardProps {
  document: DocumentSummary;
}

export const DocumentCard = ({ document }: DocumentCardProps) => {
  const { selectedIds, toggleSelection } = useDocuments();
  const isSelected = selectedIds.includes(document.document_id);

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${isSelected ? 'ring-2 ring-primary-500' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <input
            type="checkbox"
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            checked={isSelected}
            onChange={() => toggleSelection(document.document_id)}
          />
          <DocumentActions document={document} />
        </div>

        <div className="flex items-center space-x-3 mb-3">
          <DocumentTextIcon className="h-8 w-8 text-gray-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <Link
              to={`/documents/${document.document_id}`}
              className="text-sm font-medium text-gray-900 hover:text-primary-600 truncate block"
            >
              {document.filename}
            </Link>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Status</span>
            <Badge
              variant={
                document.status === 'completed' ? 'success' :
                document.status === 'failed' ? 'error' :
                document.status === 'processing' ? 'warning' : 'gray'
              }
              size="sm"
            >
              {document.status}
            </Badge>
          </div>

          {document.extraction_quality && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Quality</span>
              <Badge
                variant={
                  document.extraction_quality > 0.8 ? 'success' :
                  document.extraction_quality > 0.5 ? 'warning' : 'error'
                }
                size="sm"
              >
                {formatQualityScore(document.extraction_quality)}
              </Badge>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Statements</span>
            <span className="text-xs font-medium text-gray-900">
              {document.statement_count}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Uploaded</span>
            <span className="text-xs text-gray-900">
              {formatTimestamp(document.upload_timestamp)}
            </span>
          </div>

          {document.currencies.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Currency</span>
              <div className="flex space-x-1">
                {document.currencies.map((currency) => (
                  <Badge key={currency} variant="gray" size="sm">
                    {currency}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};