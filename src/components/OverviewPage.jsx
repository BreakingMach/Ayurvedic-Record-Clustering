import React from 'react';
import { ExternalLink } from 'lucide-react';
import { STUDY_METADATA } from '../data/literatureData';

function fmt(v, digits = 4) {
  return typeof v === 'number' ? v.toFixed(digits) : '—';
}

export default function OverviewPage({ realData, syntheticData, expertReview }) {
  const realMeta = realData.provenance.dataset_metadata;
  const geEquiv = realData.equivalence.find(
    (e) => e.metric_a === 'gower' && e.metric_b === 'euclidean'
  );
  const d0Cell = syntheticData.cells[syntheticData.sweeps.numeric_cohens_d.cell_ids[0]];
  const d2Cell =
    syntheticData.cells[
      syntheticData.sweeps.numeric_cohens_d.cell_ids[
        syntheticData.sweeps.numeric_cohens_d.cell_ids.length - 1
      ]
    ];
  const out05Cell = syntheticData.cells[syntheticData.sweeps.outlier_fraction.cell_ids[1]];

  return (
    <div className="space-y-6">
      <div className="space-y-4 border-b border-neutral-200 pb-6">
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
            GitHub Repository
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <h1 className="max-w-4xl text-2xl font-semibold tracking-tight text-neutral-900">
          {STUDY_METADATA.title}
        </h1>

        <div className="inline-flex items-center rounded border border-neutral-300 bg-white px-3 py-1 text-xs font-medium text-neutral-800">
          {expertReview.display_label}
        </div>
      </div>

      {/* Problem & Scope */}
      <div className="paper-card p-6 space-y-4">
        <h2 className="text-base font-semibold text-neutral-900">Problem Statement</h2>
        <p className="text-sm leading-relaxed text-neutral-600">
          We consolidate mixed categorical–numerical Ayurvedic case attributes, benchmark{' '}
          <strong>Gower</strong>, <strong>Euclidean</strong>, and <strong>Cosine</strong> distances
          for similarity-based grouping and retrieval, and validate metric choice against
          diagnostic categories. The three-distance benchmark is the primary focus; Mutual
          Information weighting, hybrid distances, and spectral clustering are optional and
          treated strictly as <strong>EXPLORATORY</strong>.
        </p>
      </div>

      {/* Findings Summary Generated from JSON */}
      <div className="paper-card p-6 space-y-4">
        <h2 className="text-base font-semibold text-neutral-900">Empirical Summary</h2>
        <p className="text-sm leading-relaxed text-neutral-700">
          On the real dataset (<code className="num text-xs">{realMeta.csv_member}</code>, which
          contains <span className="num">{realMeta.n_categorical}</span> categorical traits and{' '}
          <span className="num">{realMeta.n_numeric}</span> numeric columns), Gower, Euclidean
          (one-hot), and Cosine (one-hot) are rank-equivalent (Spearman{' '}
          <span className="num">ρ = {fmt(geEquiv?.spearman_rho, 6)}</span>, top-5 neighbour overlap{' '}
          <span className="num">{fmt(geEquiv?.mean_top5_overlap, 4)}</span>). In the controlled{' '}
          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-neutral-800">
            SIMULATED
          </span>{' '}
          mixed-type benchmark, metric superiority shifts by regime: <strong>Gower</strong> is the
          unique Holm-significant winner on every metric when numeric vitals carry no signal
          (winner at <span className="num">d = 0</span>:{' '}
          <strong className="capitalize">{d0Cell.winners.knn_macro_f1}</strong>) and wins
          average-linkage ARI under numeric outliers (winner:{' '}
          <strong className="capitalize">{out05Cell.winners.ari_average}</strong>), whereas{' '}
          <strong>Cosine</strong> leads kNN macro-F1 when numeric class separation is strong
          (winner at <span className="num">d = 2</span>:{' '}
          <strong className="capitalize">{d2Cell.winners.knn_macro_f1}</strong>).
        </p>
      </div>

      {/* Provenance & Limitation Notice */}
      <div className="paper-card p-6 space-y-4">
        <h2 className="text-base font-semibold text-neutral-900">
          Data Provenance &amp; Scope Notice
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-neutral-600">
          <li>
            <strong>Source &amp; unverified provenance:</strong> Real categorical records come from
            Kaggle (<code className="num text-xs">{realMeta.kaggle_slug}</code>). Origin, license,
            and who assigned the labels are not stated; all labels in the CSV are referred to as{' '}
            <strong>dataset-provided Dosha labels</strong>, never practitioner-assigned.
          </li>
          <li>
            <strong>Deterministic label structure:</strong> No identical feature rows carry
            conflicting labels in the CSV, and labels behave as a deterministic function of the
            categorical traits.
          </li>
          <li>
            <strong>Simulated mixed-data experiments:</strong> All mixed numeric–categorical
            results carry a <strong>SIMULATED</strong> badge; <code className="num text-xs">latent_class</code>{' '}
            is simulation ground truth by construction and describes the generator rather than real
            patients.
          </li>
        </ul>
      </div>
    </div>
  );
}
