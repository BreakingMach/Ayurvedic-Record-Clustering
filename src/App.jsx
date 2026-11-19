import React, { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
  Navigate,
} from 'react-router-dom';
import {
  LayoutDashboard,
  Scale,
  BarChart3,
  Database,
  Dna,
  FileSpreadsheet,
  FlaskConical,
  Search,
  Network,
  CheckCircle2,
  Sliders,
  ShieldAlert,
  FileDown,
  ExternalLink,
  Activity,
  Sparkles,
  UserPlus,
  Command,
  ChevronRight,
  X,
  ArrowUpRight,
} from 'lucide-react';
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

export const NAV_SECTIONS = [
  {
    title: 'DASHBOARD & METRICS',
    items: [
      { id: 'overview',    path: '/overview',    label: 'Overview',              icon: LayoutDashboard },
      { id: 'comparison',  path: '/comparison',  label: 'Metric Comparison',      icon: Scale },
      { id: 'results',     path: '/results',     label: 'Benchmark Results',      icon: BarChart3 },
    ],
  },
  {
    title: 'PATIENT COHORT',
    items: [
      { id: 'dataset',     path: '/dataset',     label: 'Dataset Analysis',       icon: Database },
      { id: 'attributes',  path: '/attributes',  label: 'Patient Attributes',     icon: Dna },
      { id: 'data',        path: '/data',        label: 'Data Summary',           icon: FileSpreadsheet },
      { id: 'clustering',  path: '/clustering',  label: 'Patient Clustering',     icon: Network },
    ],
  },
  {
    title: 'SIMILARITY ENGINE',
    items: [
      { id: 'workbench',   path: '/workbench',   label: 'Workbench',              icon: FlaskConical },
      { id: 'retrieval',   path: '/retrieval',   label: 'Nearest Neighbours',     icon: Search },
    ],
  },
  {
    title: 'AUDIT & METHODOLOGY',
    items: [
      { id: 'validation',  path: '/validation',  label: 'Label Concordance',      icon: CheckCircle2 },
      { id: 'method',      path: '/method',      label: 'Methodology & Controls', icon: Sliders },
      { id: 'limitations', path: '/limitations', label: 'Limitations & Bias',     icon: ShieldAlert },
      { id: 'reports',     path: '/reports',     label: 'Reports & Export',       icon: FileDown },
    ],
  },
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
  const [commandOpen, setCommandOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  // Keyboard shortcut listener for Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      } else if (e.key === 'Escape' && commandOpen) {
        setCommandOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandOpen]);

  function toggleSidebar() {
    setCollapsed((prev) => {
      const next = !prev;
      setCollapsedStorage(next);
      return next;
    });
  }

  const sidebarWidth = collapsed ? 68 : 260;

  // Find active item
  const currentPath = location.pathname === '/' ? '/overview' : location.pathname;

  // Flatten nav items for breadcrumbs & command search
  const allNavItems = NAV_SECTIONS.flatMap((sec) =>
    sec.items.map((it) => ({ ...it, section: sec.title }))
  );
  const activeNavItem = allNavItems.find((it) => it.path === currentPath);

  // Filter items in command palette
  const filteredCommandItems = allNavItems.filter((it) =>
    it.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    it.section.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Enterprise Top Navigation Bar */}
      <header
        style={{ left: sidebarWidth }}
        className="fixed top-0 right-0 z-20 h-16 bg-white/95 backdrop-blur border-b border-slate-200/80 transition-all duration-200 flex items-center justify-between px-6 shadow-xs"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Live Research Analytics Portal
            </span>
          </div>
          <span className="text-slate-300">|</span>
          <span className="rounded-md bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
            N = <span className="num">1200</span> Records · <span className="num">29</span> Traits
          </span>
          <span className="hidden lg:inline-flex rounded-md bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-700">
            Client-Side Distance Engine v2.0
          </span>
        </div>

        {/* Global Quick Action & Search Center */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="hidden md:inline-flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/90 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition shadow-2xs"
          >
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden xl:inline">Search analytics, metrics, or patients...</span>
            <span className="xl:hidden">Search...</span>
            <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 shadow-2xs">
              ⌘K
            </kbd>
          </button>

          <button
            type="button"
            onClick={() => navigate('/workbench')}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 px-3.5 py-1.5 text-xs font-semibold text-white transition shadow-sm"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Patient Intake & Predict
          </button>

          <button
            type="button"
            onClick={() => navigate('/reports')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition shadow-xs"
          >
            <FileDown className="h-3.5 w-3.5 text-slate-500" />
            Export
          </button>
        </div>
      </header>

      {/* Global Command Palette Modal */}
      {commandOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-slate-900/40 backdrop-blur-xs p-4"
          onClick={() => setCommandOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 bg-slate-50/60">
              <Search className="h-4 w-4 text-emerald-600 shrink-0" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Jump to page, patient intake, or distance metrics..."
                className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => setCommandOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Navigation &amp; Analytics
              </div>
              {filteredCommandItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No matching destinations found for &quot;{searchQuery}&quot;
                </div>
              ) : (
                filteredCommandItems.map((it) => {
                  const Icon = it.icon;
                  return (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => {
                        navigate(it.path);
                        setCommandOpen(false);
                      }}
                      className="flex items-center justify-between w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-emerald-50/80 hover:text-emerald-900 transition group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 text-slate-400 group-hover:text-emerald-700" />
                        <span className="font-medium text-slate-800 group-hover:text-emerald-950">
                          {it.label}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 group-hover:text-emerald-700">
                        {it.section}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <span>Select</span>
                <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[9px] font-mono shadow-2xs">Enter</kbd>
                <span>Close</span>
                <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[9px] font-mono shadow-2xs">Esc</kbd>
              </div>
              <span className="text-[10px] text-emerald-800 font-semibold">AyurSimilarity Engine</span>
            </div>
          </div>
        </div>
      )}

      {/* Modern Enterprise Sidebar */}
      <aside
        style={{ width: sidebarWidth }}
        className="fixed inset-y-0 left-0 z-30 flex flex-col bg-slate-900 text-slate-300 border-r border-slate-800 transition-all duration-200 overflow-hidden select-none"
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-slate-800 shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-2.5 truncate">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-sm shadow-sm">
                AY
              </div>
              <div className="truncate">
                <div className="text-xs font-bold tracking-tight text-white uppercase leading-tight">
                  AyurSimilarity
                </div>
                <div className="text-[10px] text-slate-400 font-medium leading-none">
                  Distance Benchmark
                </div>
              </div>
            </div>
          )}

          {collapsed && (
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-sm shadow-sm">
              AY
            </div>
          )}

          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d={collapsed ? "M6 4l4 4-4 4" : "M10 12L6 8l4-4"}
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Primary navigation">
          {NAV_SECTIONS.map((sec) => (
            <div key={sec.title} className="space-y-1">
              {!collapsed && (
                <div className="px-2 pb-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                  {sec.title}
                </div>
              )}
              {sec.items.map((p) => {
                const Icon = p.icon;
                const active = currentPath === p.path;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => navigate(p.path)}
                    title={collapsed ? p.label : undefined}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition w-full text-left ${
                      active
                        ? 'bg-emerald-600/90 text-white shadow-xs font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'} ${collapsed ? 'mx-auto' : ''}`} />
                    {!collapsed && <span className="truncate">{p.label}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Disclaimer Card at Sidebar Bottom */}
        {!collapsed && (
          <div className="p-3 border-t border-slate-800 shrink-0 bg-slate-950/40">
            <p className="text-[10px] leading-relaxed text-slate-400">
              Research prototype on a dataset of unverified origin. Not a diagnostic tool.
            </p>
          </div>
        )}
      </aside>

      {/* Main Content Viewport */}
      <div
        style={{ marginLeft: sidebarWidth }}
        className="transition-all duration-200 flex-1 pt-16 min-h-screen flex flex-col"
      >
        <main className="mx-auto w-full max-w-7xl px-6 py-7 flex-1">
          {/* Clinical Breadcrumb Trail */}
          <nav aria-label="Breadcrumbs" className="mb-6 flex items-center justify-between text-xs text-slate-500 border-b border-slate-200/60 pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/overview')}
                className="font-medium text-slate-500 hover:text-emerald-700 transition"
              >
                AyurSimilarity Portal
              </button>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="font-medium text-slate-500">
                {activeNavItem?.section || 'Research Analytics'}
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="font-semibold text-emerald-900 bg-emerald-50/90 border border-emerald-200/80 rounded-md px-2 py-0.5 shadow-2xs">
                {activeNavItem?.label || 'Overview'}
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Verified Cohort Mode
              </span>
              <span>·</span>
              <span className="num font-mono">1,200 Cases</span>
            </div>
          </nav>

          {state.loading && (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 shadow-xs">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent mb-3" />
              <div>Loading verified benchmark models from <code className="num font-mono">/data/</code>...</div>
            </div>
          )}

          {state.error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-xs">
              Error loading benchmark files: {state.error}. Run{' '}
              <code className="num font-mono">python python_benchmark/export_ui_data.py</code>.
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
                    realCases={state.payload.realCases}
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
