import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Upload', href: '/upload', icon: CloudArrowUpIcon },
  { name: 'Documents', href: '/documents', icon: DocumentTextIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
];

interface NavigationProps {
  mobile?: boolean;
  onItemClick?: () => void;
}

export const Navigation = ({ mobile = false, onItemClick }: NavigationProps) => {
  const location = useLocation();

  const baseClasses = mobile
    ? 'block px-3 py-2 text-base font-medium'
    : 'flex items-center px-3 py-2 text-sm font-medium';

  return (
    <nav className={mobile ? 'space-y-1' : 'space-y-2'}>
      {navigation.map((item) => {
        const isActive = location.pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.name}
            to={item.href}
            onClick={onItemClick}
            className={`${baseClasses} rounded-md transition-colors duration-200 ${
              isActive
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Icon className={`flex-shrink-0 ${mobile ? 'mr-3 h-6 w-6' : 'mr-2 h-5 w-5'}`} />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
};