import React from 'react';
import { ExternalLink } from 'lucide-react';
import { STUDY_METADATA } from '../data/literatureData';
import benchmarkData from '../data/realBenchmarkResults.json';

export default function OverviewSection() {
  const { meta } = benchmarkData;

  return (
    <section id="overview" className="scroll-mt-20 space-y-6">
      <div className="space-y-3 border-b border-neutral-200 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
          <span>
            {STUDY_METADATA.author} ({STUDY_METADATA.regNo}) · {STUDY_METADATA.program},{' '}
            {STUDY_METADATA.institution} · Supervised by {STUDY_METADATA.supervisor}
          </span>
          <a
            href={STUDY_METADATA.repoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium text-teal-700 hover:underline"
          >
            Repository
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <h1 className="max-w-4xl text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
          {STUDY_METADATA.title}
        </h1>

        <p className="max-w-3xl text-sm leading-relaxed text-neutral-600">
          Clinical Ayurvedic patient records combine continuous physiological vitals with
          high-cardinality categorical <em>Pariksha</em> (examination) traits. We benchmark
          Gower, Euclidean (Z-score + one-hot), Cosine, Hamming, and a modality-decoupled
          Gower–Cosine hybrid across both uniform and train-only Mutual Information (MI)
          weighting under strict leak-free repeated stratified group cross-validation.
        </p>

        <div className="rounded-md border border-teal-200 bg-teal-50/60 px-4 py-3 text-sm text-neutral-800">
          <span className="font-semibold text-teal-900">Key finding: </span>
          Under uniform weighting ({meta.nRepeats}×{meta.nFolds} repeated group CV, zero clone
          leakage), Gower significantly outperforms Euclidean and Cosine on held-out Macro mAP (
          <span className="num font-medium">46.2%</span> vs{' '}
          <span className="num font-medium">43.6%</span>,{' '}
          <span className="num">p = 0.0001</span>; and{' '}
          <span className="num font-medium">44.9%</span>,{' '}
          <span className="num">p = 0.0215</span>). Adding train-only MI weighting lifts every
          metric by <span className="num">+2.7–4.9 pp</span> by suppressing 9 randomized
          lifestyle noise columns, whereas the Gower–Cosine hybrid offers no statistically
          significant improvement over Weighted Gower (<span className="num">p = 0.2544</span>,
          Spearman <span className="num">ρ = 0.999</span>).
        </div>
      </div>

      {/* Honest Data Provenance & Evaluation Scope Note */}
      <div className="paper-card p-5">
        <h2 className="text-sm font-semibold text-neutral-900">
          Data Provenance &amp; Scope Disclosure
        </h2>
        <div className="mt-2.5 grid grid-cols-1 gap-4 text-xs leading-relaxed text-neutral-600 md:grid-cols-3">
          <div>
            <p className="font-medium text-neutral-900">1. Dataset origin &amp; deduplication</p>
            <p className="mt-1">
              The 29 categorical traits and 6 <em>Dosha</em> labels come from the public{' '}
              <code className="num text-[11px] text-neutral-800">
                Updated_Prakriti_With_Features.csv
              </code>{' '}
              file (<span className="num">N = {meta.nTotal.toLocaleString()}</span> rows).
              Direct audit shows these 1,200 rows are{' '}
              <span className="num font-medium text-neutral-800">
                {meta.nUniqueProfiles} unique 20-trait profiles replicated {meta.replicatesPerProfile}×
              </span>{' '}
              with 9 randomized lifestyle columns appended. All CV splits are grouped by base
              profile so no clone can appear in both train and test sets.
            </p>
          </div>
          <div>
            <p className="font-medium text-neutral-900">2. Simulated continuous vitals</p>
            <p className="mt-1">
              Because the public CSV contains questionnaire responses only, 4 continuous vitals (
              <code className="num text-[11px]">Age_Vaya</code>,{' '}
              <code className="num text-[11px]">BMI</code>,{' '}
              <code className="num text-[11px]">Systolic_BP</code>,{' '}
              <code className="num text-[11px]">Pulse_Rate</code>) are simulated from observable
              physical columns (<em>Body Size</em>, <em>Body Weight</em>,{' '}
              <em>Physical Activity Level</em>) only — never conditioned on the{' '}
              <em>Dosha</em> label — to test mixed-modality behavior without label leakage.
            </p>
          </div>
          <div>
            <p className="font-medium text-neutral-900">3. Prakriti vs. clinical diagnosis</p>
            <p className="mt-1">
              The target label is constitutional <em>Prakriti</em> (lifelong phenotype), not
              acute <em>Vikriti</em> (clinical morbidity). Standardized coding initiatives such
              as the Ministry of AYUSH NAMASTE portal motivate mixed-record clinical retrieval,
              but this benchmark dataset is an independent public corpus and is{' '}
              <strong className="font-medium text-neutral-800">not</strong> sourced from
              NAMASTE.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
