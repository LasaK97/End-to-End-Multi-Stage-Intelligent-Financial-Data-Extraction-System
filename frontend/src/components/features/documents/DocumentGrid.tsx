import { DocumentCard } from './DocumentCard';
import type { DocumentSummary } from '../../../types/api';

interface DocumentGridProps {
  documents: DocumentSummary[];
}

export const DocumentGrid = ({ documents }: DocumentGridProps) => {
  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {documents.map((document) => (
          <DocumentCard key={document.document_id} document={document} />
        ))}
      </div>
    </div>
  );
};