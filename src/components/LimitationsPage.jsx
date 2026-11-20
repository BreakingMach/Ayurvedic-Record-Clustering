import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { LITERATURE_REVIEW } from '../data/literatureData';

const CONTEXT_LIMITATIONS = [
  {
    title: 'Unverified dataset provenance and label origin',
    body: 'The real CSV (Kaggle adityaprashantshirke/prakriti-updated) does not state its origin, license, or who assigned the labels. Labels must therefore be treated as dataset-provided Dosha labels, never practitioner-assigned clinical diagnoses.',
  },
  {
    title: 'Labels behave as a deterministic function of the traits',
    body: 'No identical feature rows carry conflicting labels, and a random forest achieves ceiling cross-validation accuracy from the categorical traits alone. High nearest-neighbour accuracy reflects that deterministic mapping rather than clinical difficulty.',
  },
  {
    title: 'No numeric columns in the real CSV',
    body: 'Because Updated_Prakriti_With_Features.csv contains categorical traits only, uniform Gower, one-hot Euclidean, and one-hot Cosine are exact monotone transforms of Hamming distance on the real dataset.',
  },
  {
    title: 'Synthetic mixed-data results describe the generator only',
    body: 'Experiment B evaluates controlled SIMULATED mixed-type cohorts where latent_class is ground truth by construction. Conclusions depend on the assumed generative distributions and cannot be extrapolated directly to real hospital cohorts.',
  },
  {
    title: 'Silhouette scores are not comparable across metrics',
    body: 'Each silhouette value is computed inside its own metric geometry and cannot be compared across Gower, Euclidean, and Cosine distance spaces.',
  },
  {
    title: 'Legacy notebook superseded due to label leakage',
    body: 'The original exploratory notebook (Notebook/Unsupervised.ipynb) is retained for provenance only with a top superseded notice; it contained label-shifted synthetic vitals and label-based model selection.',
  },
];

export default function LimitationsPage({ expertReview }) {
  const [litOpen, setLitOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredLit = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return LITERATURE_REVIEW;
    return LITERATURE_REVIEW.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.authors.toLowerCase().includes(q) ||
        p.domain.toLowerCase().includes(q) ||
        p.relevance.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Limitations</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Verified methodological caveats from <code className="num text-xs">docs/CONTEXT.md</code>{' '}
          and blinded practitioner review status.
        </p>
      </div>

      {/* Limitations Card */}
      <div className="paper-card p-6 space-y-4">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {CONTEXT_LIMITATIONS.map((item, idx) => (
            <div key={item.title} className="space-y-1 text-xs leading-relaxed">
              <div className="font-semibold text-neutral-900">
                <span className="num mr-1.5 text-teal-800">{idx + 1}.</span>
                {item.title}
              </div>
              <p className="text-neutral-600">{item.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Active Methodological Mitigations (Overcoming Limitations) */}
      <div className="paper-card p-6 space-y-4 border-l-4 border-l-teal-700">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">
            Engine Mitigations: How This Workbench Overcomes Identified Limitations
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            Active architectural controls, continuous modeling, and uncertainty quantification deployed to mitigate dataset constraints.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-3.5 space-y-1.5">
            <span className="font-semibold text-xs text-teal-900 flex items-center gap-1.5">
              1. Continuous Tri-Dosha Prakriti Mixture (vs. Discrete Buckets)
            </span>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Classical Ayurveda recognizes Prakriti as a continuous spectrum of Vata, Pitta, and Kapha rather than a discrete label. The engine computes distance-weighted kernel mixtures across retrieved neighbours, quantifying constitution as continuous biological percentages (% Vata · % Pitta · % Kapha).
            </p>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-3.5 space-y-1.5">
            <span className="font-semibold text-xs text-teal-900 flex items-center gap-1.5">
              2. Symmetrical Multi-Metric Consensus (vs. Metric Bias)
            </span>
            <p className="text-xs text-neutral-600 leading-relaxed">
              No single distance metric is assumed optimal. Gower (range-normalized), Euclidean (one-hot L2), and Cosine (angular) are executed simultaneously in parallel. Predictions require multi-metric cross-validation, and metric divergences are highlighted in real time.
            </p>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-3.5 space-y-1.5">
            <span className="font-semibold text-xs text-teal-900 flex items-center gap-1.5">
              3. Imputation Invariance Testing (vs. Imputation Artifacts)
            </span>
            <p className="text-xs text-neutral-600 leading-relaxed">
              When clinical intake is incomplete, mode-imputation risks pulling phenotypes toward the population average. The system computes both mode-imputed and observed-only variants, explicitly displaying whether nearest neighbours are invariant to imputation.
            </p>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-3.5 space-y-1.5">
            <span className="font-semibold text-xs text-teal-900 flex items-center gap-1.5">
              4. Boundary Tie &amp; Uncertainty Indexing (vs. Pseudo-Precision)
            </span>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Categorical ties frequently occur at the top-k boundary. The engine detects equivalence classes at rank k, applies stable index tie-breaking, and computes Shannon entropy over the neighbor vote distribution to honestly quantify diagnostic ambiguity.
            </p>
          </div>
        </div>
      </div>

      {/* Blinded Expert Review Protocol Status */}
      <div className="paper-card p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-neutral-900">
            Blinded Clinical Review Protocol
          </h2>
          <span className="rounded border border-neutral-300 bg-neutral-50 px-2.5 py-0.5 text-xs font-medium text-neutral-800">
            {expertReview.display_label}
          </span>
        </div>
        <p className="text-xs leading-relaxed text-neutral-600">
          A blinded workbook (<code className="num">expert_review/rating_sheet.xlsx</code>,{' '}
          <span className="num">{expertReview.n_total_pairs_in_sheet}</span> randomised pairs,
          hidden <code className="num">expert_review/private/answer_key.csv</code>) and scoring
          script (<code className="num">expert_review/analysis/expert_agreement.py</code>) are
          prepared. Completed reviewers: <span className="num">{expertReview.n_reviewers}</span>;
          rated pairs: <span className="num">{expertReview.n_rated_pairs}</span>.
        </p>
      </div>

      {/* Collapsed-by-default Reference Literature */}
      <div className="paper-card overflow-hidden">
        <button
          type="button"
          onClick={() => setLitOpen((v) => !v)}
          className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-neutral-50"
        >
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-900">
            {litOpen ? (
              <ChevronDown className="h-4 w-4 text-neutral-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-neutral-500" />
            )}
            Related Literature ({LITERATURE_REVIEW.length} references)
          </span>
          <span className="text-xs font-medium text-teal-700">
            {litOpen ? 'Hide' : 'Expand'}
          </span>
        </button>

        {litOpen && (
          <div className="border-t border-neutral-200 p-6 space-y-4">
            <div className="flex justify-end">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-neutral-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter references..."
                  className="w-56 rounded border border-neutral-200 bg-white py-1.5 pl-8 pr-3 text-xs text-neutral-800 placeholder-neutral-400 focus:border-teal-700 focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-500">
                    <th className="py-2 pr-3 font-medium">Year</th>
                    <th className="px-3 py-2 font-medium">Study</th>
                    <th className="px-3 py-2 font-medium">Domain</th>
                    <th className="py-2 pl-3 font-medium">Relevance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredLit.map((paper) => (
                    <tr key={paper.id} className="hover:bg-neutral-50">
                      <td className="num py-2.5 pr-3 text-neutral-700">{paper.year}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-neutral-900">{paper.title}</div>
                        <div className="text-[11px] text-neutral-500">
                          {paper.authors} · {paper.venue}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-neutral-600">
                        {paper.domain}
                      </td>
                      <td className="py-2.5 pl-3 text-neutral-600">{paper.relevance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
