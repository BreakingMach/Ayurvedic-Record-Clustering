#!/usr/bin/env python3
"""Generate docs/SYNTHETIC_FINDINGS.md strictly from results/synthetic.json (Rules R1 & R4)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List


def _fmt(val: float, digits: int = 4) -> str:
    return f"{val:.{digits}f}"


def _fmt_ms(obj: Dict[str, float], digits: int = 4) -> str:
    return f"{obj['mean']:.{digits}f} ± {obj['std']:.{digits}f}"


def render_synthetic_findings(data: Dict[str, Any]) -> str:
    prov = data["provenance"]
    git = prov["git"]
    libs = prov["library_versions"]
    base_id = prov["baseline_cell_id"]
    base_cell = data["cells"][base_id]
    base_p = base_cell["parameters"]

    lines: List[str] = [
        "# Experiment B — SYNTHETIC/SIMULATED Mixed-Type Benchmark Findings",
        "",
        "> **SYNTHETIC/SIMULATED DATA ONLY (Rule R4):** All cohorts and numbers below come from `ayur_bench.synth.generator`. `latent_class` is simulation ground truth by construction, not a practitioner label. Findings describe metric behaviour on the synthetic generator, not real Ayurvedic patients.",
        ">",
        "> Auto-generated directly from `results/synthetic.json` by `python_benchmark/generate_synthetic_findings.py` (Rule R1: zero hand-typed numbers).",
        "",
        "## Provenance & Experimental Design",
        "",
        f"- **Baseline cell (`{base_id}`):** `categorical_eps={base_p['categorical_eps']}`, `numeric_cohens_d={base_p['numeric_cohens_d']}`, `outlier_fraction={base_p['outlier_fraction']}`, `missing_fraction={base_p['missing_fraction']}`, `label_noise_rate={base_p['label_noise_rate']}`, `m_traits={base_p['m_traits']}` (+ 4 numeric vitals: `age`, `bmi`, `systolic_bp`, `pulse`).",
        f"- **Seeds per cell:** `{prov['n_seeds_used']}` (seeds `{prov['seeds'][0]}..{prov['seeds'][-1]}`; reduced for runtime: `{prov['seeds_reduced_for_runtime']}`).",
        f"- **Unique OFAT cells evaluated:** `{len(data['cells'])}` across `{len(data['sweeps'])}` one-factor-at-a-time sweeps.",
        f"- **Total runtime:** `{prov['runtime_seconds']:.2f}s` (`{prov['runtime_seconds']/60:.2f} min`) on `{prov['n_jobs']}` parallel workers.",
        f"- **Run provenance:** branch `{git['branch']}`, commit `{git['short_commit']}`, Python `{prov['python_version']}`, numpy `{libs['numpy']}`, pandas `{libs['pandas']}`, scipy `{libs['scipy']}`, scikit-learn `{libs['scikit_learn']}`, joblib `{libs['joblib']}`.",
        "",
        "## 1. Baseline Cell Summary (SYNTHETIC)",
        "",
        "| Metric | kNN Macro-F1 | LOO Macro P@1 | LOO Macro P@5 | LOO Macro P@10 | ARI (Avg) | NMI (Avg) | ARI (Comp) | NMI (Comp) | Sil* (Avg) | Sil* (Comp) |",
        "| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |",
    ]

    for m in prov["config"]["experiment_synthetic"]["metrics"]:
        ms = base_cell["metrics"][m]
        lines.append(
            f"| {m} | {_fmt_ms(ms['knn_macro_f1'])} | {_fmt_ms(ms['loo_macro_p_at_1'])} | "
            f"{_fmt_ms(ms['loo_macro_p_at_5'])} | {_fmt_ms(ms['loo_macro_p_at_10'])} | "
            f"{_fmt_ms(ms['ari_average'])} | {_fmt_ms(ms['nmi_average'])} | "
            f"{_fmt_ms(ms['ari_complete'])} | {_fmt_ms(ms['nmi_complete'])} | "
            f"{_fmt_ms(ms['silhouette_average_not_comparable'])} | {_fmt_ms(ms['silhouette_complete_not_comparable'])} |"
        )

    lines.extend(
        [
            "",
            "*Silhouette note: `not comparable across metrics` (computed inside each metric's own distance space).",
            "",
            f"- **Baseline unique winner (Holm p < 0.05 against both other metrics):** "
            f"kNN Macro-F1 = `{base_cell['winners']['knn_macro_f1']}`, "
            f"LOO Macro P@5 = `{base_cell['winners']['loo_macro_p_at_5']}`, "
            f"ARI (Avg) = `{base_cell['winners']['ari_average']}`, "
            f"ARI (Comp) = `{base_cell['winners']['ari_complete']}`.",
            "",
            "## 2. Winner Map Across All OFAT Sweeps (SYNTHETIC)",
            "",
            "A metric is listed as the unique winner of a cell ONLY when it has the highest mean AND beats BOTH other metrics at Holm-adjusted paired Wilcoxon `p < 0.05`. Cells where differences are not significant are explicitly marked `none (not significant / tie)`.",
            "",
            "| Sweep | Value | Winner (kNN Macro-F1) | Winner (LOO Macro P@5) | Winner (ARI Avg) | Winner (ARI Comp) |",
            "| :--- | :---: | :--- | :--- | :--- | :--- |",
        ]
    )

    for sweep_name, s_info in data["sweeps"].items():
        for val, cid in zip(s_info["values"], s_info["cell_ids"]):
            w = data["cells"][cid]["winners"]
            lines.append(
                f"| {sweep_name} | {val} | {w['knn_macro_f1']} | {w['loo_macro_p_at_5']} | "
                f"{w['ari_average']} | {w['ari_complete']} |"
            )

    lines.extend(["", "## 3. Detailed Sweep Tables (Mean ± Std Across 20 Seeds, SYNTHETIC)", ""])

    for sweep_name, s_info in data["sweeps"].items():
        lines.extend(
            [
                f"### Sweep: `{sweep_name}`",
                "",
                "| Value | Metric | kNN Macro-F1 | LOO Macro P@5 | ARI (Avg) | NMI (Avg) | ARI (Comp) | NMI (Comp) |",
                "| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |",
            ]
        )
        for val, cid in zip(s_info["values"], s_info["cell_ids"]):
            cell = data["cells"][cid]
            for m in prov["config"]["experiment_synthetic"]["metrics"]:
                ms = cell["metrics"][m]
                lines.append(
                    f"| {val} | {m} | {_fmt_ms(ms['knn_macro_f1'])} | {_fmt_ms(ms['loo_macro_p_at_5'])} | "
                    f"{_fmt_ms(ms['ari_average'])} | {_fmt_ms(ms['nmi_average'])} | "
                    f"{_fmt_ms(ms['ari_complete'])} | {_fmt_ms(ms['nmi_complete'])} |"
                )

        # Pooled pairwise Wilcoxon + Holm summary for this sweep on kNN Macro-F1 and LOO Macro P@5
        lines.extend(
            [
                "",
                f"**Pooled Paired Wilcoxon + Holm ({s_info['n_paired_observations']} paired observations in `{sweep_name}` sweep):**",
                "",
                "| Endpoint | Metric A | Metric B | Mean Diff (A−B) | Cohen dz | Rank-Biserial r | p (raw) | p (Holm) | Sig |",
                "| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |",
            ]
        )
        for ep in ("knn_macro_f1", "loo_macro_p_at_5", "ari_average", "ari_complete"):
            for pr in s_info["pooled_paired_stats"][ep]["pairwise"]:
                lines.append(
                    f"| {ep} | {pr['metric_a']} | {pr['metric_b']} | {_fmt(pr['mean_diff'], 4)} | "
                    f"{_fmt(pr['cohen_dz'], 3)} | {_fmt(pr['rank_biserial_r'], 3)} | "
                    f"{_fmt(pr['p_raw'], 4)} | {_fmt(pr['p_holm'], 4)} | "
                    f"{'YES' if pr['significant_holm'] else 'no'} |"
                )
        lines.append("")

    shuf = data["shuffled_control"]
    lines.extend(
        [
            "## 4. Baseline Shuffled-Label Control (SYNTHETIC)",
            "",
            f"- **Cell:** `{shuf['cell_id']}` | **Seed:** `{shuf['seed']}` | **Chance Macro P@5 (1/6):** `{_fmt(shuf['chance_macro_p5'])}` | **Status:** `{'PASSED' if shuf['all_passed'] else 'FAILED'}`.",
            "",
            "| Metric | kNN Macro-F1 | kNN Accuracy | LOO Macro P@1 | LOO Macro P@5 | LOO Macro P@10 | ARI (Avg) | NMI (Avg) | Passed |",
            "| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |",
        ]
    )
    for m, v in shuf["metrics"].items():
        lines.append(
            f"| {m} | {_fmt(v['knn_macro_f1_mean'])} | {_fmt(v['knn_accuracy_mean'])} | "
            f"{_fmt(v['loo_macro_p_at_1'])} | {_fmt(v['loo_macro_p_at_5'])} | "
            f"{_fmt(v['loo_macro_p_at_10'])} | {_fmt(v['ari_average'])} | "
            f"{_fmt(v['nmi_average'])} | {'PASS' if v['passed'] else 'FAIL'} |"
        )

    lines.append("")
    return "\n".join(lines)


def write_synthetic_findings_markdown(json_path: Path, out_path: Path) -> None:
    with open(json_path, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    md = render_synthetic_findings(data)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(md, encoding="utf-8")


if __name__ == "__main__":
    root = Path(__file__).resolve().parent.parent
    write_synthetic_findings_markdown(
        root / "results" / "synthetic.json",
        root / "docs" / "SYNTHETIC_FINDINGS.md",
    )
    print("Regenerated docs/SYNTHETIC_FINDINGS.md from results/synthetic.json")
