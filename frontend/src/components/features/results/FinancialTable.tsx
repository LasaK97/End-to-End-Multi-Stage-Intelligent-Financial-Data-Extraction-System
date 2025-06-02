import type { FinancialStatement } from '../../../types/api';
import { formatCurrency } from '../../../utils/formatting';

interface FinancialTableProps {
  statement: FinancialStatement;
}

export const FinancialTable = ({ statement }: FinancialTableProps) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Line Item
            </th>
            {statement.financial_years.map(year => (
              <th key={year} className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {year}
              </th>
            ))}
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Notes
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {statement.line_items.map((item, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {item.label}
              </td>
              {statement.financial_years.map(year => (
                <td key={year} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {formatCurrency(item.values[year] || 0, statement.currency, statement.rounding)}
                </td>
              ))}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                {item.note_references.join(', ') || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};