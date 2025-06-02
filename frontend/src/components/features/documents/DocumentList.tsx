import { Link } from 'react-router-dom';
import { Badge } from '../../ui/Badge';
import { DocumentActions } from './DocumentActions';
import { useDocuments } from '../../../hooks/useDocuments';
import { formatTimestamp, formatQualityScore } from '../../../utils/formatting';
import type { DocumentSummary } from '../../../types/api';

interface DocumentListProps {
  documents: DocumentSummary[];
}

export const DocumentList = ({ documents }: DocumentListProps) => {
  const { selectedIds, toggleSelection } = useDocuments();

  return (
    <div className="overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                onChange={(e) => {
                  if (e.target.checked) {
                    documents.forEach(doc => {
                      if (!selectedIds.includes(doc.document_id)) {
                        toggleSelection(doc.document_id);
                      }
                    });
                  } else {
                    documents.forEach(doc => {
                      if (selectedIds.includes(doc.document_id)) {
                        toggleSelection(doc.document_id);
                      }
                    });
                  }
                }}
              />
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Document
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Quality
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Statements
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Uploaded
            </th>
            <th className="relative px-6 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {documents.map((document) => (
            <tr key={document.document_id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  checked={selectedIds.includes(document.document_id)}
                  onChange={() => toggleSelection(document.document_id)}
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Link
                  to={`/documents/${document.document_id}`}
                  className="text-sm font-medium text-primary-600 hover:text-primary-500"
                >
                  {document.filename}
                </Link>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
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
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {document.extraction_quality ? (
                  <Badge
                    variant={
                      document.extraction_quality > 0.8 ? 'success' :
                      document.extraction_quality > 0.5 ? 'warning' : 'error'
                    }
                    size="sm"
                  >
                    {formatQualityScore(document.extraction_quality)}
                  </Badge>
                ) : (
                  <span className="text-gray-400">N/A</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {document.statement_count}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatTimestamp(document.upload_timestamp)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <DocumentActions document={document} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};