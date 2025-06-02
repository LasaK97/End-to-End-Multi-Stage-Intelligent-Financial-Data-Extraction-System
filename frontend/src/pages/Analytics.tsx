import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Index';
import { TrendChart } from '../components/charts/TrendChart';
import { QualityDistribution } from '../components/charts/QualityDistribution';
import { ProcessingMetrics } from '../components/charts/ProcessingMetrics';
import { useStats } from '../hooks/useApi';

export const Analytics = () => {
  const { data: stats, isLoading } = useStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">
          System performance and extraction analytics
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="h-64 flex items-center justify-center">
                <div className="animate-pulse bg-gray-200 h-32 w-full rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Processing Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart data={stats} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quality Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <QualityDistribution data={stats} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <ProcessingMetrics data={stats} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Currency & Rounding</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Currency Distribution</h4>
                <div className="space-y-1">
                  {Object.entries(stats?.currency_distribution || {}).map(([currency, count]) => (
                    <div key={currency} className="flex justify-between text-sm">
                      <span>{currency}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Rounding Distribution</h4>
                <div className="space-y-1">
                  {Object.entries(stats?.rounding_distribution || {}).map(([rounding, count]) => (
                    <div key={rounding} className="flex justify-between text-sm">
                      <span className="capitalize">{rounding}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};