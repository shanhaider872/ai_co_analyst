
import React from 'react';
import { AppState, User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentState: AppState;
  onReset: () => void;
  onStateChange: (state: AppState) => void;
  hasDataset: boolean;
  user: User | null;
  onLogout: () => void;
}

const STAGES = [
  { state: AppState.UPLOADED, label: 'Upload' },
  { state: AppState.PROFILED, label: 'Profile' },
  { state: AppState.ISSUES_REVIEWED, label: 'Cleaning' },
  { state: AppState.READY, label: 'Analysis' },
  { state: AppState.INSIGHTS_RUN, label: 'Insights' },
  { state: AppState.CHARTS, label: 'Charts' },
  { state: AppState.REPORT_GENERATED, label: 'Report' },
];

export const Layout: React.FC<LayoutProps> = ({ children, currentState, onReset, onStateChange, hasDataset, user, onLogout }) => {
  const currentIdx = STAGES.findIndex(s => s.state === currentState);
  const isAnalysisView = currentIdx !== -1;

  const handleStageClick = (targetState: AppState) => {
    if (targetState !== AppState.UPLOADED && !hasDataset) return;
    onStateChange(targetState);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div 
                className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center cursor-pointer"
                onClick={() => user ? onStateChange(AppState.DASHBOARD) : onStateChange(AppState.AUTH)}
              >
                <span className="text-white font-bold">A</span>
              </div>
              <h1 
                className="text-xl font-bold text-slate-900 cursor-pointer" 
                onClick={() => user ? onStateChange(AppState.DASHBOARD) : onStateChange(AppState.AUTH)}
              >
                Aida
              </h1>
            </div>

            {user && isAnalysisView && (
              <nav className="hidden lg:flex space-x-6">
                {STAGES.map((stage, idx) => {
                  const isAccessible = hasDataset || stage.state === AppState.UPLOADED;
                  const isActive = idx === currentIdx;
                  const isCompleted = idx < currentIdx;

                  return (
                    <button 
                      key={stage.state} 
                      disabled={!isAccessible}
                      onClick={() => handleStageClick(stage.state)}
                      className={`flex flex-col items-center group transition-all ${!isAccessible ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className={`text-[10px] font-bold mb-1 uppercase tracking-wider transition-colors ${isActive ? 'text-indigo-600' : isCompleted ? 'text-slate-600' : 'text-slate-400'}`}>
                        {stage.label}
                      </div>
                      <div className={`h-1 w-12 rounded-full transition-colors ${isActive ? 'bg-indigo-600' : isCompleted ? 'bg-slate-400' : 'bg-slate-200'} group-hover:${isAccessible ? 'bg-indigo-400' : ''}`} />
                    </button>
                  );
                })}
              </nav>
            )}

            <div className="flex items-center gap-4">
               {user ? (
                 <>
                   <div className="hidden sm:flex flex-col items-end">
                     <span className="text-xs font-bold text-slate-900">{user.email}</span>
                     <button onClick={onLogout} className="text-[10px] text-slate-400 hover:text-red-500 font-bold uppercase tracking-tighter transition-colors">Logout</button>
                   </div>
                   <button 
                    onClick={() => onStateChange(AppState.DASHBOARD)}
                    className="text-slate-500 hover:text-indigo-600 p-1 rounded-md hover:bg-slate-50 transition-colors"
                    title="Dashboard"
                   >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                   </button>
                 </>
               ) : (
                 <button 
                   onClick={() => onStateChange(AppState.AUTH)}
                   className="text-xs font-bold text-indigo-600 uppercase tracking-wider px-4 py-2 hover:bg-indigo-50 rounded-lg transition-all"
                 >
                   Login
                 </button>
               )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full print:p-0 print:m-0 print:max-w-none">
        {children}
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 no-print">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} Aida • Fully explainable, fully editable.
          </p>
        </div>
      </footer>
    </div>
  );
};
