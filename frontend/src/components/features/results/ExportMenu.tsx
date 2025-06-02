import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { Button } from '../../ui/Button';
import type { ExtractionResult } from '../../../types/api';

interface ExportMenuProps {
  result: ExtractionResult;
}

export const ExportMenu = ({ result }: ExportMenuProps) => {
  const handleExport = (format: 'json' | 'csv') => {
    const data = format === 'json' ? JSON.stringify(result, null, 2) : convertToCSV(result);
    const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.filename.replace('.pdf', '')}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const convertToCSV = (result: ExtractionResult): string => {
    const headers = ['Statement Type', 'Company', 'Line Item', 'Year', 'Value', 'Currency', 'Rounding'];
    const rows = result.statements.flatMap(stmt =>
      stmt.line_items.flatMap(item =>
        Object.entries(item.values).map(([year, value]) => [
          stmt.statement_type,
          stmt.company_name,
          item.label,
          year,
          value,
          stmt.currency,
          stmt.rounding
        ])
      )
    );
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  return (
    <div className="flex space-x-2">
      <Button variant="secondary" onClick={() => handleExport('json')}>
        <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
        JSON
      </Button>
      <Button variant="secondary" onClick={() => handleExport('csv')}>
        <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
        CSV
      </Button>
    </div>
  );
};