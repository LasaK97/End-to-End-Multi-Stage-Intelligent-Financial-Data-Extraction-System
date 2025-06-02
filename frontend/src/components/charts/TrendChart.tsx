interface TrendChartProps {
  data: any;
}

export const TrendChart = ({ data }: TrendChartProps) => {
  return (
    <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
      <p className="text-gray-500">Chart implementation with Chart.js</p>
    </div>
  );
};