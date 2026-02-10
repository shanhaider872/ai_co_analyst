
export enum AppState {
  AUTH = 'AUTH',
  DASHBOARD = 'DASHBOARD',
  UPLOADED = 'UPLOADED',
  PROFILED = 'PROFILED',
  ISSUES_REVIEWED = 'ISSUES_REVIEWED',
  READY = 'READY',
  INSIGHTS_RUN = 'INSIGHTS_RUN',
  CHARTS = 'CHARTS',
  REPORT_GENERATED = 'REPORT_GENERATED'
}

export type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'radar' | 'scatter' | 'metric' | 'composed' | 'funnel';
export type ChartSize = 'small' | 'medium' | 'large';

export interface ChartConfig {
  id: string;
  title: string;
  type: ChartType;
  xAxis: string;
  yAxis: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'none';
  color?: string;
  secondaryYAxis?: string;
  size?: ChartSize;
  layout?: {
    w: number;
    h: number;
  };
}

export interface Column {
  id: string;
  name: string;
  detected_type: 'numeric' | 'categorical' | 'date' | 'text';
  missing_pct: number;
  unique_pct: number;
  sample_values: any[];
}

export interface DataIssue {
  id: string;
  column_id: string;
  column_name: string;
  issue_type: 'missing' | 'duplicate' | 'type_mismatch' | 'outlier';
  severity: 'High' | 'Medium' | 'Low';
  description: string;
  suggested_fix: string;
  applied: boolean;
}

export interface Insight {
  id: string;
  statement: string;
  type: 'trend' | 'correlation' | 'anomaly' | 'segment';
  rank_score: number;
  confidence_score: number;
  soft_suggestion?: string;
  explanation: string;
  pinned: boolean;
  dismissed: boolean;
}

export interface Dataset {
  id: string;
  userId: string;
  name: string;
  upload_date: string;
  row_count: number;
  column_count: number;
  health_score: number;
  columns: Column[];
  issues: DataIssue[];
  insights: Insight[];
  charts: ChartConfig[];
  summary?: string;
  intent?: string;
}

export interface UserLog {
  id: string;
  timestamp: string;
  action_type: string;
  details: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  password?: string;
  avatar?: string;
}
