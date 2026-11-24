import React, { useState } from 'react';
import { Download, FileText, CheckCircle2 } from 'lucide-react';

function downloadCsv(filename, rows) {
  const content = rows
    .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsExportPage({ realData, syntheticData, missingnessData }) {
  const [downloadStatus, setDownloadStatus] = useState('');

  if (!realData) {
    return <div className="glass-panel rounded-2xl p-8 text-sm text-[#827568]">Loading export data…</div>;
  }

  const fullMetrics = realData.full_29_traits?.metrics || {};
  const equivalence = realData.equivalence || [];

  // Export Real Data Table
  const handleExportRealBenchmark = () => {
    const headers = [
      'Distance Metric',
      'kNN Macro-F1 Mean',
      'kNN Macro-F1 Std',
      'LOO P@1',
      'LOO P@5',
      'LOO P@10',
      'ARI Average Linkage',
      'NMI Average Linkage',
    ];
    const rows = [headers];
    for (const [mName, mObj] of Object.entries(fullMetrics)) {
      rows.push([
        mName,
        mObj.knn_cv.macro_f1_mean,
        mObj.knn_cv.macro_f1_std,
        mObj.loo_retrieval.macro.p_at_1,
        mObj.loo_retrieval.macro.p_at_5,
        mObj.loo_retrieval.macro.p_at_10,
        mObj.clustering.linkages.average.ari,
        mObj.clustering.linkages.average.nmi,
      ]);
    }
    downloadCsv('ayurvedic_distance_benchmark_real_data.csv', rows);
    setDownloadStatus('Exported real data benchmark CSV.');
  };

  // Export Equivalence
  const handleExportEquivalence = () => {
    const headers = [
      'Metric A',
      'Metric B',
      'Spearman Rho',
      'Max Abs Difference Min-Max',
      'Mean Top-5 Overlap',
    ];
    const rows = [headers];
    for (const eq of equivalence) {
      rows.push([
        eq.metric_a,
        eq.metric_b,
        eq.spearman_rho,
        eq.max_abs_diff_minmax,
        eq.mean_top5_overlap,
      ]);
    }
    downloadCsv('ayurvedic_distance_benchmark_equivalence.csv', rows);
    setDownloadStatus('Exported equivalence matrix CSV.');
  };

  // Export Synthetic OFAT Summary
  const handleExportSyntheticSweeps = () => {
    if (!syntheticData?.cells) return;
    const headers = [
      'Cell ID',
      'Is Baseline',
      'Categorical Noise Eps',
      'Numeric Cohens d',
      'Outlier Fraction',
      'Missing Fraction',
      'Label Noise Rate',
      'm Traits',
      'Gower kNN F1 Mean',
      'Gower kNN F1 Std',
      'Euclidean kNN F1 Mean',
      'Euclidean kNN F1 Std',
      'Cosine kNN F1 Mean',
      'Cosine kNN F1 Std',
    ];
    const rows = [headers];
    for (const [, cell] of Object.entries(syntheticData.cells)) {
      rows.push([
        cell.cell_id || '',
        cell.is_baseline,
        cell.parameters.categorical_eps,
        cell.parameters.numeric_cohens_d,
        cell.parameters.outlier_fraction,
        cell.parameters.missing_fraction,
        cell.parameters.label_noise_rate,
        cell.parameters.m_traits,
        cell.metrics.gower.knn_macro_f1.mean,
        cell.metrics.gower.knn_macro_f1.std,
        cell.metrics.euclidean.knn_macro_f1.mean,
        cell.metrics.euclidean.knn_macro_f1.std,
        cell.metrics.cosine.knn_macro_f1.mean,
        cell.metrics.cosine.knn_macro_f1.std,
      ]);
    }
    downloadCsv('ayurvedic_distance_benchmark_synthetic_sweeps.csv', rows);
    setDownloadStatus('Exported synthetic sweeps CSV.');
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-[#40382F]">Reports &amp; Data Export</h1>
        <p className="mt-2 text-sm text-[#827568]">
          Export verified benchmark datasets, analytical summaries, and distance equivalence tables.
        </p>
      </div>

      {/* R11 & R13 Notice */}
      <div className="paper-card p-4 text-xs text-[#827568] space-y-1">
        <p className="font-bold text-[#40382F]">
          Client-Side Data Privacy Notice (R11, R13):
        </p>
        <p>
          Research prototype on a dataset of unverified origin. Not a diagnostic tool.
          All exports and reports are generated entirely client-side inside your browser session.
          No patient case queries or entered data are ever transmitted to any external server.
        </p>
      </div>

      {downloadStatus && (
        <div className="rounded-2xl border border-[#C3A989]/60 bg-[#E8DED1]/85 p-3.5 text-xs text-[#40382F] flex items-center gap-2 font-medium">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#967D63]" />
          <span>{downloadStatus}</span>
        </div>
      )}

      {/* CSV Exports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Real Benchmark CSV */}
        <div className="paper-card p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-[#40382F] font-bold text-sm">
              <Download className="h-4 w-4 text-[#967D63]" />
              Real Data Benchmark
            </div>
            <p className="mt-2 text-xs text-[#827568] leading-relaxed">
              Full 29-trait benchmark table across Gower, Euclidean, and Cosine distances,
              including cross-validated kNN Macro-F1, retrieval P@k, and clustering ARI/NMI.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportRealBenchmark}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#40382F] px-3 py-2 text-xs font-semibold text-[#F3EADF] hover:bg-[#967D63] transition shadow-sm"
          >
            <Download className="h-3.5 w-3.5" />
            Download Benchmark CSV
          </button>
        </div>

        {/* Equivalence Matrix CSV */}
        <div className="paper-card p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-[#40382F] font-bold text-sm">
              <Download className="h-4 w-4 text-[#967D63]" />
              Distance Equivalence Matrix
            </div>
            <p className="mt-2 text-xs text-[#827568] leading-relaxed">
              Pairwise Spearman rank correlations (ρ = 1.0), min-max scaled absolute differences,
              and mean top-5 neighbor overlap on purely categorical case attributes.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportEquivalence}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#40382F] px-3 py-2 text-xs font-semibold text-[#F3EADF] hover:bg-[#967D63] transition shadow-sm"
          >
            <Download className="h-3.5 w-3.5" />
            Download Equivalence CSV
          </button>
        </div>

        {/* Synthetic Sweeps CSV */}
        <div className="paper-card p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-[#40382F] font-bold text-sm">
              <Download className="h-4 w-4 text-[#967D63]" />
              Synthetic OFAT Sweeps
            </div>
            <p className="mt-2 text-xs text-[#827568] leading-relaxed">
              Complete results across all 20 seeds per cell for Cohen’s d separation, categorical
              noise ε, outlier fraction, missing fraction, and trait count m.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportSyntheticSweeps}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#40382F] px-3 py-2 text-xs font-semibold text-[#F3EADF] hover:bg-[#967D63] transition shadow-sm"
          >
            <Download className="h-3.5 w-3.5" />
            Download Sweeps CSV
          </button>
        </div>
      </div>

      {/* JSON Raw Results Download */}
      <div className="paper-card p-6 space-y-4">
        <h2 className="text-sm font-bold text-[#40382F]">Download Raw Verified JSON Artifacts</h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => downloadJson('real_data.json', realData)}
            className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-[#F3EADF]/80 px-4 py-2 text-xs font-semibold text-[#40382F] hover:bg-white transition shadow-2xs"
          >
            <FileText className="h-3.5 w-3.5 text-[#967D63]" />
            real_data.json
          </button>
          {syntheticData && (
            <button
              type="button"
              onClick={() => downloadJson('synthetic.json', syntheticData)}
              className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-[#F3EADF]/80 px-4 py-2 text-xs font-semibold text-[#40382F] hover:bg-white transition shadow-2xs"
            >
              <FileText className="h-3.5 w-3.5 text-[#967D63]" />
              synthetic.json
            </button>
          )}
          {missingnessData && (
            <button
              type="button"
              onClick={() => downloadJson('missingness.json', missingnessData)}
              className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-[#F3EADF]/80 px-4 py-2 text-xs font-semibold text-[#40382F] hover:bg-white transition shadow-2xs"
            >
              <FileText className="h-3.5 w-3.5 text-[#967D63]" />
              missingness.json
            </button>
          )}
        </div>
      </div>

      {/* Documentation Files Index */}
      <div className="paper-card p-6 space-y-4">
        <h2 className="text-sm font-bold text-[#40382F]">Project Methodology &amp; Documentation</h2>
        <p className="text-xs text-[#827568]">
          Every finding and design choice is permanently logged in the project repository.
        </p>
        <div className="divide-y divide-[#E8DED1]/70 text-xs">
          <div className="py-2.5 flex justify-between items-center gap-2">
            <div>
              <span className="font-semibold text-[#40382F]">docs/REAL_DATA_FINDINGS.md</span>
              <span className="text-[#827568] ml-2">— Detailed analysis of real dataset benchmark and Hamming equivalence</span>
            </div>
            <span className="num text-[#967D63] font-mono text-[11px] shrink-0">Markdown</span>
          </div>
          <div className="py-2.5 flex justify-between items-center gap-2">
            <div>
              <span className="font-semibold text-[#40382F]">docs/SYNTH_DATASHEET.md</span>
              <span className="text-[#827568] ml-2">— Datasheet specification for the mixed-type synthetic cohort generator</span>
            </div>
            <span className="num text-[#967D63] font-mono text-[11px] shrink-0">Markdown</span>
          </div>
          <div className="py-2.5 flex justify-between items-center gap-2">
            <div>
              <span className="font-semibold text-[#40382F]">docs/SYNTHETIC_FINDINGS.md</span>
              <span className="text-[#827568] ml-2">— Script-generated findings from the 20-seed OFAT synthetic sweeps</span>
            </div>
            <span className="num text-[#967D63] font-mono text-[11px] shrink-0">Markdown</span>
          </div>
          <div className="py-2.5 flex justify-between items-center gap-2">
            <div>
              <span className="font-semibold text-[#40382F]">docs/DECISIONS.md</span>
              <span className="text-[#827568] ml-2">— Comprehensive record of all conservative architectural decisions (D1–D11)</span>
            </div>
            <span className="num text-[#967D63] font-mono text-[11px] shrink-0">Markdown</span>
          </div>
        </div>
      </div>
    </div>
  );
}
