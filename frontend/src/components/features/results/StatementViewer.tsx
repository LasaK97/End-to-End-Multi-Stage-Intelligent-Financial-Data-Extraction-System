import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { FinancialTable } from './FinancialTable';
import type { FinancialStatement } from '../../../types/api';

interface StatementViewerProps {
  statements: FinancialStatement[];
}

export const StatementViewer = ({ statements }: StatementViewerProps) => {
  if (statements.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-gray-500">No financial statements found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {statements.map((statement, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{statement.statement_type.replace('_', ' ').toUpperCase()}</span>
              <span className="text-sm font-normal text-gray-500">
                {statement.company_name} • {statement.currency} ({statement.rounding})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FinancialTable statement={statement} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};