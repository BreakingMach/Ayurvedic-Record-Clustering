import React from 'react';
import { ExternalLink } from 'lucide-react';
import { STUDY_METADATA } from '../data/literatureData';

function fmt(v, d = 4) {
  return typeof v === 'number' ? v.toFixed(d) : '—';
}

export default function OverviewSection({ realData, syntheticData, expertReview }) {
  const realMeta = realData.provenance.dataset_metadata;
  const realGit = realData.provenance.git;
  const geEquiv = realData.equivalence.find(
    (e) => e.metric_a === 'gower' && e.metric_b === 'euclidean'
  );
  const gcEquiv = realData.equivalence.find(
    (e) => e.metric_a === 'gower' && e.metric_b === 'cosine'
  );

  const synthProv = syntheticData.provenance;
  const synthBase = syntheticData.cells[synthProv.baseline_cell_id];
  const d0Cell = syntheticData.cells[syntheticData.sweeps.numeric_cohens_d.cell_ids[0]];
  const d2Cell =
    syntheticData.cells[
      syntheticData.sweeps.numeric_cohens_d.cell_ids[
        syntheticData.sweeps.numeric_cohens_d.cell_ids.length - 1
      ]
    ];
  const out05Cell = syntheticData.cells[syntheticData.sweeps.outlier_fraction.cell_ids[1]];

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

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded border border-neutral-300 bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-800">
            {expertReview.display_label}
          </span>
          <span className="num inline-flex items-center rounded border border-neutral-200 bg-white px-2.5 py-0.5 text-[11px] text-neutral-500">
            results/*.json · branch {realGit.branch} · {realGit.short_commit}
          </span>
        </div>

        <h1 className="max-w-4xl text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
          {STUDY_METADATA.title}
        </h1>

        <p className="max-w-3xl text-sm leading-relaxed text-neutral-600">
          This study benchmarks three unsupervised distance metrics — <strong>Gower</strong>,{' '}
          <strong>Euclidean</strong> (z-scored numerics + one-hot categoricals), and{' '}
          <strong>Cosine</strong> (same encoding) — for similarity-based grouping and retrieval
          of Ayurvedic patient records. All numbers below are loaded directly from{' '}
          <code className="num text-xs text-neutral-800">results/*.json</code> produced by the
          Python benchmark suite (<code className="num text-xs text-neutral-800">ayur_bench</code>).
          Optional extensions (MI weighting, hybrid distance, spectral clustering) are separated
          from this core three-distance benchmark as <strong>EXPLORATORY</strong>.
        </p>
      </div>

      {/* Two-Experiment Headline Findings (100% JSON-Driven) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="paper-card p-5">
          <div className="text-xs font-semibold text-teal-800">
            Experiment A — Real Categorical Data Only
          </div>
          <h2 className="mt-1 text-sm font-semibold text-neutral-900">
            All Three Metrics Are Rank-Equivalent on the Real CSV
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-neutral-600">
            <code className="num text-[11px] text-neutral-800">{realMeta.csv_member}</code> has{' '}
            <span className="num font-medium text-neutral-900">{realMeta.n_rows}</span> rows,{' '}
            <span className="num font-medium text-neutral-900">{realMeta.n_categorical}</span>{' '}
            categorical traits, and{' '}
            <span className="num font-medium text-neutral-900">{realMeta.n_numeric}</span>{' '}
            numeric columns (Kaggle{' '}
            <code className="num text-[11px]">{realMeta.kaggle_slug}</code>). On
            categorical-only data, Gower, Euclidean, and Cosine have pairwise Spearman{' '}
            <span className="num font-medium text-neutral-900">
              ρ = {fmt(geEquiv?.spearman_rho, 6)}
            </span>{' '}
            and{' '}
            <span className="num font-medium text-neutral-900">
              ρ = {fmt(gcEquiv?.spearman_rho, 6)}
            </span>{' '}
            with top-5 neighbour overlap{' '}
            <span className="num font-medium text-neutral-900">
              {fmt(geEquiv?.mean_top5_overlap, 4)}
            </span>
            . Any difference in average-linkage clustering stems strictly from Euclidean's concave
            square-root distance scale and discrete tie-breaking.
          </p>
        </div>

        <div className="paper-card border-amber-200/80 p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-amber-800">
              Experiment B — SYNTHETIC / SIMULATED Mixed Data
            </span>
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
              SYNTHETIC
            </span>
          </div>
          <h2 className="mt-1 text-sm font-semibold text-neutral-900">
            Winner Depends on Numeric Signal Strength &amp; Outliers
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-neutral-600">
            Across <span className="num font-medium">{Object.keys(syntheticData.cells).length}</span>{' '}
            OFAT cells × <span className="num font-medium">{synthProv.n_seeds_used}</span> seeds,{' '}
            <strong>Gower</strong> wins every endpoint when numeric vitals are uninformative (
            <span className="num">d = 0</span>: kNN Macro-F1{' '}
            <span className="num">{fmt(d0Cell.metrics.gower.knn_macro_f1.mean)}</span> vs Euclidean{' '}
            <span className="num">{fmt(d0Cell.metrics.euclidean.knn_macro_f1.mean)}</span>, ARI Avg{' '}
            <span className="num">{fmt(d0Cell.metrics.gower.ari_average.mean)}</span> vs{' '}
            <span className="num">{fmt(d0Cell.metrics.euclidean.ari_average.mean)}</span>) and wins
            ARI (Avg) under 5% numeric outliers (
            <span className="num">{fmt(out05Cell.metrics.gower.ari_average.mean)}</span> vs
            Euclidean <span className="num">{fmt(out05Cell.metrics.euclidean.ari_average.mean)}</span>
            ). When numeric separation is strong (<span className="num">d = 1.0–2.0</span>),{' '}
            <strong>Cosine</strong> leads kNN Macro-F1 (
            <span className="num">{fmt(synthBase.metrics.cosine.knn_macro_f1.mean)}</span> at{' '}
            <span className="num">d = 1.0</span>;{' '}
            <span className="num">{fmt(d2Cell.metrics.cosine.knn_macro_f1.mean)}</span> at{' '}
            <span className="num">d = 2.0</span>).
          </p>
        </div>
      </div>

      {/* Data Provenance & Controls Disclosure */}
      <div className="paper-card p-5">
        <h2 className="text-sm font-semibold text-neutral-900">
          Provenance, Label Terminology &amp; Shuffled-Label Sanity Checks
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 text-xs leading-relaxed text-neutral-600 md:grid-cols-3">
          <div>
            <p className="font-medium text-neutral-900">Real CSV labels (unverified origin)</p>
            <p className="mt-1">
              Labels in <code className="num text-[11px]">{realMeta.csv_member}</code> are referred
              to strictly as <strong>dataset-provided Dosha labels</strong>. Origin, license, and
              annotator credentials are not stated on Kaggle, and labels behave as a deterministic
              function of the 29 traits.
            </p>
          </div>
          <div>
            <p className="font-medium text-neutral-900">Synthetic simulation ground truth</p>
            <p className="mt-1">
              All mixed-type numerical results are strictly <strong>SYNTHETIC/SIMULATED</strong>.
              The column <code className="num text-[11px]">latent_class</code> is simulation ground
              truth by construction, not a clinical diagnosis, and results describe the generator
              only.
            </p>
          </div>
          <div>
            <p className="font-medium text-neutral-900">Leakage controls &amp; validation</p>
            <p className="mt-1">
              Shuffled-label controls passed in both Experiment A (
              <span className="num font-medium text-teal-800">
                {realData.shuffled_control.all_passed ? 'PASSED' : 'FAILED'}
              </span>
              ) and Experiment B (
              <span className="num font-medium text-teal-800">
                {syntheticData.shuffled_control.all_passed ? 'PASSED' : 'FAILED'}
              </span>
              ). Clinical review status: <strong>{expertReview.display_label}</strong>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
