
import React from 'react';
import { Column } from '../types';

interface DataTableProps {
  columns: Column[];
}

export const DataTable: React.FC<DataTableProps> = ({ columns }) => {
  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {columns.map(col => (
              <th key={col.id} className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                {col.name}
                <span className="block text-[10px] text-slate-400 font-normal">{col.detected_type}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {[0, 1, 2, 3, 4].map(rowIdx => (
            <tr key={rowIdx}>
              {columns.map(col => (
                <td key={col.id} className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {col.sample_values[rowIdx] || '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
