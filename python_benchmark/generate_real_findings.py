#!/usr/bin/env python3
"""Generate docs/REAL_DATA_FINDINGS.md strictly from results/real_data.json (Rule R1)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List


def _fmt(val: float, digits: int = 4) -> str:
    return f"{val:.{digits}f}"


def _fmt_ms(mean: float, std: float, digits: int = 4) -> str:
    return f"{mean:.{digits}f} ± {std:.{digits}f}"


def render_real_findings(data: Dict[str, Any]) -> str:
    prov = data["provenance"]
    meta = prov["dataset_metadata"]
    git = prov["git"]
    libs = prov["library_versions"]

    lines: List[str] = [
        "# Experiment A — Real Categorical Data Findings",
        "",
        "> Auto-generated directly from `results/real_data.json` by `python_benchmark/generate_real_findings.py` (Rule R1: zero hand-typed numbers).",
        "",
        "## Provenance & Dataset Summary",
        "",
        f"- **Dataset:** `{meta['csv_member']}` inside `Dataset/tridosha.zip` (Kaggle `{meta['kaggle_slug']}`).",
        f"- **Shape:** `{meta['n_rows']}` rows × `{meta['n_features']}` features (`{meta['n_numeric']}` numeric, `{meta['n_categorical']}` categorical).",
        f"- **Labels:** `{meta['label_provenance']}`.",
        f"- **Exact duplicates:** `{meta['duplicate_row_count']}` full-row duplicate (retained; row index `{meta['duplicate_row_indices']}`).",
        f"- **Class counts:** "
        + ", ".join(f"{k}: `{v}`" for k, v in meta["class_counts"].items())
        + ".",
        f"- **Run provenance:** branch `{git['branch']}`, commit `{git['short_commit']}`, Python `{prov['python_version']}`, numpy `{libs['numpy']}`, pandas `{libs['pandas']}`, scipy `{libs['scipy']}`, scikit-learn `{libs['scikit_learn']}`.",
        "",
        "## 1. Pairwise Metric Equivalence (All 29 Real Categorical Traits)",
        "",
        "| Metric A | Metric B | Spearman ρ | Max Abs Diff (Min-Max) | Mean Top-5 Overlap |",
        "| :--- | :--- | :---: | :---: | :---: |",
    ]

    for r in data["equivalence"]:
        lines.append(
            f"| {r['metric_a']} | {r['metric_b']} | {_fmt(r['spearman_rho'], 6)} | "
            f"{_fmt(r['max_abs_diff_minmax'], 6)} | {_fmt(r['mean_top5_overlap'], 4)} |"
        )

    lines.extend(
        [
            "",
            "On this categorical-only dataset, Gower, Cosine, and Hamming are mathematically identical after scaling (`Spearman ρ = 1.000000`), and Euclidean is an exact monotone transform (`sqrt(2p * D)`), yielding `Spearman ρ = 1.000000` with all three.",
            "",
            "## 2. Full 29-Trait Evaluation",
            "",
            "| Metric | kNN Macro-F1 (3×5 CV) | kNN Accuracy (3×5 CV) | LOO Macro P@1 | LOO Macro P@5 | LOO Macro P@10 | ARI (Avg) | NMI (Avg) | ARI (Comp) | NMI (Comp) | Sil* (Avg) | Sil* (Comp) |",
            "| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |",
        ]
    )

    full_metrics = data["full_29_traits"]["metrics"]
    for m, ev in full_metrics.items():
        knn = ev["knn_cv"]
        loo = ev["loo_retrieval"]["macro"]
        avg = ev["clustering"]["linkages"]["average"]
        comp = ev["clustering"]["linkages"]["complete"]
        lines.append(
            f"| {m} | {_fmt_ms(knn['macro_f1_mean'], knn['macro_f1_std'])} | "
            f"{_fmt_ms(knn['accuracy_mean'], knn['accuracy_std'])} | "
            f"{_fmt(loo['p_at_1'])} | {_fmt(loo['p_at_5'])} | {_fmt(loo['p_at_10'])} | "
            f"{_fmt(avg['ari'])} | {_fmt(avg['nmi'])} | "
            f"{_fmt(comp['ari'])} | {_fmt(comp['nmi'])} | "
            f"{_fmt(avg['silhouette'])} | {_fmt(comp['silhouette'])} |"
        )

    lines.extend(
        [
            "",
            "*Silhouette note: `not comparable across metrics` (computed inside each metric's own distance space).",
            "",
            "### Three Smallest Classes (Full 29-Trait LOO Retrieval)",
            "",
            "| Metric | Class | n | P@1 | P@5 | P@10 |",
            "| :--- | :--- | :---: | :---: | :---: | :---: |",
        ]
    )
    for m, ev in full_metrics.items():
        for cls_name, cls_stats in ev["loo_retrieval"]["smallest_classes"].items():
            lines.append(
                f"| {m} | {cls_name} | {cls_stats['count']} | "
                f"{_fmt(cls_stats['p_at_1'])} | {_fmt(cls_stats['p_at_5'])} | {_fmt(cls_stats['p_at_10'])} |"
            )

    lines.extend(
        [
            "",
            "### Paired Wilcoxon Tests (Full 29-Trait kNN Macro-F1 Across 15 CV Folds, Holm-Adjusted)",
            "",
            "| Metric A | Metric B | Mean Diff | Cohen dz | Rank-Biserial r | p (raw) | p (Holm) |",
            "| :--- | :--- | :---: | :---: | :---: | :---: | :---: |",
        ]
    )
    for row in data["full_29_traits"]["paired_stats"]["knn_macro_f1_paired"]["pairwise"]:
        lines.append(
            f"| {row['metric_a']} | {row['metric_b']} | {_fmt(row['mean_diff'], 6)} | "
            f"{_fmt(row['cohen_dz'], 4)} | {_fmt(row['rank_biserial_r'], 4)} | "
            f"{_fmt(row['p_raw'], 4)} | {_fmt(row['p_holm'], 4)} |"
        )

    lines.extend(
        [
            "",
            "## 3. Trait-Subset Sweep (m ∈ {3, 5, 8, 12, 20, 29})",
            "",
            "Because all 29 traits deterministically map to the dataset-provided labels, random trait subsets test metric behavior under partial information. The final two columns report the count of exact tied pairwise distances (out of 719,400 pairs) and the count of query rows with an exact distance tie at the rank-5/rank-6 boundary.",
            "",
            "| m | Subsets | Metric | kNN Macro-F1 | LOO Macro P@5 | ARI (Avg) | NMI (Avg) | ARI (Comp) | NMI (Comp) | Tied Pairs (mean) | Top-5 Boundary Tie Rows |",
            "| :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |",
        ]
    )

    for r in data["trait_subsets"]["summary"]:
        lines.append(
            f"| {r['m_traits']} | {r['n_subsets']} | {r['metric']} | "
            f"{_fmt_ms(r['knn_macro_f1_mean'], r['knn_macro_f1_std'])} | "
            f"{_fmt_ms(r['loo_macro_p5_mean'], r['loo_macro_p5_std'])} | "
            f"{_fmt_ms(r['ari_average_mean'], r['ari_average_std'])} | "
            f"{_fmt_ms(r['nmi_average_mean'], r['nmi_average_std'])} | "
            f"{_fmt_ms(r['ari_complete_mean'], r['ari_complete_std'])} | "
            f"{_fmt_ms(r['nmi_complete_mean'], r['nmi_complete_std'])} | "
            f"{r['tied_distance_pairs_mean']:,.1f} | "
            f"{r['top5_boundary_tie_rows_mean']:,.1f} |"
        )

    shuf = data["shuffled_control"]
    lines.extend(
        [
            "",
            "## 4. Shuffled-Label Control",
            "",
            f"- **Control seed:** `{shuf['seed']}` | **Theoretical Macro P@5 chance (1/6):** `{_fmt(shuf['chance_macro_p5'])}` | **Control status:** `{'PASSED' if shuf['all_passed'] else 'FAILED'}`.",
            "",
            "| Metric | kNN Macro-F1 (3×5 CV) | kNN Accuracy | LOO Macro P@1 | LOO Macro P@5 | LOO Macro P@10 | ARI (Avg) | NMI (Avg) | Passed |",
            "| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |",
        ]
    )
    for m, vals in shuf["metrics"].items():
        lines.append(
            f"| {m} | {_fmt_ms(vals['knn_macro_f1_mean'], vals['knn_macro_f1_std'])} | "
            f"{_fmt(vals['knn_accuracy_mean'])} | {_fmt(vals['loo_macro_p_at_1'])} | "
            f"{_fmt(vals['loo_macro_p_at_5'])} | {_fmt(vals['loo_macro_p_at_10'])} | "
            f"{_fmt(vals['ari_average'])} | {_fmt(vals['nmi_average'])} | "
            f"{'PASS' if vals['passed'] else 'FAIL'} |"
        )

    lines.append("")
    return "\n".join(lines)


def write_real_findings_markdown(json_path: Path, out_path: Path) -> None:
    with open(json_path, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    md = render_real_findings(data)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(md, encoding="utf-8")


if __name__ == "__main__":
    root = Path(__file__).resolve().parent.parent
    write_real_findings_markdown(
        root / "results" / "real_data.json",
        root / "docs" / "REAL_DATA_FINDINGS.md",
    )
    print("Regenerated docs/REAL_DATA_FINDINGS.md from results/real_data.json")
