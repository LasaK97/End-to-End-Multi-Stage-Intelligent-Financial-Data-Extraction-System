import { Link, useLocation } from 'react-router-dom';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { useAppStore } from '../../stores/useAppStore';
import { Badge } from '../ui/Index';

const navigation = [
  { name: 'Dashboard', href: '/' },
  { name: 'Upload', href: '/upload' },
  { name: 'Documents', href: '/documents' },
  { name: 'Analytics', href: '/analytics' },
];

export const Header = () => {
  const location = useLocation();
  const { systemHealth, toggleSidebar } = useAppStore();

  const isHealthy = systemHealth?.status === 'healthy';

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <button
              onClick={toggleSidebar}
              className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            
            <div className="flex items-center ml-4 md:ml-0">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-primary-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">FE</span>
                </div>
              </div>
              <div className="ml-3">
                <h1 className="text-lg font-semibold text-gray-900">
                  Financial Document Extractor
                </h1>
              </div>
            </div>
          </div>

          <nav className="hidden md:flex space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                  location.pathname === item.href
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  isHealthy ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className={`text-sm font-medium ${
                isHealthy ? 'text-green-600' : 'text-red-600'
              }`}>
                {isHealthy ? 'System Healthy' : 'System Issues'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};