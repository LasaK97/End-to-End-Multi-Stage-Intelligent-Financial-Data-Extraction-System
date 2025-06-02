import { Badge } from '../../ui/Badge';
import { formatQualityScore } from '../../../utils/formatting';
import type { FinancialStatement } from '../../../types/api';

interface QualityScoreProps {
  statements: FinancialStatement[];
}

export const QualityScore = ({ statements }: QualityScoreProps) => {
  const avgConfidence = statements.reduce((sum, stmt) => sum + stmt.extraction_confidence, 0) / statements.length;
  
  const variant = avgConfidence > 0.8 ? 'success' : avgConfidence > 0.5 ? 'warning' : 'error';
  
  return (
    <Badge variant={variant}>
      Quality: {formatQualityScore(avgConfidence)}
    </Badge>
  );
};