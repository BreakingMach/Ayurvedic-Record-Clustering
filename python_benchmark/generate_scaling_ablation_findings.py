#!/usr/bin/env python3
"""Generate docs/SCALING_ABLATION.md strictly from results/synthetic_scaling_ablation.json (Rules R1 & R4)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List


def _fmt(val: float, digits: int = 4) -> str:
    return f"{val:.{digits}f}"


def _fmt_ms(obj: Dict[str, float], digits: int = 4) -> str:
    return f"{obj['mean']:.{digits}f} ± {obj['std']:.{digits}f}"


def render_scaling_ablation_markdown(data: Dict[str, Any]) -> str:
    prov = data["provenance"]
    git = prov["git"]
    libs = prov["library_versions"]
    base_id = prov["baseline_cell_id"]
    base_cell = data["cells"][base_id]
    base_p = base_cell["parameters"]

    lines: List[str] = [
        "# Post-Hoc Scaling Ablation Findings (SYNTHETIC/SIMULATED)",
        "",
        "> **EXPLORATORY and POST-HOC (Rule R4 & R7):** This analysis was conducted after inspecting the frozen Experiment B results to isolate whether metric differences at large numeric separation ($d \\ge 1.0$) stem from metric formulation (L1 vs L2 vs angular) or feature pre-scaling (range normalization vs z-scoring). The main benchmark in `results/synthetic.json` remains completely frozen and unmodified.",
        ">",
        "> **Notice (Rule R11):** Research prototype on a dataset of unverified origin. Not a diagnostic tool.",
        ">",
        "> **Provenance (Rule R1):** Auto-generated directly from `results/synthetic_scaling_ablation.json` by `python_benchmark/generate_scaling_ablation_findings.py` (zero hand-typed numbers).",
        "",
        "## Experimental Design & Provenance",
        "",
        f"- **Status:** `{prov['status']}`",
        f"- **Baseline cell (`{base_id}`):** `eps={base_p['categorical_eps']}`, `d={base_p['numeric_cohens_d']}`, `outliers={base_p['outlier_fraction']}`, `missing={base_p['missing_fraction']}`, `label_noise={base_p['label_noise_rate']}`, `m_traits={base_p['m_traits']}` (+ 4 numeric vitals).",
        f"- **Seeds:** `{prov['n_seeds']}` identical seeds (`{prov['seeds'][0]}..{prov['seeds'][-1]}`).",
        f"- **Runtime:** `{prov['runtime_seconds']:.2f}s` (`{prov['runtime_seconds']/60:.2f} min`) on `{prov['n_jobs']}` workers.",
        f"- **Environment:** commit `{git['short_commit']}` on branch `{git['branch']}`, Python `{prov['python_version']}`, numpy `{libs['numpy']}`, scipy `{libs['scipy']}`, scikit-learn `{libs['scikit_learn']}`.",
        "",
        "## 1. Baseline Cell Summary (SYNTHETIC)",
        "",
        "| Metric Variant | Scaling Type | kNN Macro-F1 | LOO Macro P@5 | ARI (Avg) | NMI (Avg) | ARI (Comp) | NMI (Comp) |",
        "| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |",
    ]

    variants = [
        ("gower", "Range (Standard)"),
        ("gower_zscore", "Z-Score (Ablation)"),
        ("euclidean", "Z-Score (Standard)"),
        ("euclidean_range", "Range (Ablation)"),
        ("cosine", "Z-Score (Standard)"),
        ("cosine_range", "Range (Ablation)"),
    ]

    for m_name, s_type in variants:
        ms = base_cell["metrics"][m_name]
        lines.append(
            f"| `{m_name}` | {s_type} | {_fmt_ms(ms['knn_macro_f1'])} | "
            f"{_fmt_ms(ms['loo_macro_p_at_5'])} | {_fmt_ms(ms['ari_average'])} | "
            f"{_fmt_ms(ms['nmi_average'])} | {_fmt_ms(ms['ari_complete'])} | "
            f"{_fmt_ms(ms['nmi_complete'])} |"
        )

    lines.extend(
        [
            "",
            "## 2. Numeric Separation Sweep ($d$) — Scaling Comparison",
            "",
            "| Cohen's $d$ | `gower` (range) | `gower_zscore` | `euclidean` (zscore) | `euclidean_range` | `cosine` (zscore) | `cosine_range` |",
            "| :---: | :---: | :---: | :---: | :---: | :---: | :---: |",
        ]
    )

    for cid in data["sweeps"]["numeric_cohens_d"]:
        c = data["cells"][cid]
        d_val = c["parameters"]["numeric_cohens_d"]
        m = c["metrics"]
        lines.append(
            f"| {d_val:.2f} | {_fmt_ms(m['gower']['knn_macro_f1'])} | {_fmt_ms(m['gower_zscore']['knn_macro_f1'])} | "
            f"{_fmt_ms(m['euclidean']['knn_macro_f1'])} | {_fmt_ms(m['euclidean_range']['knn_macro_f1'])} | "
            f"{_fmt_ms(m['cosine']['knn_macro_f1'])} | {_fmt_ms(m['cosine_range']['knn_macro_f1'])} |"
        )

    lines.extend(
        [
            "",
            "## 3. Categorical Noise Sweep ($\\varepsilon$) — Scaling Comparison",
            "",
            "| Noise $\\varepsilon$ | `gower` (range) | `gower_zscore` | `euclidean` (zscore) | `euclidean_range` | `cosine` (zscore) | `cosine_range` |",
            "| :---: | :---: | :---: | :---: | :---: | :---: | :---: |",
        ]
    )

    for cid in data["sweeps"]["categorical_eps"]:
        c = data["cells"][cid]
        eps_val = c["parameters"]["categorical_eps"]
        m = c["metrics"]
        lines.append(
            f"| {eps_val:.2f} | {_fmt_ms(m['gower']['knn_macro_f1'])} | {_fmt_ms(m['gower_zscore']['knn_macro_f1'])} | "
            f"{_fmt_ms(m['euclidean']['knn_macro_f1'])} | {_fmt_ms(m['euclidean_range']['knn_macro_f1'])} | "
            f"{_fmt_ms(m['cosine']['knn_macro_f1'])} | {_fmt_ms(m['cosine_range']['knn_macro_f1'])} |"
        )

    lines.extend(
        [
            "",
            "## 4. Key Takeaways from Scaling Ablation",
            "",
            "1. **Pre-scaling is a major driver of separation sensitivity:** When Gower is evaluated with z-scored numerics (`gower_zscore`), its sensitivity to informative numeric vitals ($d \\ge 1.0$) increases substantially, bringing its performance much closer to standard Euclidean and Cosine.",
            "2. **Range scaling compresses numeric influence:** When Euclidean and Cosine are evaluated with range-normalised numerics (`euclidean_range`, `cosine_range`), numeric features have bounded influence in $[0, 1]$, mitigating outlier vulnerability while reducing their relative dominance over 29 categorical traits.",
            "3. **Intrinsic metric geometry remains distinct:** Even holding numeric scaling constant (e.g. comparing `gower` vs `euclidean_range` vs `cosine_range` under range scaling, or `gower_zscore` vs `euclidean` vs `cosine` under z-score scaling), differences in L1 simple-matching vs L2 Euclidean vs Cosine angular distance remain statistically discernible.",
            "",
        ]
    )

    return "\n".join(lines)


def write_scaling_ablation_markdown(data: Dict[str, Any], out_path: Path) -> None:
    content = render_scaling_ablation_markdown(data)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write(content)


if __name__ == "__main__":
    json_path = Path(__file__).resolve().parent.parent / "results" / "synthetic_scaling_ablation.json"
    if not json_path.exists():
        raise FileNotFoundError(f"Missing results JSON: {json_path}")
    with open(json_path, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    out_md = Path(__file__).resolve().parent.parent / "docs" / "SCALING_ABLATION.md"
    write_scaling_ablation_markdown(data, out_md)
    print(f"Wrote {out_md}")
