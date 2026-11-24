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
  FileDown,
  UserPlus,
  ChevronRight,
  X,
} from 'lucide-react';
import OverviewPage from './components/OverviewPage';
import PatientRegistryPage from './components/PatientRegistryPage';
import BenchmarkLabPage from './components/BenchmarkLabPage';
import WorkbenchPage from './components/WorkbenchPage';
import DataPage from './components/DataPage';
import MethodPage from './components/MethodPage';
import ResultsPage from './components/ResultsPage';
import RetrievalPage from './components/RetrievalPage';
import DatasetAnalysisPage from './components/DatasetAnalysisPage';
import PatientAttributesPage from './components/PatientAttributesPage';
import MetricComparisonPage from './components/MetricComparisonPage';
import PatientClusteringPage from './components/PatientClusteringPage';
import DiagnosticValidationPage from './components/DiagnosticValidationPage';
import ReportsExportPage from './components/ReportsExportPage';
import { parseCsvSummary } from './utils/distanceEngine';

export const TOP_TABS = [
  { id: 'workbench', label: 'Similarity Workbench', path: '/workbench', section: 'Clinical PCRMS', icon: UserPlus },
  { id: 'registry', label: 'Patient Case Registry', path: '/registry', section: 'Cohort Directory', icon: Database },
  { id: 'lab', label: 'ML Benchmark & Validation Lab', path: '/lab', section: 'Analytics & Proofs', icon: FlaskConical },
];

const NAV_SECTIONS = [
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
      { id: 'reports',     path: '/reports',     label: 'Reports & Export',       icon: FileDown },
    ],
  },
];

function AppLayout({ state }) {
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

  // Find active item (Workbench is default root view)
  const currentPath = location.pathname === '/' ? '/workbench' : location.pathname;

  // Combine 3 primary PCRMS tabs + secondary deep-dive routes for breadcrumbs & command search
  const allNavItems = [
    ...TOP_TABS,
    ...NAV_SECTIONS.flatMap((sec) =>
      sec.items
        .filter((it) => !TOP_TABS.some((t) => t.path === it.path))
        .map((it) => ({ ...it, section: sec.title }))
    ),
  ];
  const activeNavItem =
    TOP_TABS.find((t) => t.path === currentPath) ||
    allNavItems.find((it) => it.path === currentPath) ||
    TOP_TABS[0];

  // Filter items in command palette
  const filteredCommandItems = allNavItems.filter((it) =>
    it.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    it.section.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F3EADF] via-[#EFE5D8] to-[#E8DED1] text-[#40382F] flex flex-col font-sans selection:bg-[#C3A989]/30 selection:text-[#40382F]">
      {/* Executive Top Navigation Header (Sticky, Full-Width, Glassmorphic, Clean 3-Tab PCRMS Nav) */}
      <header className="sticky top-0 z-30 w-full bg-[#F3EADF]/90 backdrop-blur-md border-b border-white/70 shadow-[0_4px_20px_-4px_rgba(150,125,99,0.12)] transition-all">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Brand Identity */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/workbench')}
              className="flex items-center gap-2.5 text-left group shrink-0"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/85 border border-[#C3A989]/50 p-1 shadow-2xs group-hover:opacity-95 transition shrink-0">
                <img
                  src="/logo.png"
                  alt="AyurSimilarity PCRMS Logo"
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <div className="text-xs font-bold tracking-tight text-[#40382F] uppercase leading-tight group-hover:text-[#967D63] transition">
                  AyurSimilarity PCRMS
                </div>
                <div className="text-[10px] text-[#827568] font-medium leading-none">
                  Ayurvedic Clinical Intelligence
                </div>
              </div>
            </button>

            <span className="text-[#C3A989] hidden xl:inline">|</span>

            <div className="hidden xl:flex items-center gap-2 shrink-0">
              <span className="flex h-2 w-2 rounded-full bg-[#967D63] ring-4 ring-[#E8DED1] shrink-0" />
              <span className="whitespace-nowrap rounded-full bg-white/65 border border-white/80 px-2.5 py-0.5 text-[11px] font-semibold text-[#40382F] shadow-2xs">
                N = <span className="num">1200</span> · <span className="num">29</span> Traits
              </span>
            </div>
          </div>

          {/* Clean 3-Tab Top Navigation Bar */}
          <nav
            aria-label="Primary navigation"
            className="order-3 lg:order-2 w-full lg:w-auto flex flex-wrap items-center justify-center gap-1 bg-white/60 backdrop-blur-sm p-1 rounded-2xl sm:rounded-full border border-white/80 shadow-2xs"
          >
            {TOP_TABS.map((tab) => {
              const Icon = tab.icon;
              const isTabActive =
                (tab.id === 'workbench' && (currentPath === '/' || currentPath === '/workbench')) ||
                (tab.id === 'registry' && ['/registry', '/data', '/retrieval'].includes(currentPath)) ||
                (tab.id === 'lab' &&
                  [
                    '/lab',
                    '/overview',
                    '/comparison',
                    '/results',
                    '/clustering',
                    '/dataset',
                    '/attributes',
                    '/validation',
                    '/method',
                    '/reports',
                  ].includes(currentPath));
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => navigate(tab.path)}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition whitespace-nowrap ${
                    isTabActive
                      ? 'bg-[#40382F] text-[#F3EADF] font-semibold shadow-xs'
                      : 'text-[#6A5E52] hover:bg-white/90 hover:text-[#40382F]'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${isTabActive ? 'text-[#C3A989]' : 'text-[#967D63]'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Compact Utility Actions */}
          <div className="order-2 lg:order-3 flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/70 px-3 py-1.5 text-xs text-[#827568] hover:bg-white hover:text-[#40382F] transition shadow-2xs"
              title="Quick jump across tabs & modules"
            >
              <Search className="h-3.5 w-3.5 text-[#967D63]" />
              <span className="hidden sm:inline">Quick Jump</span>
              <kbd className="hidden md:inline rounded-full border border-[#C3A989]/50 bg-[#F3EADF] px-2 py-0.5 text-[10px] font-mono font-semibold text-[#40382F] whitespace-nowrap">
                Ctrl+K
              </kbd>
            </button>
          </div>
        </div>
      </header>

      {/* Global Command Palette Modal */}
      {commandOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-24 bg-[#40382F]/35 backdrop-blur-xs p-4"
          onClick={() => setCommandOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-white/80 bg-[#F3EADF]/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-[#C3A989]/30 px-4 py-3 bg-white/60">
              <Search className="h-4 w-4 text-[#967D63] shrink-0" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Jump to page, patient intake, or distance metrics..."
                className="w-full bg-transparent text-sm text-[#40382F] placeholder-[#827568] focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => setCommandOpen(false)}
                aria-label="Close search"
                className="rounded-full p-1 text-[#827568] hover:bg-[#E8DED1] hover:text-[#40382F]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#827568]">
                Clinical Modules &amp; Pages
              </div>
              {filteredCommandItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#827568]">
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
                      className="flex items-center justify-between w-full rounded-xl px-3 py-2 text-left text-xs hover:bg-white/75 hover:text-[#40382F] transition group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 text-[#967D63] group-hover:text-[#40382F]" />
                        <span className="font-semibold text-[#40382F]">
                          {it.label}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#827568] group-hover:text-[#967D63]">
                        {it.section}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="border-t border-[#C3A989]/25 bg-white/50 px-4 py-2 flex items-center justify-between text-[11px] text-[#827568]">
              <div className="flex items-center gap-2">
                <span>Select</span>
                <kbd className="rounded border border-[#C3A989]/50 bg-white px-1 py-0.5 text-[9px] font-mono shadow-2xs">Enter</kbd>
                <span>Close</span>
                <kbd className="rounded border border-[#C3A989]/50 bg-white px-1 py-0.5 text-[9px] font-mono shadow-2xs">Esc</kbd>
              </div>
              <span className="text-[10px] text-[#967D63] font-bold">AyurSimilarity Engine</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Full-Width Content Viewport */}
      <div className="flex-1 w-full min-h-screen flex flex-col">
        <main className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 py-5 flex-1">
          {/* Clinical Breadcrumb Trail */}
          <nav aria-label="Breadcrumbs" className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[#827568] border-b border-[#C3A989]/30 pb-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => navigate('/workbench')}
                className="font-medium text-[#827568] hover:text-[#40382F] transition"
              >
                AyurSimilarity PCRMS
              </button>
              <ChevronRight className="h-3.5 w-3.5 text-[#C3A989] shrink-0" />
              <span className="font-semibold text-[#40382F] bg-white/75 border border-white/80 rounded-full px-2.5 py-0.5 shadow-2xs">
                {activeNavItem?.label || 'Similarity Workbench'}
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-3 text-[11px] text-[#827568]">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#967D63]" />
                Verified Cohort Mode
              </span>
              <span>·</span>
              <span className="num font-mono">1,200 Cases</span>
            </div>
          </nav>

          {state.loading && (
            <div className="glass-panel rounded-2xl p-8 text-center text-sm text-[#827568]">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#967D63] border-t-transparent mb-3" />
              <div>Loading verified benchmark models from <code className="num font-mono text-[#40382F]">/data/</code>...</div>
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
              <Route path="/" element={<Navigate to="/workbench" replace />} />
              <Route
                path="/workbench"
                element={
                  <WorkbenchPage
                    realData={state.payload.realData}
                    realCases={state.payload.realCases}
                  />
                }
              />
              <Route
                path="/registry"
                element={
                  <PatientRegistryPage
                    realData={state.payload.realData}
                    realCases={state.payload.realCases}
                    synthRecords={state.payload.synthRecords}
                    synthCsvSummary={state.payload.synthCsvSummary}
                  />
                }
              />
              <Route
                path="/lab"
                element={
                  <BenchmarkLabPage
                    realData={state.payload.realData}
                    syntheticData={state.payload.syntheticData}
                    expertReview={state.payload.expertReview}
                    realCases={state.payload.realCases}
                    descriptive={state.payload.descriptive}
                    missingnessData={state.payload.missingnessData}
                    scalingAblation={state.payload.scalingAblation}
                    clusteringsData={state.payload.clusteringsData}
                    embeddingsData={state.payload.embeddingsData}
                  />
                }
              />
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
                    descriptive={state.payload.descriptive}
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
                path="/reports"
                element={
                  <ReportsExportPage
                    realData={state.payload.realData}
                    syntheticData={state.payload.syntheticData}
                    missingnessData={state.payload.missingnessData}
                  />
                }
              />
              <Route path="*" element={<Navigate to="/workbench" replace />} />
            </Routes>
          )}
        </main>

        {/* Global Application Footer */}
        <footer className="w-full border-t border-white/70 bg-[#F3EADF]/85 backdrop-blur-md py-3.5 px-4 sm:px-6 lg:px-8 mt-auto">
          <div className="mx-auto max-w-[1440px] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#827568]">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-[#967D63]" />
              <span className="font-medium text-[#40382F]">AyurSimilarity PCRMS</span>
              <span className="text-[#C3A989]">·</span>
              <span>Categorical Parity Benchmark</span>
            </div>
            <p className="text-xs text-[#6A5E52] font-medium text-center sm:text-right">
              Researched on the Tridosha dataset.
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
          synthRecordsRes,
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
          fetch('/data/synthetic_records.json'),
        ]);

        for (const res of [
          realRes, synthRes, expertRes, casesRes, synthCsvRes,
          descriptiveRes, missingnessRes, scalingAblationRes, clusteringsRes, embeddingsRes, synthRecordsRes,
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
          synthRecords,
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
          synthRecordsRes.json(),
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
              synthRecords,
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
