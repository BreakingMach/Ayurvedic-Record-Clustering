import React, { useEffect, useState } from 'react';
import OverviewSection from './components/OverviewSection';
import DataAuditSection from './components/DataAuditSection';
import RealBenchmarkSection from './components/RealBenchmarkSection';
import SyntheticBenchmarkSection from './components/SyntheticBenchmarkSection';
import RetrievalSimulatorSection from './components/RetrievalSimulatorSection';
import ExpertAndLimitationsSection from './components/ExpertAndLimitationsSection';

const SECTIONS = [
  { id: 'overview', label: '1. Overview' },
  { id: 'data', label: '2. Data Audit' },
  { id: 'real-benchmark', label: '3. Real Data (Exp. A)' },
  { id: 'synthetic-benchmark', label: '4. Synthetic (Exp. B)' },
  { id: 'retrieval', label: '5. Retrieval' },
  { id: 'expert-limitations', label: '6. Review & Limits' },
];

export default function App() {
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    let active = true;
    async function loadAll() {
      try {
        const [realData, syntheticData, expertReview, realCases, syntheticCases] =
          await Promise.all(
            [
              '/data/real_data.json',
              '/data/synthetic.json',
              '/data/expert_review.json',
              '/data/real_cases.json',
              '/data/synthetic_cases_default.json',
            ].map(async (url) => {
              const res = await fetch(url);
              if (!res.ok) throw new Error(`Failed to load ${url} (HTTP ${res.status})`);
              return res.json();
            })
          );
        if (active) {
          setState({
            loading: false,
            error: null,
            data: { realData, syntheticData, expertReview, realCases, syntheticCases },
          });
        }
      } catch (err) {
        if (active) setState({ loading: false, error: err.message, data: null });
      }
    }
    loadAll();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-neutral-900">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a href="#overview" className="text-sm font-semibold tracking-tight text-neutral-900">
            Ayurvedic Distance Benchmark
          </a>
          <nav className="flex flex-wrap items-center gap-1 sm:gap-3">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded px-2 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-teal-800"
              >
                {s.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-12 px-4 py-8 sm:px-6 sm:py-10">
        {state.loading && (
          <div className="paper-card p-6 text-sm text-neutral-600">
            Loading benchmark JSON artifacts from <code className="num">/data/*.json</code>...
          </div>
        )}
        {state.error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            Error loading benchmark JSON: {state.error}. Run{' '}
            <code className="num">python python_benchmark/export_ui_assets.py</code> first.
          </div>
        )}
        {state.data && (
          <>
            <OverviewSection
              realData={state.data.realData}
              syntheticData={state.data.syntheticData}
              expertReview={state.data.expertReview}
            />
            <DataAuditSection
              realData={state.data.realData}
              realCases={state.data.realCases}
            />
            <RealBenchmarkSection realData={state.data.realData} />
            <SyntheticBenchmarkSection syntheticData={state.data.syntheticData} />
            <RetrievalSimulatorSection
              realCases={state.data.realCases}
              syntheticCases={state.data.syntheticCases}
            />
            <ExpertAndLimitationsSection expertReview={state.data.expertReview} />
          </>
        )}
      </main>
    </div>
  );
}
