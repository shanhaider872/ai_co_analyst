
import React from 'react';
import { DataIssue } from '../types';

interface IssueListProps {
  issues: DataIssue[];
  onToggleIssue: (id: string) => void;
  onFixIssue: (id: string) => void;
}

export const IssueList: React.FC<IssueListProps> = ({ issues, onToggleIssue, onFixIssue }) => {
  const getSeverityColor = (sev: string) => {
    switch(sev.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="space-y-4">
      {issues.map(issue => (
        <div 
          key={issue.id} 
          className={`flex items-start p-5 rounded-2xl border transition-all ${issue.applied ? 'bg-emerald-50 border-emerald-200 shadow-inner' : 'bg-white border-slate-200 shadow-sm'}`}
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getSeverityColor(issue.severity)}`}>
                {issue.severity}
              </span>
              <span className="text-sm font-black text-slate-900">{issue.column_name}: {issue.issue_type.replace('_', ' ')}</span>
              {issue.applied && (
                <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-100 px-2 py-0.5 rounded-full">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                  Fixed
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 mb-3">{issue.description}</p>
            <div className="flex items-center justify-between gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
              <div className="text-xs text-slate-500">
                <span className="font-bold text-slate-700 uppercase tracking-tight not-italic mr-2">Suggested Fix:</span> {issue.suggested_fix}
              </div>
              {!issue.applied && (
                <button 
                  onClick={() => onFixIssue(issue.id)}
                  className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all shadow-md active:scale-95 whitespace-nowrap"
                >
                  Fix Now
                </button>
              )}
            </div>
          </div>
          <div className="ml-6 flex flex-col items-center gap-2 pt-1">
            <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">Applied</span>
            <button 
              onClick={() => onToggleIssue(issue.id)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${issue.applied ? 'bg-indigo-600' : 'bg-slate-200'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${issue.applied ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
