import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import { Card, CardContent, Spinner } from '../../ui/Index';
import { useStats } from '../../../hooks/useApi';
import { formatPercentage, formatDuration } from '../../../utils/formatting';

export const StatisticsCards = () => {
  const { data: stats, isLoading } = useStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6 flex items-center justify-center">
              <Spinner />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metrics = [
    {
      title: 'Total Documents',
      value: stats?.total_documents?.toLocaleString() || '0',
      change: '+12%',
      trend: 'up',
      subtitle: 'from last month',
    },
    {
      title: 'Success Rate',
      value: formatPercentage(stats?.avg_quality || 0),
      change: '+2.1%',
      trend: 'up',
      subtitle: 'from last month',
    },
    {
      title: 'Avg Processing Time',
      value: formatDuration(stats?.avg_processing_time || 0),
      change: '-0.8s',
      trend: 'down',
      subtitle: 'from last month',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {metrics.map((metric) => (
        <Card key={metric.title}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {metric.title}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {metric.value}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <div className={`flex items-center text-sm font-medium ${
                metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {metric.trend === 'up' ? (
                  <ArrowUpIcon className="h-4 w-4 mr-1" />
                ) : (
                  <ArrowDownIcon className="h-4 w-4 mr-1" />
                )}
                {metric.change}
              </div>
              <span className="text-sm text-gray-500 ml-2">
                {metric.subtitle}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};