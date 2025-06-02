import { useState } from 'react';
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Input, Button, Badge } from '../../ui/Index';
import { useDocuments } from '../../../hooks/useDocuments';

export const DocumentSearch = () => {
  const { filters, updateFilter, clearFilters } = useDocuments();
  const [showFilters, setShowFilters] = useState(false);

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search documents..."
            value={filters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10"
          />
        </div>

        <Button
          variant="secondary"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center space-x-2"
        >
          <FunnelIcon className="h-4 w-4" />
          <span>Filters</span>
          {activeFiltersCount > 0 && (
            <Badge variant="primary" size="sm">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>

        {activeFiltersCount > 0 && (
          <Button variant="ghost" onClick={clearFilters}>
            <XMarkIcon className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company
            </label>
            <Input
              placeholder="Company name"
              value={filters.company || ''}
              onChange={(e) => updateFilter('company', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              value={filters.currency || ''}
              onChange={(e) => updateFilter('currency', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All currencies</option>
              <option value="AUD">AUD</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
              <option value="EUR">EUR</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rounding
            </label>
            <select
              value={filters.rounding || ''}
              onChange={(e) => updateFilter('rounding', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All scales</option>
              <option value="units">Units</option>
              <option value="thousands">Thousands</option>
              <option value="millions">Millions</option>
              <option value="billions">Billions</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Quality
            </label>
            <select
              value={filters.qualityMin || ''}
              onChange={(e) => updateFilter('qualityMin', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Any quality</option>
              <option value="0.8">High (80%+)</option>
              <option value="0.5">Medium (50%+)</option>
              <option value="0.2">Low (20%+)</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};