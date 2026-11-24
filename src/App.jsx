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
  const [commandOpen, setCommandOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSectionFilter, setActiveSectionFilter] = useState('ALL'); // 'ALL' or section title
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
    <div className="min-h-screen bg-[#f7f3ed] text-[#2b221a] flex flex-col font-sans selection:bg-[#e4d7c6] selection:text-[#2b221a]">
      {/* Executive Top Navigation Header (Sticky, Full-Width, Glassmorphic) */}
      <header className="sticky top-0 z-30 w-full bg-[#faf7f2]/95 backdrop-blur-md border-b border-[#e2d5c3]/80 shadow-xs transition-all">
        {/* Tier 1: Platform Branding & Primary Actions */}
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/overview')}
              className="flex items-center gap-2.5 text-left group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3d3126] text-[#faf7f2] font-extrabold text-sm shadow-sm group-hover:bg-[#282019] transition">
                AY
              </div>
              <div>
                <div className="text-xs font-bold tracking-tight text-[#2b221a] uppercase leading-tight group-hover:text-amber-900 transition">
                  AyurSimilarity
                </div>
                <div className="text-[10px] text-[#786655] font-medium leading-none">
                  Clinical Intelligence Platform
                </div>
              </div>
            </button>

            <span className="text-[#d8cbb9] hidden sm:inline">|</span>

            <div className="hidden sm:flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-600 ring-4 ring-emerald-100 animate-pulse" />
              <span className="rounded-full bg-[#ede4d8] border border-[#d8cabb] px-3 py-0.5 text-xs font-semibold text-[#4a3a2d]">
                N = <span className="num">1200</span> Records · <span className="num">29</span> Traits
              </span>
            </div>
          </div>

          {/* Quick Actions & Command Center */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-[#dccfbf] bg-white/75 px-3.5 py-1.5 text-xs text-[#6e5b4b] hover:bg-white hover:text-[#2b221a] transition shadow-2xs"
            >
              <Search className="h-3.5 w-3.5 text-[#8c7866]" />
              <span className="hidden md:inline">Search analytics, metrics, patients...</span>
              <span className="md:hidden">Search</span>
              <kbd className="rounded-full border border-[#cfbeab] bg-[#f7f3ed] px-2 py-0.5 text-[10px] font-semibold text-[#5c4a3b] shadow-2xs">
                ⌘K
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => navigate('/workbench')}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#3d3126] hover:bg-[#282019] px-4 py-1.5 text-xs font-semibold text-[#fbf8f4] transition shadow-sm"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Intake &amp; Predict</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/reports')}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#dccfbf] bg-white/80 hover:bg-white px-3.5 py-1.5 text-xs font-medium text-[#5c4a3b] transition shadow-xs"
            >
              <FileDown className="h-3.5 w-3.5 text-[#7c6957]" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Tier 2: Horizontal Segmented Glass Navigation Ribbon */}
        <div className="border-t border-[#ebe0d3] bg-[#f5ede2]/80 px-4 sm:px-6 lg:px-8 py-2 overflow-x-auto no-scrollbar">
          <div className="mx-auto w-full max-w-7xl flex items-center justify-between gap-4 min-w-max">
            {/* Section Category Pills */}
            <div className="flex items-center gap-1">
              {NAV_SECTIONS.map((sec) => {
                const isSectionActive = activeNavItem?.section === sec.title;
                return (
                  <div key={sec.title} className="flex items-center">
                    <div className="flex items-center gap-1 bg-white/50 p-0.5 rounded-full border border-[#e2d5c3]">
                      {sec.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentPath === item.path;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => navigate(item.path)}
                            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                              isActive
                                ? 'bg-[#3d3126] text-[#faf7f2] font-semibold shadow-xs'
                                : 'text-[#6c5a4b] hover:bg-white/80 hover:text-[#2b221a]'
                            }`}
                          >
                            <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-amber-200' : 'text-[#8c7866]'}`} />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <span className="mx-1.5 text-[#d8cbb9] font-light">/</span>
                  </div>
                );
              })}
            </div>
          </div>
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
            className="w-full max-w-xl rounded-2xl border border-[#dccfbf] bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-[#e5dcce] px-4 py-3 bg-[#faf7f2]">
              <Search className="h-4 w-4 text-amber-800 shrink-0" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Jump to page, patient intake, or distance metrics..."
                className="w-full bg-transparent text-sm text-[#2b221a] placeholder-[#9c8978] focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => setCommandOpen(false)}
                className="rounded-full p-1 text-[#8c7866] hover:bg-[#ede3d5] hover:text-[#2b221a]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8c7866]">
                Clinical Modules &amp; Pages
              </div>
              {filteredCommandItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#806e5e]">
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
                      className="flex items-center justify-between w-full rounded-xl px-3 py-2 text-left text-xs hover:bg-[#f3ece0] hover:text-[#2b221a] transition group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 text-[#8c7866] group-hover:text-amber-900" />
                        <span className="font-semibold text-[#3b2d21] group-hover:text-[#2b221a]">
                          {it.label}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#8c7866] group-hover:text-amber-800">
                        {it.section}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="border-t border-[#ede4d8] bg-[#faf7f2] px-4 py-2 flex items-center justify-between text-[11px] text-[#786655]">
              <div className="flex items-center gap-2">
                <span>Select</span>
                <kbd className="rounded border border-[#dccfbf] bg-white px-1 py-0.5 text-[9px] font-mono shadow-2xs">Enter</kbd>
                <span>Close</span>
                <kbd className="rounded border border-[#dccfbf] bg-white px-1 py-0.5 text-[9px] font-mono shadow-2xs">Esc</kbd>
              </div>
              <span className="text-[10px] text-amber-900 font-bold">AyurSimilarity Engine</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Full-Width Content Viewport (Zero Left Sidebar Margin) */}
      <div className="flex-1 w-full min-h-screen flex flex-col">
        <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex-1">
          {/* Clinical Breadcrumb Trail */}
          <nav aria-label="Breadcrumbs" className="mb-5 flex items-center justify-between text-xs text-[#786655] border-b border-[#e5dcce] pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/overview')}
                className="font-medium text-[#786655] hover:text-[#2b221a] transition"
              >
                AyurSimilarity Portal
              </button>
              <ChevronRight className="h-3.5 w-3.5 text-[#b09e8c] shrink-0" />
              <span className="font-medium text-[#786655]">
                {activeNavItem?.section || 'Research Analytics'}
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-[#b09e8c] shrink-0" />
              <span className="font-semibold text-[#2b221a] bg-white/80 border border-[#dfd3c3] rounded-full px-2.5 py-0.5 shadow-2xs">
                {activeNavItem?.label || 'Overview'}
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-3 text-[11px] text-[#786655]">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
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
                    descriptive={state.payload.descriptive}
                    clusteringsData={state.payload.clusteringsData}
                    embeddingsData={state.payload.embeddingsData}
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

        {/* Global Research Prototype Footer (Rule R11) */}
        <footer className="w-full border-t border-[#e2d5c3]/80 bg-[#faf7f2]/90 backdrop-blur-md py-4 px-4 sm:px-6 lg:px-8 mt-auto">
          <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#786655]">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-amber-600" />
              <span>AyurSimilarity Research Platform</span>
              <span className="text-[#c7b7a5]">·</span>
              <span>Categorical Parity Benchmark</span>
            </div>
            <p className="text-[11px] text-[#857362] text-center sm:text-right">
              Research prototype on a dataset of unverified origin. Not a diagnostic tool.
            </p>
          </div>
        </footer>
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
