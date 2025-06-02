import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import { 
  EllipsisVerticalIcon, 
  EyeIcon, 
  ArrowDownTrayIcon, 
  TrashIcon 
} from '@heroicons/react/24/outline';
import { useDeleteDocument } from '../../../hooks/useApi';
import toast from 'react-hot-toast';
import type { DocumentSummary } from '../../../types/api';

interface DocumentActionsProps {
  document: DocumentSummary;
}

export const DocumentActions = ({ document }: DocumentActionsProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteMutation = useDeleteDocument();

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${document.filename}"?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync(document.document_id);
      toast.success('Document deleted successfully');
    } catch (error) {
      toast.error('Failed to delete document');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = () => {
    const exportUrl = `/api/results/${document.document_id}?include_raw=false`;
    window.open(exportUrl, '_blank');
  };

  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button className="flex items-center text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 rounded-full p-1">
        <EllipsisVerticalIcon className="h-5 w-5" />
      </Menu.Button>

      <Transition
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <Menu.Item>
            {({ active }) => (
              <Link
                to={`/documents/${document.document_id}`}
                className={`${
                  active ? 'bg-gray-100' : ''
                } flex items-center px-4 py-2 text-sm text-gray-700`}
              >
                <EyeIcon className="mr-3 h-4 w-4" />
                View Details
              </Link>
            )}
          </Menu.Item>

          {document.status === 'completed' && (
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={handleExport}
                  className={`${
                    active ? 'bg-gray-100' : ''
                  } flex w-full items-center px-4 py-2 text-sm text-gray-700`}
                >
                  <ArrowDownTrayIcon className="mr-3 h-4 w-4" />
                  Export Data
                </button>
              )}
            </Menu.Item>
          )}

          <Menu.Item>
            {({ active }) => (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={`${
                  active ? 'bg-gray-100' : ''
                } flex w-full items-center px-4 py-2 text-sm text-red-700 disabled:opacity-50`}
              >
                <TrashIcon className="mr-3 h-4 w-4" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </Menu.Item>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};