interface QualityDistributionProps {
  data: any;
}

export const QualityDistribution = ({ data }: QualityDistributionProps) => {
  return (
    <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
      <p className="text-gray-500">Quality distribution chart</p>
    </div>
  );
};