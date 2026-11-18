import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { LITERATURE_REVIEW } from '../data/literatureData';

const LIMITATIONS = [
  {
    title: 'Real dataset lacks numeric columns and unverified label provenance',
    detail:
      'Updated_Prakriti_With_Features.csv (Kaggle adityaprashantshirke/prakriti-updated) has 29 categorical traits and 0 numeric columns; origin, license, and annotator identity are unstated. All real-data labels are therefore treated strictly as dataset-provided Dosha labels, never practitioner-assigned.',
  },
  {
    title: 'Deterministic trait-to-label mapping & equivalence on categorical-only data',
    detail:
      'On categorical-only data, uniform Gower, one-hot Euclidean, and one-hot Cosine are monotone transforms of Hamming distance. Moreover, a random forest reaches ceiling CV accuracy on the 29 traits because labels behave as a deterministic function of the categorical inputs.',
  },
  {
    title: 'Synthetic findings describe the generator, not real clinical populations',
    detail:
      'Experiment B uses SYNTHETIC/SIMULATED cohorts (ayur_bench.synth.generator) with latent_class as ground truth by construction. Conditional independence of categorical traits given class and parametric numeric assumptions limit generalization to real hospital EHRs.',
  },
  {
    title: 'Cross-metric silhouette scores are not comparable',
    detail:
      'Each silhouette value is computed within its own metric geometry and must never be compared across Gower, Euclidean, and Cosine spaces.',
  },
  {
    title: 'Severe class imbalance affects agglomerative clustering',
    detail:
      'The empirical 6-class proportions span a 13:1 ratio between the largest and smallest classes, limiting unsupervised clustering recovery even when nearest-neighbour retrieval succeeds.',
  },
  {
    title: 'Practitioner clinical validation is not yet completed',
    detail:
      'A blinded 40-query × 5-candidate workbook (expert_review/rating_sheet.xlsx) and scoring script (expert_review/analysis/expert_agreement.py) are prepared, but clinical review remains pending.',
  },
];

export default function ExpertAndLimitationsSection({ expertReview }) {
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
    <section id="expert-limitations" className="scroll-mt-20 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">
          6. Practitioner Review, Limitations &amp; Literature
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Blinded clinical validation status (loaded from{' '}
          <code className="num text-xs">results/expert_review.json</code>), methodological
          limitations, and reference literature.
        </p>
      </div>

      {/* Practitioner Validation Status Card */}
      <div className="paper-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-3">
          <h3 className="text-sm font-semibold text-neutral-900">
            Blinded Practitioner Validation Status
          </h3>
          <span className="rounded border border-neutral-300 bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-800">
            {expertReview.display_label}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-4 text-xs leading-relaxed text-neutral-600 md:grid-cols-3">
          <div>
            <div className="font-medium text-neutral-900">Prepared protocol</div>
            <p className="mt-1">
              <code className="num text-[11px]">expert_review/build_sheet.py</code> selects 40
              stratified real records and presents their top-5 neighbours in randomised slots
              (<span className="num">{expertReview.n_total_pairs_in_sheet}</span> pairs) with all
              labels, ranks, distances, and metric names stripped.
            </p>
          </div>
          <div>
            <div className="font-medium text-neutral-900">Reviewer artefacts</div>
            <p className="mt-1">
              Reviewers receive only{' '}
              <code className="num text-[11px]">expert_review/rating_sheet.xlsx</code> and the
              two-minute guide{' '}
              <code className="num text-[11px]">expert_review/instructions.md</code>. The hidden
              key stays in{' '}
              <code className="num text-[11px]">expert_review/private/answer_key.csv</code>.
            </p>
          </div>
          <div>
            <div className="font-medium text-neutral-900">Current counts</div>
            <p className="mt-1">
              Completed reviewers: <span className="num font-medium">{expertReview.n_reviewers}</span>{' '}
              · Rated pairs: <span className="num font-medium">{expertReview.n_rated_pairs}</span> /{' '}
              <span className="num">{expertReview.n_total_pairs_in_sheet}</span>.{' '}
              {expertReview.note}
            </p>
          </div>
        </div>
      </div>

      {/* Limitations */}
      <div className="paper-card p-5">
        <h3 className="text-sm font-semibold text-neutral-900">Methodological Limitations</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
          {LIMITATIONS.map((item, idx) => (
            <div key={item.title} className="text-xs leading-relaxed">
              <div className="font-medium text-neutral-900">
                <span className="num mr-1.5 text-teal-800">{idx + 1}.</span>
                {item.title}
              </div>
              <p className="mt-1 text-neutral-600">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Collapsed-by-default Literature Table */}
      <div className="paper-card overflow-hidden">
        <button
          type="button"
          onClick={() => setLitOpen((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-3.5 text-left transition hover:bg-neutral-50"
        >
          <div className="flex items-center gap-2">
            {litOpen ? (
              <ChevronDown className="h-4 w-4 text-neutral-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-neutral-500" />
            )}
            <span className="text-sm font-semibold text-neutral-900">
              Related Literature ({LITERATURE_REVIEW.length} references)
            </span>
          </div>
          <span className="text-xs font-medium text-teal-700">
            {litOpen ? 'Hide table' : 'Expand table'}
          </span>
        </button>

        {litOpen && (
          <div className="border-t border-neutral-200 p-5">
            <div className="mb-3 flex justify-end">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-neutral-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter references..."
                  className="w-56 rounded-md border border-neutral-200 bg-white py-1.5 pl-8 pr-2.5 text-xs text-neutral-800 placeholder-neutral-400 focus:border-teal-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 text-[11px] font-medium text-neutral-500">
                    <th className="py-2 pr-2">Year</th>
                    <th className="px-2 py-2">Study</th>
                    <th className="px-2 py-2">Domain</th>
                    <th className="py-2 pl-2">Relevance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredLit.map((paper) => (
                    <tr key={paper.id} className="hover:bg-neutral-50">
                      <td className="num py-2.5 pr-2 font-medium text-neutral-700">
                        {paper.year}
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="font-medium text-neutral-900">{paper.title}</div>
                        <div className="text-[11px] text-neutral-500">
                          {paper.authors} · {paper.venue}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-neutral-600">
                        {paper.domain}
                      </td>
                      <td className="py-2.5 pl-2 text-neutral-600">{paper.relevance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
