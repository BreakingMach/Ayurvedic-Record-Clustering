#!/usr/bin/env python3
"""
Export verified JSON results and cohort data into public/data/ for the React UI (Rule R1).

Inputs (read-only):
  - results/real_data.json
  - results/synthetic.json
  - results/expert_review.json
  - Dataset/tridosha.zip (Updated_Prakriti_With_Features.csv)
  - Dataset/synthetic/synthetic_cases_default.csv (SYNTHETIC/SIMULATED)

Outputs (public/data/):
  - real_data.json
  - synthetic.json
  - expert_review.json
  - real_cases.json  (compact export of the 1,200 real rows with real trait names)
  - synthetic_cases_default.csv  (copied directly from Dataset/synthetic/)
"""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path
from typing import Any, Dict, List

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from ayur_bench.data import load_tridosha_dataset


def export_ui_data() -> None:
    results_dir = REPO_ROOT / "results"
    out_dir = REPO_ROOT / "public" / "data"
    out_dir.mkdir(parents=True, exist_ok=True)

    # 1. Copy Python-generated results/*.json verbatim
    for fname in ("real_data.json", "synthetic.json", "expert_review.json"):
        src = results_dir / fname
        if not src.exists():
            raise FileNotFoundError(f"Missing required result JSON: {src}")
        shutil.copy2(src, out_dir / fname)

    # 2. Copy Dataset/synthetic/synthetic_cases_default.csv verbatim
    synth_csv = REPO_ROOT / "Dataset" / "synthetic" / "synthetic_cases_default.csv"
    if not synth_csv.exists():
        raise FileNotFoundError(f"Missing default synthetic cohort CSV: {synth_csv}")
    shutil.copy2(synth_csv, out_dir / "synthetic_cases_default.csv")

    # 3. Export compact JSON of the real Kaggle CSV (1,200 rows, 29 real categorical traits)
    real_bundle = load_tridosha_dataset()
    X_real = real_bundle.X
    y_real = real_bundle.y
    cat_cols = list(real_bundle.categorical_cols)

    trait_summaries: List[Dict[str, Any]] = []
    for col in cat_cols:
        vc = X_real[col].astype(str).value_counts()
        trait_summaries.append(
            {
                "name": col,
                "n_levels": int(len(vc)),
                "missing_count": int(X_real[col].isna().sum()),
                "levels": [{"level": str(k), "count": int(v)} for k, v in vc.items()],
            }
        )

    records = []
    for i in range(len(X_real)):
        row = X_real.iloc[i]
        records.append(
            {
                "row_idx": i,
                "case_id": f"R-{i + 1:04d}",
                "dataset_label": str(y_real.iloc[i]),
                "traits": [str(row[c]) for c in cat_cols],
            }
        )

    with open(out_dir / "real_cases.json", "w", encoding="utf-8") as fh:
        json.dump(
            {
                "source": real_bundle.metadata["kaggle_slug"],
                "csv_member": real_bundle.metadata["csv_member"],
                "categorical_cols": cat_cols,
                "trait_summaries": trait_summaries,
                "records": records,
            },
            fh,
            separators=(",", ":"),
        )

    print(f"[export_ui_data] Exported verified UI assets to {out_dir}")


if __name__ == "__main__":
    export_ui_data()
