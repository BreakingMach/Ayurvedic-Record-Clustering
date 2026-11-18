import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { LITERATURE_REVIEW } from '../data/literatureData';

const LIMITATIONS = [
  {
    title: 'Trait–label circularity in Prakriti questionnaires',
    detail:
      'Constitutional Dosha classes (Vata, Pitta, Kapha, and dual combinations) are clinically defined from the same Pariksha attributes used as model inputs. High alignment can reflect questionnaire structure rather than independent external clinical validation.',
  },
  {
    title: '12× profile replication and 9 random noise columns in the source CSV',
    detail:
      'Audit of Updated_Prakriti_With_Features.csv revealed 100 unique 20-trait profiles repeated 12 times (1,200 rows) with 9 independently randomized lifestyle columns (MI < 0.007 nats). Evaluating without group deduplication causes severe clone leakage and artificially inflates P@5 to ~100% for every metric.',
  },
  {
    title: 'Simulated continuous vitals',
    detail:
      'Because the public CSV has no numerical vital measurements, Age_Vaya, BMI, Systolic_BP, and Pulse_Rate were simulated from observable physical traits only (never from Dosha). Real clinical EHRs with independently measured vitals and lab panels are needed to confirm mixed-modality gains.',
  },
  {
    title: 'Severe 13:1 class imbalance & low clustering ARI',
    detail:
      'With Vata+Pitta comprising 52% of records and Pitta+Kapha / Vata+Kapha only 4% each (4 unique profiles per class), unsupervised 6-cluster partitioning yields modest ARI (0.10–0.15) and splits the majority class while absorbing rare dual-dosha profiles.',
  },
  {
    title: 'Prakriti vs. Vikriti and Age (Vaya)',
    detail:
      'In Ayurvedic clinical practice, Vaya (age/life stage) influences acute Vikriti (disease state), whereas Prakriti is lifelong. Simulated age therefore carries near-zero MI against Prakriti by construction; age weighting should be re-evaluated on true Vikriti diagnostic records.',
  },
  {
    title: 'Cross-metric Silhouette non-comparability',
    detail:
      'Silhouette scores are computed inside each metric’s own geometry and cannot be compared as ratios across Euclidean, Cosine, and Gower spaces. All observed values (< 0.25) indicate weak intrinsic cluster separation.',
  },
];

export default function LimitationsLiteratureSection() {
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
    <section id="limitations" className="scroll-mt-20 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">5. Limitations &amp; Literature</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Methodological caveats governing interpretation of the benchmark, followed by
          reference literature.
        </p>
      </div>

      {/* Limitations List */}
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

      {/* Collapsed-by-Default Literature Table */}
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
              Related Literature ({LITERATURE_REVIEW.length} peer-reviewed references)
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
                    <th className="py-2 pl-2">Relevance to Benchmark</th>
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
