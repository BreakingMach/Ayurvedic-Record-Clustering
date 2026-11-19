import React, { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
  Navigate,
} from 'react-router-dom';
import OverviewPage from './components/OverviewPage';
import WorkbenchPage from './components/WorkbenchPage';
import DataPage from './components/DataPage';
import MethodPage from './components/MethodPage';
import ResultsPage from './components/ResultsPage';
import RetrievalPage from './components/RetrievalPage';
import LimitationsPage from './components/LimitationsPage';
import DatasetAnalysisPage from './components/DatasetAnalysisPage';
import PatientAttributesPage from './components/PatientAttributesPage';
import MetricComparisonPage from './components/MetricComparisonPage';
import PatientClusteringPage from './components/PatientClusteringPage';
import DiagnosticValidationPage from './components/DiagnosticValidationPage';
import ReportsExportPage from './components/ReportsExportPage';
import { parseCsvSummary } from './utils/distanceEngine';

export const PAGES = [
  { id: 'overview',    path: '/overview',    label: 'Overview',              icon: '🏠' },
  { id: 'workbench',   path: '/workbench',   label: 'Workbench',              icon: '🔬' },
  { id: 'dataset',     path: '/dataset',     label: 'Dataset Analysis',       icon: '📊' },
  { id: 'attributes',  path: '/attributes',  label: 'Patient Attributes',     icon: '🧬' },
  { id: 'data',        path: '/data',        label: 'Data Summary',           icon: '📋' },
  { id: 'method',      path: '/method',      label: 'Method',                 icon: '⚙️' },
  { id: 'results',     path: '/results',     label: 'Results',                icon: '📈' },
  { id: 'comparison',  path: '/comparison',  label: 'Metric Comparison',      icon: '⚖️' },
  { id: 'clustering',  path: '/clustering',  label: 'Patient Clustering',     icon: '🗂️' },
  { id: 'validation',  path: '/validation',  label: 'Diagnostic Validation',  icon: '✅' },
  { id: 'retrieval',   path: '/retrieval',   label: 'Retrieval',              icon: '🔍' },
  { id: 'limitations', path: '/limitations', label: 'Limitations',            icon: '⚠️' },
  { id: 'reports',     path: '/reports',     label: 'Reports & Export',       icon: '📄' },
];

function getInitialCollapsed() {
  try {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  } catch {
    return false;
  }
}

function setCollapsedStorage(value) {
  try {
    localStorage.setItem('sidebar_collapsed', String(value));
  } catch {
    // ignore
  }
}

function AppLayout({ state }) {
  const [collapsed, setCollapsed] = useState(getInitialCollapsed);
  const location = useLocation();
  const navigate = useNavigate();

  function toggleSidebar() {
    setCollapsed((prev) => {
      const next = !prev;
      setCollapsedStorage(next);
      return next;
    });
  }

  const sidebarWidth = collapsed ? 60 : 240;

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-neutral-900">
      {/* Sidebar with Route Navigation Endpoints */}
      <aside
        style={{ width: sidebarWidth }}
        className="fixed inset-y-0 left-0 z-30 flex flex-col bg-white border-r border-neutral-200 transition-all duration-200 overflow-hidden"
      >
        {/* Logo + toggle row */}
        <div className="flex items-center justify-between px-3 py-4 border-b border-neutral-200 shrink-0">
          {!collapsed && (
            <span className="text-xs font-semibold tracking-tight text-neutral-900 truncate leading-tight">
              Ayurvedic Distance Benchmark
            </span>
          )}
          {collapsed && (
            <span className="w-full text-center text-xs font-bold text-teal-800 select-none">
              ADB
            </span>
          )}
          {!collapsed && (
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Collapse sidebar"
              className="ml-2 shrink-0 rounded p-1 text-neutral-500 hover:bg-neutral-100 transition"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {collapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Expand sidebar"
            className="mx-auto mt-2 shrink-0 rounded p-1 text-neutral-500 hover:bg-neutral-100 transition"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        {/* Route Nav Items */}
        <nav className="flex flex-col gap-0.5 px-2 py-2 overflow-y-auto flex-1" aria-label="Primary navigation">
          {PAGES.map((p) => {
            const active =
              location.pathname === p.path ||
              (location.pathname === '/' && p.id === 'overview');
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => navigate(p.path)}
                title={collapsed ? p.label : undefined}
                className={`flex items-center gap-2 rounded px-2 py-2 text-sm font-medium transition w-full text-left ${
                  active
                    ? 'bg-teal-50 text-teal-800 ring-1 ring-teal-700/30'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                <span className={`shrink-0 ${collapsed ? 'mx-auto' : ''}`} aria-hidden="true">
                  {p.icon}
                </span>
                {!collapsed && (
                  <span className="truncate">{p.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Disclaimer at bottom (R11) */}
        {!collapsed && (
          <div className="px-3 py-3 border-t border-neutral-200 shrink-0">
            <p className="text-[10px] leading-tight text-neutral-400">
              Research prototype on a dataset of unverified origin. Not a diagnostic tool.
            </p>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div
        style={{ marginLeft: sidebarWidth }}
        className="transition-all duration-200 min-h-screen"
      >
        <main className="mx-auto max-w-5xl px-6 py-8">
          {state.loading && (
            <div className="paper-card p-6 text-sm text-neutral-600">
              Loading verified results from <code className="num">/data/</code>...
            </div>
          )}

          {state.error && (
            <div className="paper-card border-red-200 p-6 text-sm text-red-700">
              Error loading benchmark files: {state.error}. Run{' '}
              <code className="num">python python_benchmark/export_ui_data.py</code>.
            </div>
          )}

          {state.payload && (
            <Routes>
              <Route path="/" element={<Navigate to="/overview" replace />} />
              <Route
                path="/overview"
                element={
                  <OverviewPage
                    realData={state.payload.realData}
                    syntheticData={state.payload.syntheticData}
                    expertReview={state.payload.expertReview}
                    onNavigate={(pageId) => navigate(pageId.startsWith('/') ? pageId : `/${pageId}`)}
                  />
                }
              />
              <Route path="/workbench" element={<WorkbenchPage />} />
              <Route
                path="/dataset"
                element={
                  <DatasetAnalysisPage
                    descriptive={state.payload.descriptive}
                    realData={state.payload.realData}
                  />
                }
              />
              <Route
                path="/attributes"
                element={
                  <PatientAttributesPage
                    realData={state.payload.realData}
                    realCases={state.payload.realCases}
                  />
                }
              />
              <Route
                path="/data"
                element={
                  <DataPage
                    realData={state.payload.realData}
                    realCases={state.payload.realCases}
                    synthCsvSummary={state.payload.synthCsvSummary}
                  />
                }
              />
              <Route
                path="/method"
                element={
                  <MethodPage
                    realData={state.payload.realData}
                    syntheticData={state.payload.syntheticData}
                  />
                }
              />
              <Route
                path="/results"
                element={
                  <ResultsPage
                    realData={state.payload.realData}
                    syntheticData={state.payload.syntheticData}
                  />
                }
              />
              <Route
                path="/comparison"
                element={
                  <MetricComparisonPage
                    realData={state.payload.realData}
                    syntheticData={state.payload.syntheticData}
                    missingnessData={state.payload.missingnessData}
                    scalingAblation={state.payload.scalingAblation}
                  />
                }
              />
              <Route
                path="/clustering"
                element={
                  <PatientClusteringPage
                    clusteringsData={state.payload.clusteringsData}
                    embeddingsData={state.payload.embeddingsData}
                    realCases={state.payload.realCases}
                  />
                }
              />
              <Route
                path="/validation"
                element={
                  <DiagnosticValidationPage
                    realData={state.payload.realData}
                    descriptive={state.payload.descriptive}
                  />
                }
              />
              <Route
                path="/retrieval"
                element={<RetrievalPage realCases={state.payload.realCases} />}
              />
              <Route
                path="/limitations"
                element={<LimitationsPage expertReview={state.payload.expertReview} />}
              />
              <Route
                path="/reports"
                element={
                  <ReportsExportPage
                    realData={state.payload.realData}
                    syntheticData={state.payload.syntheticData}
                    missingnessData={state.payload.missingnessData}
                  />
                }
              />
              <Route path="*" element={<Navigate to="/overview" replace />} />
            </Routes>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [state, setState] = useState({ loading: true, error: null, payload: null });

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [
          realRes,
          synthRes,
          expertRes,
          casesRes,
          synthCsvRes,
          descriptiveRes,
          missingnessRes,
          scalingAblationRes,
          clusteringsRes,
          embeddingsRes,
        ] = await Promise.all([
          fetch('/data/real_data.json'),
          fetch('/data/synthetic.json'),
          fetch('/data/expert_review.json'),
          fetch('/data/real_cases.json'),
          fetch('/data/synthetic_cases_default.csv'),
          fetch('/data/descriptive.json'),
          fetch('/data/missingness.json'),
          fetch('/data/synthetic_scaling_ablation.json'),
          fetch('/data/clusterings.json'),
          fetch('/data/embeddings.json'),
        ]);

        for (const res of [
          realRes, synthRes, expertRes, casesRes, synthCsvRes,
          descriptiveRes, missingnessRes, scalingAblationRes, clusteringsRes, embeddingsRes,
        ]) {
          if (!res.ok) throw new Error(`Failed to fetch ${res.url} (HTTP ${res.status})`);
        }

        const [
          realData,
          syntheticData,
          expertReview,
          realCases,
          synthCsvText,
          descriptive,
          missingnessData,
          scalingAblation,
          clusteringsData,
          embeddingsData,
        ] = await Promise.all([
          realRes.json(),
          synthRes.json(),
          expertRes.json(),
          casesRes.json(),
          synthCsvRes.text(),
          descriptiveRes.json(),
          missingnessRes.json(),
          scalingAblationRes.json(),
          clusteringsRes.json(),
          embeddingsRes.json(),
        ]);

        const synthCsvSummary = parseCsvSummary(synthCsvText);

        if (mounted) {
          setState({
            loading: false,
            error: null,
            payload: {
              realData,
              syntheticData,
              expertReview,
              realCases,
              synthCsvSummary,
              descriptive,
              missingnessData,
              scalingAblation,
              clusteringsData,
              embeddingsData,
            },
          });
        }
      } catch (err) {
        if (mounted) setState({ loading: false, error: err.message, payload: null });
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <BrowserRouter>
      <AppLayout state={state} />
    </BrowserRouter>
  );
}
