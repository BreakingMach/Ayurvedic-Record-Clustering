import React from 'react';
import OverviewSection from './components/OverviewSection';
import DataSection from './components/DataSection';
import ResultsSection from './components/ResultsSection';
import RetrievalDemoSection from './components/RetrievalDemoSection';
import LimitationsLiteratureSection from './components/LimitationsLiteratureSection';

const SECTIONS = [
  { id: 'overview', label: '1. Overview' },
  { id: 'data', label: '2. Data' },
  { id: 'results', label: '3. Results' },
  { id: 'retrieval', label: '4. Retrieval Demo' },
  { id: 'limitations', label: '5. Limitations & Literature' },
];

export default function App() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-neutral-900">
      {/* Minimal Sticky Article Navigation */}
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a href="#overview" className="text-sm font-semibold tracking-tight text-neutral-900">
            Ayurvedic Distance Benchmark
          </a>
          <nav className="flex flex-wrap items-center gap-1 sm:gap-4">
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

      {/* Single-Column Paper-Like Flow */}
      <main className="mx-auto max-w-5xl space-y-12 px-4 py-8 sm:px-6 sm:py-10">
        <OverviewSection />
        <DataSection />
        <ResultsSection />
        <RetrievalDemoSection />
        <LimitationsLiteratureSection />
      </main>
    </div>
  );
}
