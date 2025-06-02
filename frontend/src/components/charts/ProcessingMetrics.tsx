interface ProcessingMetricsProps {
  data: any;
}

export const ProcessingMetrics = ({ data }: ProcessingMetricsProps) => {
  return (
    <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
      <p className="text-gray-500">Processing metrics chart</p>
    </div>
  );
};