
import React, { useState, useEffect, useMemo } from 'react';
import { AppState, Dataset, Column, DataIssue, Insight, UserLog, User, ChartConfig, ChartType, ChartSize } from './types';
import { profileData, generateInsights } from './geminiService';
import { Layout } from './components/Layout';
import { DataTable } from './components/DataTable';
import { IssueList } from './components/IssueList';
import pptxgen from 'pptxgenjs';
import {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  getCurrentUser,
  signOut,
  onAuthStateChange,
  saveDataset,
  getUserDatasets,
  deleteDataset,
} from './supabaseService';
import { 
  BarChart, Bar, 
  LineChart, Line, 
  PieChart, Pie, Cell,
  AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter,
  ComposedChart,
  FunnelChart, Funnel,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ZAxis, LabelList
} from 'recharts';

// Constants
const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#0ea5e9', '#f43f5e'];

// Feature flag: show or hide the Google OAuth button in the UI
const SHOW_GOOGLE_BUTTON = true;

export default function App() {
  const [state, setState] = useState<AppState>(AppState.AUTH);
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<Dataset[]>([]);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [intent, setIntent] = useState<string>('');
  const [logs, setLogs] = useState<UserLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>(null);

  // Advanced Chart Builder State
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [chartX, setChartX] = useState<string>('');
  const [chartY, setChartY] = useState<string>('');
  const [chartYSecondary, setChartYSecondary] = useState<string>('');
  const [chartTitle, setChartTitle] = useState<string>('');
  const [chartAggregation, setChartAggregation] = useState<ChartConfig['aggregation']>('none');
  const [chartColor, setChartColor] = useState<string>(CHART_COLORS[0]);
  const [chartSize, setChartSize] = useState<ChartSize>('medium');

  // Auth & Data Persistence
  useEffect(() => {
    // Setup auth state listener
    const subscription = onAuthStateChange(async (user) => {
      setUser(user);
      if (user) {
        setState(AppState.DASHBOARD);
        loadUserHistory(user.id);
      } else {
        setState(AppState.AUTH);
        setHistory([]);
        setDataset(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const loadUserHistory = async (userId: string) => {
    const { datasets, error } = await getUserDatasets(userId);
    if (error) {
      console.error('Failed to load datasets:', error);
      return;
    }
    setHistory(datasets);
  };

  const saveToHistory = async (ds: Dataset) => {
    if (!user) return;
    const datasetWithUser = { ...ds, userId: user.id };
    const { error } = await saveDataset(datasetWithUser, user.id);
    if (error) {
      console.error('Failed to save dataset:', error);
      return;
    }
    loadUserHistory(user.id);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;

    try {
      if (authMode === 'signup') {
        const { user: newAuthUser, error } = await signUpWithEmail(email, password, name);
        if (error) {
          setAuthError(error);
          setAuthLoading(false);
          return;
        }
        // User created successfully. Supabase will send a confirmation email when email confirmation is enabled.
        // Show an informational message prompting the user to confirm their email before signing in.
        setAuthInfo('Account created. Please check your email to confirm your address before signing in.');
        setAuthError(null);
        setAuthMode('login');
        setAuthLoading(false);
      } else {
        const { user: authUser, session, error } = await signInWithEmail(email, password);
        if (error) {
          setAuthError(error);
          setAuthLoading(false);
          return;
        }
        // User logged in successfully, will be handled by onAuthStateChange
        setAuthLoading(false);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
      setAuthLoading(false);
    }
  };

  const login = (userData: User) => {
    setUser(userData);
    setState(AppState.DASHBOARD);
    loadUserHistory(userData.id);
  };

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setAuthError(error);
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    setAuthLoading(true);
    const { error } = await signOut();
    if (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
    setState(AppState.AUTH);
    setHistory([]);
    setDataset(null);
    setAuthLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setLoading(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        const allRows = text.trim().split('\n');
        const rowCount = Math.max(0, allRows.length - 1);
        const sampleRows = allRows.slice(0, 15).join('\n');
        const result = await profileData(sampleRows, file.name);
        const newDataset: Dataset = {
          id: Math.random().toString(36).substr(2, 9),
          userId: user.id,
          name: file.name,
          upload_date: new Date().toISOString(),
          row_count: rowCount,
          column_count: result.columns.length,
          health_score: 100 - (result.issues.length * 5),
          columns: result.columns,
          issues: result.issues.map((iss: any) => ({ ...iss, applied: false })),
          insights: [],
          charts: [],
          summary: result.summary,
          intent: ''
        };
        setDataset(newDataset);
        setState(AppState.PROFILED);
        addLog('FILE_UPLOADED', `Uploaded ${file.name}.`);
        setLoading(false);
      };
      reader.readAsText(file);
    } catch (err: any) {
      setError("Failed to profile dataset.");
      setLoading(false);
    }
  };

  const startAnalysis = async () => {
    if (!dataset || !user) return;
    setLoading(true);
    try {
      const insights = await generateInsights(dataset, intent);
      const autoPinnedInsights = insights.map((ins: any, idx: number) => ({
        ...ins,
        pinned: idx < 3,
        dismissed: false
      }));
      const updatedDataset = { ...dataset, insights: autoPinnedInsights, intent, userId: user.id };
      setDataset(updatedDataset);
      saveToHistory(updatedDataset);
      setState(AppState.INSIGHTS_RUN);
      addLog('ANALYSIS_STARTED', `Generated insights.`);
      setLoading(false);
    } catch (err) {
      setError("Failed to generate insights.");
      setLoading(false);
    }
  };

  const handleReset = () => {
    setDataset(null);
    setState(AppState.DASHBOARD);
    setIntent('');
    setError(null);
  };

  const addLog = (action: string, details: string) => {
    setLogs(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      action_type: action,
      details
    }, ...prev]);
  };

  const toggleIssue = (id: string) => {
    if (!dataset) return;
    const updatedIssues = dataset.issues.map(iss => 
      iss.id === id ? { ...iss, applied: !iss.applied } : iss
    );
    const updatedDataset = { ...dataset, issues: updatedIssues };
    setDataset(updatedDataset);
    if (user) saveToHistory(updatedDataset);
  };

  const handleFixIssue = (issueId: string) => {
    if (!dataset) return;
    const issue = dataset.issues.find(iss => iss.id === issueId);
    if (!issue || issue.applied) return;

    const updatedColumns = dataset.columns.map(col => {
      if (col.id === issue.column_id || col.name === issue.column_name) {
        const fixedSamples = col.sample_values.map(val => {
          if (val === '-' || val === null || val === undefined) {
            return col.detected_type === 'numeric' ? '0' : 'N/A';
          }
          return val;
        });
        return { ...col, sample_values: fixedSamples, missing_pct: Math.max(0, col.missing_pct - 10) };
      }
      return col;
    });

    const updatedIssues = dataset.issues.map(iss => 
      iss.id === issueId ? { ...iss, applied: true } : iss
    );

    const newHealth = Math.min(100, dataset.health_score + 5);

    const updatedDataset = { 
      ...dataset, 
      columns: updatedColumns, 
      issues: updatedIssues,
      health_score: newHealth 
    };
    
    setDataset(updatedDataset);
    if (user) saveToHistory(updatedDataset);
    addLog('ISSUE_FIXED', `Applied automated fix for ${issue.issue_type} in ${issue.column_name}.`);
  };

  const addChart = () => {
    if (!dataset || !chartX || !chartY || !chartTitle) return;
    const newChart: ChartConfig = {
      id: Math.random().toString(36).substr(2, 9),
      title: chartTitle,
      type: chartType,
      xAxis: chartX,
      yAxis: chartY,
      secondaryYAxis: chartYSecondary,
      aggregation: chartAggregation,
      color: chartColor,
      size: chartSize,
      layout: { w: chartType === 'metric' ? 1 : 2, h: 2 }
    };
    const updatedDataset = { ...dataset, charts: [...(dataset.charts || []), newChart] };
    setDataset(updatedDataset);
    if (user) saveToHistory(updatedDataset);
    setChartTitle('');
    setChartYSecondary('');
  };

  const updateChartSize = (chartId: string, size: ChartSize) => {
    if (!dataset) return;
    const updatedCharts = dataset.charts.map(c => c.id === chartId ? { ...c, size } : c);
    const updatedDataset = { ...dataset, charts: updatedCharts };
    setDataset(updatedDataset);
    if (user) saveToHistory(updatedDataset);
  };

  const removeChart = (id: string) => {
    if (!dataset) return;
    const updatedCharts = dataset.charts.filter(c => c.id !== id);
    const updatedDataset = { ...dataset, charts: updatedCharts };
    setDataset(updatedDataset);
    if (user) saveToHistory(updatedDataset);
  };

  const getChartData = (config: ChartConfig) => {
    if (!dataset) return [];
    const colX = dataset.columns.find(c => c.name === config.xAxis);
    const colY = dataset.columns.find(c => c.name === config.yAxis);
    const colY2 = config.secondaryYAxis ? dataset.columns.find(c => c.name === config.secondaryYAxis) : null;
    if (!colX || !colY) return [];

    let rawData = colX.sample_values.map((val, idx) => ({
      name: val,
      value: parseFloat(colY.sample_values[idx]) || 0,
      value2: colY2 ? (parseFloat(colY2.sample_values[idx]) || 0) : undefined,
      x: parseFloat(val) || 0,
      y: parseFloat(colY.sample_values[idx]) || 0
    }));

    if (config.aggregation && config.aggregation !== 'none') {
      const grouped: Record<string, number[]> = {};
      const grouped2: Record<string, number[]> = {};
      rawData.forEach(item => {
        if (!grouped[item.name]) {
          grouped[item.name] = [];
          grouped2[item.name] = [];
        }
        grouped[item.name].push(item.value);
        if (item.value2 !== undefined) grouped2[item.name].push(item.value2);
      });

      return Object.entries(grouped).map(([name, vals]) => {
        let aggregatedVal = 0;
        let aggregatedVal2 = 0;
        if (config.aggregation === 'sum') {
          aggregatedVal = vals.reduce((a, b) => a + b, 0);
          aggregatedVal2 = grouped2[name].reduce((a, b) => a + b, 0);
        } else if (config.aggregation === 'avg') {
          aggregatedVal = vals.reduce((a, b) => a + b, 0) / vals.length;
          aggregatedVal2 = grouped2[name].reduce((a, b) => a + b, 0) / (grouped2[name].length || 1);
        } else if (config.aggregation === 'count') {
          aggregatedVal = vals.length;
          aggregatedVal2 = grouped2[name].length;
        }
        return { name, value: aggregatedVal, value2: aggregatedVal2, x: parseFloat(name) || 0, y: aggregatedVal };
      }).slice(0, 10);
    }

    return rawData.slice(0, 10);
  };

  const handleExportPPT = () => {
    if (!dataset) return;
    const pres = new pptxgen();
    
    // 1. Title Slide - Better Spacing
    let slide = pres.addSlide();
    slide.background = { color: 'F8FAFC' };
    slide.addText("Executive Data Intelligence Report", { x: 1, y: 1.2, fontSize: 44, color: "1E293B", bold: true, w: '80%' });
    slide.addText(`Project: ${dataset.name}`, { x: 1, y: 3.2, fontSize: 24, color: "6366F1", bold: true, w: '80%' });
    slide.addText(`Data Volume: ${dataset.row_count.toLocaleString()} rows • ${dataset.column_count} columns`, { x: 1, y: 3.8, fontSize: 16, color: "64748B", w: '80%' });
    slide.addText(`Generated by Aida • ${new Date().toLocaleDateString()}`, { x: 1, y: 5.2, fontSize: 14, color: "94A3B8", w: '80%' });

    // 2. Data Profile Overview - Fixed Table Wrap
    slide = pres.addSlide();
    slide.addText("Data Quality Profile", { x: 0.5, y: 0.4, fontSize: 28, color: "1E293B", bold: true });
    slide.addText(`Overall Health Score: ${dataset.health_score}%`, { x: 0.5, y: 1.0, fontSize: 22, color: dataset.health_score > 80 ? "10B981" : "F59E0B", bold: true });
    
    const tableData = [
        [{ text: "Column Name", options: { bold: true, fill: "F1F5F9" } }, { text: "Type", options: { bold: true, fill: "F1F5F9" } }, { text: "Quality", options: { bold: true, fill: "F1F5F9" } }, { text: "Uniqueness", options: { bold: true, fill: "F1F5F9" } }],
        ...dataset.columns.slice(0, 10).map(col => [
            col.name,
            col.detected_type,
            `${100 - col.missing_pct}%`,
            `${col.unique_pct}%`
        ])
    ];
    slide.addTable(tableData, { x: 0.5, y: 1.8, w: 9, rowH: 0.35, fontSize: 11, border: { type: 'solid', pt: 1, color: 'E2E8F0' } });

    // 3. Strategic Insights - Fixed Overlapping Text
    const reportIns = dataset.insights.filter(i => i.pinned).length ? dataset.insights.filter(i => i.pinned) : dataset.insights.slice(0, 5);
    reportIns.forEach((insight, idx) => {
      slide = pres.addSlide();
      slide.addText(`Key Finding #${idx + 1}`, { x: 0.5, y: 0.4, fontSize: 20, color: "6366F1", bold: true });
      slide.addText(insight.statement, { x: 0.5, y: 0.8, fontSize: 26, color: "1E293B", bold: true, w: 9, h: 1.2, valign: 'middle' });
      
      // Explanation box
      slide.addShape(pres.ShapeType.rect, { x: 0.5, y: 2.2, w: 9, h: 2.8, fill: { color: "FFFFFF" }, border: { color: "F1F5F9", pt: 1 } });
      slide.addText(insight.explanation, { x: 0.7, y: 2.4, fontSize: 16, color: "475569", w: 8.6, h: 2.4, valign: 'top' });
      
      if (insight.soft_suggestion) {
        slide.addShape(pres.ShapeType.rect, { x: 0.5, y: 5.2, w: 9, h: 0.8, fill: { color: "F0FDF4" } });
        slide.addText(`STRATEGIC RECOMMENDATION: ${insight.soft_suggestion}`, { x: 0.7, y: 5.4, fontSize: 13, color: "166534", bold: true, italic: true, w: 8.6, h: 0.4, valign: 'middle' });
      }
      
      slide.addText(`Confidence: ${Math.round(insight.confidence_score * 100)}% | Impact: ${insight.rank_score}/100`, { x: 0.5, y: 6.6, fontSize: 11, color: "94A3B8" });
    });

    // 4. Visual Appendix - Improved Layout
    if (dataset.charts.length > 0) {
      slide = pres.addSlide();
      slide.addText("Visual Appendix & Metric Breakdown", { x: 0.5, y: 0.4, fontSize: 28, color: "1E293B", bold: true });
      
      dataset.charts.slice(0, 4).forEach((chart, cIdx) => {
          const cX = cIdx % 2 === 0 ? 0.5 : 5.2;
          const cY = cIdx < 2 ? 1.4 : 4.4;
          const chartDataValues = getChartData(chart);
          
          slide.addShape(pres.ShapeType.rect, { x: cX, y: cY, w: 4.3, h: 2.6, fill: { color: "FFFFFF" }, border: { color: "E2E8F0", pt: 1 } });
          slide.addText(chart.title.toUpperCase(), { x: cX + 0.2, y: cY + 0.1, fontSize: 12, color: "1E293B", bold: true, w: 3.9, h: 0.4 });
          
          const chartTable = [
              [{ text: chart.xAxis, options: { bold: true, fontSize: 9, fill: "F8FAFC" } }, { text: chart.yAxis, options: { bold: true, fontSize: 9, fill: "F8FAFC" } }],
              ...chartDataValues.slice(0, 5).map(d => [d.name.toString(), d.value.toLocaleString()])
          ];
          slide.addTable(chartTable, { x: cX + 0.2, y: cY + 0.5, w: 3.9, fontSize: 9, border: { type: 'solid', pt: 0.5, color: 'F1F5F9' } });
      });
    }

    pres.writeFile({ fileName: `Executive_Report_${dataset.name.replace(/\.[^/.]+$/, "")}.pptx` });
  };

  const numericColumns = useMemo(() => {
    if (!dataset) return [];
    return dataset.columns.filter(c => {
      const type = c.detected_type?.toLowerCase();
      if (['numeric', 'number', 'integer', 'float', 'decimal'].includes(type)) return true;
      const looksNumeric = c.sample_values.some(v => !isNaN(parseFloat(v)));
      return looksNumeric;
    });
  }, [dataset]);

  const renderChart = (config: ChartConfig) => {
    const data = getChartData(config);
    const Container = ({ children, height = 'h-64' }: { children: React.ReactNode, height?: string }) => (
      <div className={`${height} w-full`}>
        <ResponsiveContainer width="100%" height="100%">
          {children as any}
        </ResponsiveContainer>
      </div>
    );

    const commonTooltipProps = {
      contentStyle: { borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' },
      itemStyle: { fontSize: '12px', fontWeight: 'bold' },
      labelStyle: { color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '900', marginBottom: '4px' }
    };

    if (config.type === 'metric') {
      const total = data.reduce((acc, curr) => acc + curr.value, 0);
      return (
        <div className="flex flex-col items-center justify-center h-full py-8 text-center">
          <span className="text-4xl font-black text-slate-900 tracking-tight">{config.aggregation === 'avg' ? (total/data.length).toFixed(1) : total.toLocaleString()}</span>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">{config.title}</span>
        </div>
      );
    }

    switch (config.type) {
      case 'bar':
        return (
          <Container>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip {...commonTooltipProps as any} cursor={{fill: '#f8fafc'}} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase'}} />
              <Bar name={config.yAxis} dataKey="value" fill={config.color || "#6366f1"} radius={[4, 4, 0, 0]} />
            </BarChart>
          </Container>
        );
      case 'line':
        return (
          <Container>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip {...commonTooltipProps as any} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 'bold'}} />
              <Line name={config.yAxis} type="monotone" dataKey="value" stroke={config.color || "#6366f1"} strokeWidth={3} dot={{r: 4, fill: config.color || '#6366f1', strokeWidth: 2, stroke: '#fff'}} />
            </LineChart>
          </Container>
        );
      case 'composed':
        return (
          <Container>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip {...commonTooltipProps as any} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 'bold'}} />
              <Bar name={config.yAxis} dataKey="value" fill={config.color || "#6366f1"} radius={[4, 4, 0, 0]} />
              <Line name={config.secondaryYAxis} type="monotone" dataKey="value2" stroke="#10b981" strokeWidth={2} dot={{r: 3}} />
            </ComposedChart>
          </Container>
        );
      case 'funnel':
        const funnelData = [...data].sort((a,b) => b.value - a.value);
        return (
          <Container>
            <FunnelChart>
              <Tooltip {...commonTooltipProps as any} />
              <Funnel dataKey="value" data={funnelData} isAnimationActive>
                <LabelList position="right" fill="#888" stroke="none" dataKey="name" fontSize={10} />
              </Funnel>
            </FunnelChart>
          </Container>
        );
      case 'area':
        return (
          <Container>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip {...commonTooltipProps as any} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 'bold'}} />
              <Area name={config.yAxis} type="monotone" dataKey="value" stroke={config.color || "#6366f1"} fill={config.color || "#6366f1"} fillOpacity={0.2} />
            </AreaChart>
          </Container>
        );
      case 'pie':
        return (
          <Container>
            <PieChart>
              <Pie data={data} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip {...commonTooltipProps as any} />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{fontSize: '10px', fontWeight: 'bold'}} />
            </PieChart>
          </Container>
        );
      case 'radar':
        return (
          <Container>
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
              <PolarGrid stroke="#f1f5f9" />
              <PolarAngleAxis dataKey="name" fontSize={10} />
              <PolarRadiusAxis fontSize={10} axisLine={false} tick={false} />
              <Radar name={config.yAxis} dataKey="value" stroke={config.color || "#6366f1"} fill={config.color || "#6366f1"} fillOpacity={0.6} />
              <Tooltip {...commonTooltipProps as any} />
            </RadarChart>
          </Container>
        );
      case 'scatter':
        return (
          <Container>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" dataKey="x" name={config.xAxis} fontSize={10} />
              <YAxis type="number" dataKey="y" name={config.yAxis} fontSize={10} />
              <ZAxis type="number" range={[50, 400]} />
              <Tooltip {...commonTooltipProps as any} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Data Distribution" data={data} fill={config.color || "#6366f1"} />
            </ScatterChart>
          </Container>
        );
      default:
        return <div>Unsupported type</div>;
    }
  };

  const renderScreen = () => {
    if (loading) return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="text-slate-500 animate-pulse text-center font-medium">Building your analytics engine...</p>
      </div>
    );

    switch (state) {
      case AppState.AUTH:
        return (
          <div className="max-w-md mx-auto py-12 animate-in fade-in zoom-in duration-500">
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-2xl space-y-8">
              <div className="text-center space-y-3">
                <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-indigo-200 shadow-xl mb-6">
                  <span className="text-white text-3xl font-black italic">A</span>
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                  {authMode === 'login' ? 'Sign In' : 'Join Co-Analyst'}
                </h2>
                <p className="text-slate-500 text-sm font-medium">Enterprise Data Intelligence.</p>
              </div>
              <div className="space-y-6">
                {SHOW_GOOGLE_BUTTON && (
                  <button 
                    onClick={handleGoogleLogin}
                    disabled={authLoading}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-200 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {authLoading ? <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin"></div> : (
                      <svg className="w-5 h-5" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                      </svg>
                    )}
                    Continue with Google
                  </button>
                )}
                <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div><div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em] font-black"><span className="bg-white px-4 text-slate-300">Or use email</span></div></div>
                <form onSubmit={handleAuth} className="space-y-4">
                  {authMode === 'signup' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                      <input required name="name" type="text" className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-indigo-600 outline-none transition-colors" placeholder="Alex Rivera" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                    <input required name="email" type="email" className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-indigo-600 outline-none transition-colors" placeholder="alex@company.com" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                    <input required name="password" type="password" className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-indigo-600 outline-none transition-colors" placeholder="••••••••" />
                  </div>
                  {authError && <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl font-bold flex items-center gap-2">{authError}</div>}
                  {authInfo && <div className="bg-blue-50 text-blue-700 text-xs p-3 rounded-xl font-bold flex items-center gap-2">{authInfo}</div>}
                  <button type="submit" disabled={authLoading} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 shadow-xl transition-all disabled:opacity-50 mt-2">{authLoading ? 'Authenticating...' : authMode === 'login' ? 'Sign In' : 'Create Account'}</button>
                </form>
                <div className="text-center pt-2"><button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(null); }} className="text-sm font-bold text-slate-500 hover:text-indigo-600">{authMode === 'login' ? "New here? Create an account" : "Already have an account? Sign in"}</button></div>
              </div>
            </div>
          </div>
        );

      case AppState.DASHBOARD:
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end">
              <div><h2 className="text-3xl font-black text-slate-900 tracking-tight">Analytics Dashboard</h2><p className="text-slate-500 font-medium">Analyze your business metrics with precision.</p></div>
              <button onClick={() => setState(AppState.UPLOADED)} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-indigo-700 shadow-xl flex items-center gap-2 transition-all">New Project</button>
            </div>
            {history.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {history.map(proj => (
                  <div key={proj.id} onClick={() => { setDataset(proj); setState(AppState.CHARTS); }} className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all cursor-pointer group relative overflow-hidden">
                    <div className={`absolute top-0 right-0 h-2 w-full ${proj.health_score > 80 ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                    <div className="flex justify-between items-start mb-6"><div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-50"><svg className="w-6 h-6 text-slate-400 group-hover:text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 17v-2m3 2v-4m3 2v-6m-9 9h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div><span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{new Date(proj.upload_date).toLocaleDateString()}</span></div>
                    <h3 className="text-lg font-black text-slate-900 mb-1 truncate">{proj.name}</h3>
                    <p className="text-xs text-slate-400 font-bold mb-6">{proj.row_count.toLocaleString()} rows • {proj.column_count} cols</p>
                    <div className="flex items-center justify-between border-t border-slate-50 pt-4"><div className="flex flex-col"><span className="text-[10px] text-slate-300 font-black uppercase tracking-widest">Health</span><span className={`text-base font-black ${proj.health_score > 80 ? 'text-emerald-500' : 'text-orange-500'}`}>{proj.health_score}%</span></div><div className="flex flex-col text-right"><span className="text-[10px] text-slate-300 font-black uppercase tracking-widest">Charts</span><span className="text-base font-black text-slate-900">{proj.charts?.length || 0}</span></div></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-24 text-center space-y-6 bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-100">
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto"><svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg></div>
                <h4 className="text-xl font-black text-slate-900 mb-2">Ready to explore?</h4>
                <button onClick={() => setState(AppState.UPLOADED)} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all">Upload Data</button>
              </div>
            )}
          </div>
        );

      case AppState.UPLOADED:
        return (
          <div className="max-w-2xl mx-auto text-center space-y-8 py-12 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Connect Dataset</h2>
            <div className="border-4 border-dashed border-indigo-100 rounded-[3rem] p-16 bg-indigo-50/30 hover:bg-indigo-50/50 hover:border-indigo-200 transition-all group">
              <input type="file" id="dataset-upload" className="hidden" accept=".csv" onChange={handleFileUpload} />
              <label htmlFor="dataset-upload" className="cursor-pointer space-y-6 flex flex-col items-center">
                <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg></div>
                <div className="text-indigo-600 font-black text-xl">Upload CSV or Excel</div>
              </label>
            </div>
            <button onClick={handleReset} className="text-xs font-black text-slate-300 uppercase tracking-widest hover:text-slate-500">Cancel</button>
          </div>
        );

      case AppState.PROFILED:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center">
              <div><h2 className="text-3xl font-black text-slate-900 tracking-tight mb-1">{dataset?.name}</h2><p className="text-slate-400 font-bold">{dataset?.row_count.toLocaleString()} rows • {dataset?.column_count} columns</p></div>
              <div className="text-right"><span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Health Score</span><div className={`text-4xl font-black ${dataset!.health_score > 80 ? 'text-emerald-500' : 'text-orange-500'}`}>{dataset?.health_score}%</div></div>
            </div>
            <DataTable columns={dataset!.columns} />
            <div className="bg-indigo-900 p-10 rounded-[2.5rem] text-white space-y-6 shadow-2xl">
              <h3 className="text-2xl font-black tracking-tight">What are we looking for?</h3>
              <p className="text-indigo-200 text-sm">Define your goal (e.g., "Analyze revenue by region" or "Find churn patterns").</p>
              <textarea className="w-full bg-indigo-800 border-none rounded-2xl p-6 text-white placeholder-indigo-400 h-32 outline-none" placeholder="Enter your business intent..." value={intent} onChange={(e) => setIntent(e.target.value)} />
              <button onClick={() => setState(AppState.ISSUES_REVIEWED)} className="w-full bg-white text-indigo-900 font-black py-4 rounded-2xl shadow-xl transition-all">Next: Data Cleaning</button>
            </div>
          </div>
        );

      case AppState.ISSUES_REVIEWED:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center"><h2 className="text-2xl font-black text-slate-900">Cleaning & Enrichment</h2><button onClick={() => setState(AppState.READY)} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg">Done Reviewing</button></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Issues Found</h3>
                {dataset!.issues.length > 0 ? (
                  <IssueList 
                    issues={dataset!.issues} 
                    onToggleIssue={toggleIssue} 
                    onFixIssue={handleFixIssue}
                  />
                ) : (
                  <div className="p-16 bg-white rounded-3xl border border-slate-100 text-center font-bold text-slate-300">Clean dataset! No issues found.</div>
                )}
              </div>
              <div className="bg-white p-8 rounded-3xl border border-slate-100 h-fit space-y-6"><h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Column Quality</h3><div className="space-y-4">{dataset?.columns.map(col => (<div key={col.id} className="space-y-1.5"><div className="flex justify-between text-[11px] font-black text-slate-600 uppercase tracking-tight"><span>{col.name}</span><span>{100 - col.missing_pct}%</span></div><div className="w-full bg-slate-50 rounded-full h-2 overflow-hidden"><div className="bg-emerald-500 h-full transition-all" style={{ width: `${100 - col.missing_pct}%` }} /></div></div>))}</div></div>
            </div>
          </div>
        );

      case AppState.READY:
        return (
          <div className="max-w-2xl mx-auto py-20 text-center space-y-12 animate-in fade-in zoom-in duration-700">
            <h2 className="text-5xl font-black text-slate-900 tracking-tighter">Engine Primed.</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
              <button onClick={startAnalysis} className="group p-10 bg-white border-2 border-slate-50 rounded-[2.5rem] hover:border-indigo-600 transition-all shadow-sm"><div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 text-indigo-600"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9.663 17h4.673M12 3v1" /></svg></div><h4 className="text-2xl font-black text-slate-900 mb-2">AI Insights</h4><p className="text-slate-400 text-sm">Discover patterns and correlations automatically.</p></button>
              <button onClick={() => setState(AppState.CHARTS)} className="group p-10 bg-white border-2 border-slate-50 rounded-[2.5rem] hover:border-emerald-600 transition-all shadow-sm"><div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 text-emerald-600"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 17v-2m3 2v-4" /></svg></div><h4 className="text-2xl font-black text-slate-900 mb-2">Build Dashboard</h4><p className="text-slate-400 text-sm">Create visual representations of your metrics.</p></button>
            </div>
          </div>
        );

      case AppState.INSIGHTS_RUN:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center"><h2 className="text-3xl font-black text-slate-900 tracking-tight">AI Discoveries</h2><button onClick={() => setState(AppState.CHARTS)} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg">Next: Build Dashboard</button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">{dataset?.insights.map(insight => (<div key={insight.id} className="bg-white border-2 border-slate-50 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden group hover:shadow-2xl transition-all"><div className={`absolute top-0 left-0 h-1.5 w-full ${insight.type === 'anomaly' ? 'bg-red-500' : 'bg-indigo-500'}`} /><div className="flex justify-between mb-6"><span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest">{insight.type}</span></div><h4 className="text-xl font-black text-slate-900 mb-3">{insight.statement}</h4><p className="text-sm text-slate-500 leading-relaxed mb-6">{insight.explanation}</p><div className="flex gap-8 border-t border-slate-50 pt-6 text-[11px] font-black text-slate-300 uppercase tracking-widest"><div>CONFIDENCE: <span className="text-slate-900">{Math.round(insight.confidence_score * 100)}%</span></div><div>IMPACT: <span className="text-slate-900">{insight.rank_score}/100</span></div></div></div>))}</div>
          </div>
        );

      case AppState.CHARTS:
        return (
          <div className="flex flex-col lg:flex-row min-h-screen -mt-8 -mx-4 lg:-mx-8">
            {/* Advanced Visualization Sidebar */}
            <aside className="w-full lg:w-96 bg-white border-r border-slate-200 p-8 space-y-8 overflow-y-auto h-auto lg:h-[calc(100vh-64px)] scrollbar-hide no-print">
              <div><h2 className="text-2xl font-black text-slate-900 tracking-tight">Visual Builder</h2><p className="text-slate-400 text-sm font-medium">Design professional dashboards.</p></div>
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Widget Title</label>
                  <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-600 transition-all" placeholder="Metric Name" value={chartTitle} onChange={(e) => setChartTitle(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Visualization Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['bar', 'line', 'pie', 'area', 'radar', 'scatter', 'metric', 'composed', 'funnel'] as const).map(t => (
                      <button key={t} onClick={() => setChartType(t)} className={`px-2 py-3 rounded-xl border text-[10px] font-black capitalize transition-all ${chartType === t ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105' : 'bg-white text-slate-600 border-slate-100 hover:border-indigo-200'}`}>{t}</button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Category (X)</label>
                    <select className="w-full px-3 py-3 rounded-xl border border-slate-200 text-xs outline-none" value={chartX} onChange={(e) => setChartX(e.target.value)}><option value="">Select</option>{dataset?.columns.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Measure (Y)</label>
                    <select className="w-full px-3 py-3 rounded-xl border border-slate-200 text-xs outline-none" value={chartY} onChange={(e) => setChartY(e.target.value)}><option value="">Select</option>{numericColumns.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
                  </div>
                </div>
                {chartType === 'composed' && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Secondary Measure (Y2)</label>
                    <select className="w-full px-3 py-3 rounded-xl border border-slate-200 text-xs outline-none" value={chartYSecondary} onChange={(e) => setChartYSecondary(e.target.value)}><option value="">Select</option>{numericColumns.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Initial Size</label>
                    <select className="w-full px-3 py-3 rounded-xl border border-slate-200 text-xs outline-none" value={chartSize} onChange={(e) => setChartSize(e.target.value as ChartSize)}>
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Full Width</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Aggregation</label>
                    <select className="w-full px-3 py-3 rounded-xl border border-slate-200 text-xs outline-none" value={chartAggregation} onChange={(e) => setChartAggregation(e.target.value as any)}>
                      <option value="none">None</option>
                      <option value="sum">Sum</option>
                      <option value="avg">Avg</option>
                      <option value="count">Count</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Theme Color</label>
                  <div className="flex flex-wrap gap-2">
                    {CHART_COLORS.map(c => (
                      <button key={c} onClick={() => setChartColor(c)} className={`w-8 h-8 rounded-full border-2 transition-all ${chartColor === c ? 'border-slate-900 scale-110' : 'border-transparent'}`} style={{backgroundColor: c}} />
                    ))}
                  </div>
                </div>
                <button onClick={addChart} disabled={!chartTitle || !chartX || !chartY} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-indigo-700 disabled:opacity-50 transition-all transform active:scale-95">Add to Dashboard</button>
              </div>
            </aside>

            {/* Dashboard Canvas */}
            <main className="flex-1 bg-slate-50 p-8 lg:p-12 overflow-y-auto">
              <div className="flex justify-between items-center mb-10 no-print">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Active Dashboard</h2>
                <div className="flex gap-4">
                  <button onClick={() => setState(AppState.REPORT_GENERATED)} className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold border border-slate-200 shadow-sm hover:shadow-md transition-all">Preview Report</button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {dataset?.charts.map(chart => {
                  const sizeClasses = chart.size === 'small' ? 'md:col-span-2 lg:col-span-2' : chart.size === 'large' ? 'col-span-full' : 'md:col-span-2 lg:col-span-3';
                  return (
                    <div key={chart.id} className={`bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative group transition-all hover:shadow-xl ${chart.type === 'metric' ? 'col-span-2' : sizeClasses}`}>
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                          <h4 className="font-black text-slate-900 text-sm truncate uppercase tracking-widest">{chart.title}</h4>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity no-print">
                           <div className="flex bg-slate-50 rounded-lg p-0.5 border border-slate-100">
                             {(['small', 'medium', 'large'] as ChartSize[]).map(s => (
                               <button 
                                key={s} 
                                onClick={() => updateChartSize(chart.id, s)}
                                className={`w-6 h-6 rounded flex items-center justify-center text-[8px] font-black uppercase transition-all ${chart.size === s ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-300 hover:text-slate-500'}`}
                                title={`Set to ${s}`}
                               >
                                 {s[0]}
                               </button>
                             ))}
                           </div>
                           <button onClick={() => removeChart(chart.id)} className="text-slate-200 hover:text-red-500 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                      </div>
                      {renderChart(chart)}
                      <div className="mt-4 flex justify-between text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] border-t border-slate-50 pt-4">
                        <span>{chart.type} • {chart.aggregation}</span>
                        <span>{chart.xAxis} / {chart.yAxis}</span>
                      </div>
                    </div>
                  );
                })}
                {(dataset?.charts.length || 0) === 0 && (
                  <div className="col-span-full py-32 text-center space-y-4 bg-white/50 border-4 border-dashed border-slate-200 rounded-[3rem]">
                    <p className="text-slate-400 font-black text-xl">Canvas is empty. Add widgets from the builder.</p>
                  </div>
                )}
              </div>
            </main>
          </div>
        );

      case AppState.REPORT_GENERATED:
        const reportIns = dataset?.insights.filter(i => i.pinned).length ? dataset?.insights.filter(i => i.pinned) : dataset?.insights.slice(0, 8) || [];
        const reportCharts = dataset?.charts || [];

        return (
          <div className="max-w-5xl mx-auto space-y-8 py-8 animate-in fade-in zoom-in duration-500 print:py-0 print:m-0 print:max-w-none">
            <div className="flex justify-between items-center no-print px-4">
              <button onClick={() => setState(AppState.CHARTS)} className="font-black text-slate-300 hover:text-indigo-600 transition-colors uppercase tracking-widest text-xs">← Back to Builder</button>
              <div className="flex gap-4">
                <button onClick={handleExportPPT} className="px-6 py-3 bg-white text-slate-900 border border-slate-200 rounded-2xl font-black shadow-sm active:scale-95 transition-all flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 24 24"><path d="M15 12H9v2h6v-2zm0-4H9v2h6V8zm4-5h-3.18C15.42 1.16 13.84 0 12 0s-3.42 1.16-3.82 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 18H5V5h2v3h10V5h2v14z"/></svg>
                  PPTX
                </button>
                <button onClick={() => window.print()} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-xl transition-all">Print PDF</button>
              </div>
            </div>
            <div className="bg-white p-20 rounded-[4rem] shadow-2xl border border-slate-50 space-y-20 print:shadow-none print:p-0 print:border-none print:rounded-none print:space-y-12">
              <div className="border-b-8 border-slate-50 pb-12 flex justify-between items-end print:border-slate-100">
                <div>
                  <h1 className="text-6xl font-black uppercase tracking-tighter mb-4 print:text-4xl">Strategic Review</h1>
                  <p className="text-slate-400 font-bold text-2xl print:text-xl">Project: <span className="text-indigo-600">{dataset?.name}</span></p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-slate-200 uppercase tracking-[0.4em] mb-2">Enterprise Insights Engine</p>
                  <p className="text-lg font-black text-slate-400">{new Date().toLocaleDateString()}</p>
                </div>
              </div>
              
              <section className="space-y-8 print-break-inside-avoid">
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight print:text-2xl">Executive Summary</h2>
                <div className="p-12 bg-slate-50 rounded-[3rem] border-2 border-slate-100 italic text-xl text-slate-600 leading-relaxed shadow-inner print:p-6 print:text-lg">
                  "Analytical review of {dataset?.row_count.toLocaleString()} data points. Key metrics indicate high operational stability (Health: {dataset?.health_score}%)."
                </div>
              </section>

              <section className="space-y-16 print:space-y-10">
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight print:text-2xl">Key Observations</h2>
                <div className="space-y-20 print:space-y-12">
                  {reportIns.map((insight, idx) => (
                    <div key={insight.id} className="space-y-6 print-break-inside-avoid">
                      <div className="flex gap-8 items-center">
                        <span className="text-7xl font-black text-slate-100 italic tracking-tighter print:text-5xl">0{idx+1}</span>
                        <h3 className="text-3xl font-black text-slate-800 border-b-4 border-slate-50 pb-2 flex-1 print:text-xl">{insight.statement}</h3>
                      </div>
                      <div className="pl-32 print:pl-16">
                        <p className="text-slate-500 text-xl leading-relaxed max-w-2xl print:text-lg">{insight.explanation}</p>
                        {insight.soft_suggestion && (
                          <div className="mt-8 bg-emerald-50/50 p-8 rounded-[2.5rem] border-2 border-emerald-50 inline-block print:p-4 print:mt-4 print:rounded-2xl">
                            <p className="text-lg text-emerald-900 font-bold italic leading-relaxed print:text-base">Action: {insight.soft_suggestion}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {reportCharts.length > 0 && (
                <section className="space-y-12 print:space-y-8">
                  <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight print:text-2xl">Visual Appendix</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 print:gap-8">
                    {reportCharts.map(chart => (
                      <div key={chart.id} className="space-y-6 print-break-inside-avoid">
                        <h4 className="font-black text-slate-800 border-l-8 border-indigo-600 pl-6 text-lg uppercase tracking-widest print:text-base">{chart.title}</h4>
                        <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 print:p-4 print:rounded-2xl">
                          {renderChart(chart)}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              
              <div className="pt-20 text-center no-print border-t border-slate-50">
                <button onClick={handleReset} className="px-12 py-5 border-2 border-slate-100 text-slate-300 rounded-3xl font-black hover:bg-slate-50 hover:text-slate-500 transition-all">New Analysis</button>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Error loading state.</div>;
    }
  };

  return (
    <Layout 
      currentState={state} 
      onReset={handleReset} 
      onStateChange={setState}
      hasDataset={!!dataset}
      user={user}
      onLogout={handleLogout}
    >
      {renderScreen()}
    </Layout>
  );
}
