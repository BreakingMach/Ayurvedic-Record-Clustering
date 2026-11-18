import React, { useEffect, useState } from 'react';
import OverviewPage from './components/OverviewPage';
import WorkbenchPage from './components/WorkbenchPage';
import DataPage from './components/DataPage';
import MethodPage from './components/MethodPage';
import ResultsPage from './components/ResultsPage';
import RetrievalPage from './components/RetrievalPage';
import LimitationsPage from './components/LimitationsPage';
import { parseCsvSummary } from './utils/distanceEngine';

const PAGES = [
  { id: 'overview', label: 'Overview' },
  { id: 'workbench', label: 'Workbench' },
  { id: 'data', label: 'Data' },
  { id: 'method', label: 'Method' },
  { id: 'results', label: 'Results' },
  { id: 'retrieval', label: 'Retrieval' },
  { id: 'limitations', label: 'Limitations' },
];

export default function App() {
  const [activePage, setActivePage] = useState('overview');
  const [state, setState] = useState({ loading: true, error: null, payload: null });

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [realRes, synthRes, expertRes, casesRes, synthCsvRes] = await Promise.all([
          fetch('/data/real_data.json'),
          fetch('/data/synthetic.json'),
          fetch('/data/expert_review.json'),
          fetch('/data/real_cases.json'),
          fetch('/data/synthetic_cases_default.csv'),
        ]);

        for (const res of [realRes, synthRes, expertRes, casesRes, synthCsvRes]) {
          if (!res.ok) throw new Error(`Failed to fetch ${res.url} (HTTP ${res.status})`);
        }

        const [realData, syntheticData, expertReview, realCases, synthCsvText] = await Promise.all(
          [
            realRes.json(),
            synthRes.json(),
            expertRes.json(),
            casesRes.json(),
            synthCsvRes.text(),
          ]
        );

        const synthCsvSummary = parseCsvSummary(synthCsvText);
        if (mounted) {
          setState({
            loading: false,
            error: null,
            payload: { realData, syntheticData, expertReview, realCases, synthCsvSummary },
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
    <div className="min-h-screen bg-[#FAFAFA] text-neutral-900">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <span className="text-sm font-semibold tracking-tight text-neutral-900">
            Ayurvedic Distance Benchmark
          </span>

          <nav className="flex flex-wrap items-center gap-1" aria-label="Primary pages">
            {PAGES.map((p) => {
              const active = activePage === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActivePage(p.id)}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? 'bg-teal-50 text-teal-800 ring-1 ring-teal-700/30'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

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
          <>
            {activePage === 'overview' && (
              <OverviewPage
                realData={state.payload.realData}
                syntheticData={state.payload.syntheticData}
                expertReview={state.payload.expertReview}
                onNavigate={(pageId) => setActivePage(pageId)}
              />
            )}
            {activePage === 'workbench' && <WorkbenchPage />}
            {activePage === 'data' && (
              <DataPage
                realData={state.payload.realData}
                realCases={state.payload.realCases}
                synthCsvSummary={state.payload.synthCsvSummary}
              />
            )}
            {activePage === 'method' && (
              <MethodPage
                realData={state.payload.realData}
                syntheticData={state.payload.syntheticData}
              />
            )}
            {activePage === 'results' && (
              <ResultsPage
                realData={state.payload.realData}
                syntheticData={state.payload.syntheticData}
              />
            )}
            {activePage === 'retrieval' && <RetrievalPage realCases={state.payload.realCases} />}
            {activePage === 'limitations' && (
              <LimitationsPage expertReview={state.payload.expertReview} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
