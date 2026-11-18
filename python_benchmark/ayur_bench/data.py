"""Data loading and schema typing for Dataset/tridosha.zip."""

from __future__ import annotations

import io
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd
import yaml

DOSHA_NORMALIZATION = {
    "vata": "Vata",
    "pitta": "Pitta",
    "kapha": "Kapha",
    "vata+pitta": "Vata+Pitta",
    "pitta+kapha": "Pitta+Kapha",
    "vata+kapha": "Vata+Kapha",
}

CANONICAL_CLASSES = [
    "Vata+Pitta",
    "Vata",
    "Pitta",
    "Kapha",
    "Pitta+Kapha",
    "Vata+Kapha",
]


@dataclass(frozen=True)
class DatasetBundle:
    """Typed container separating features, column modalities, and dataset-provided labels."""

    X: pd.DataFrame
    y: pd.Series
    numeric_cols: List[str]
    categorical_cols: List[str]
    metadata: Dict[str, Any]


def load_config(config_path: Optional[Path | str] = None) -> Dict[str, Any]:
    """Load YAML benchmark configuration."""
    path = Path(config_path) if config_path else Path(__file__).resolve().parent / "config.yaml"
    with open(path, "r", encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def _resolve_zip_path(zip_path: Optional[Path | str] = None) -> Path:
    if zip_path is not None:
        p = Path(zip_path)
        if not p.exists():
            raise FileNotFoundError(f"Dataset archive not found: {p}")
        return p
    repo_root = Path(__file__).resolve().parents[2]
    candidates = [
        repo_root / "Dataset" / "tridosha.zip",
        Path.cwd() / "Dataset" / "tridosha.zip",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise FileNotFoundError("Could not locate Dataset/tridosha.zip.")


def normalize_dosha_label(value: Any) -> str:
    """Normalize Dosha label casing to canonical form."""
    key = str(value).strip().lower()
    if key not in DOSHA_NORMALIZATION:
        raise ValueError(f"Unexpected Dosha label: {value!r}")
    return DOSHA_NORMALIZATION[key]


def load_tridosha_dataset(
    zip_path: Optional[Path | str] = None,
    label_col: str = "Dosha",
) -> DatasetBundle:
    """
    Load Updated_Prakriti_With_Features.csv from Dataset/tridosha.zip.

    - Normalises dataset-provided Dosha label casing to canonical 6-class names.
    - Reports exact duplicate rows without dropping them (conservative choice logged
      in docs/DECISIONS.md).
    - Returns typed feature frame X (explicit numeric vs categorical columns),
      label Series y, and provenance/integrity metadata.
    """
    archive_path = _resolve_zip_path(zip_path)
    with zipfile.ZipFile(archive_path, "r") as zf:
        csv_members = [m for m in zf.namelist() if m.lower().endswith(".csv")]
        if not csv_members:
            raise FileNotFoundError(f"No CSV file found inside {archive_path}")
        csv_member = csv_members[0]
        with zf.open(csv_member) as fh:
            raw_df = pd.read_csv(io.BytesIO(fh.read()))

    if label_col not in raw_df.columns:
        raise KeyError(f"Expected label column {label_col!r} not in {list(raw_df.columns)}")

    # Audit exact full-row duplicates prior to separating label; keep all rows per R7/DECISIONS.md
    dup_mask = raw_df.duplicated(keep="first")
    duplicate_indices = raw_df.index[dup_mask].tolist()
    duplicate_count = int(dup_mask.sum())

    y = raw_df[label_col].map(normalize_dosha_label).astype("string")
    y.name = label_col

    X_raw = raw_df.drop(columns=[label_col]).copy()
    numeric_cols = X_raw.select_dtypes(include=["number"]).columns.tolist()
    categorical_cols = [c for c in X_raw.columns if c not in numeric_cols]

    X = pd.DataFrame(index=X_raw.index)
    for col in numeric_cols:
        X[col] = pd.to_numeric(X_raw[col], errors="coerce").astype("float64")
    for col in categorical_cols:
        cleaned = X_raw[col].where(X_raw[col].notna(), pd.NA)
        cleaned = cleaned.map(lambda v: v.strip() if isinstance(v, str) else v)
        X[col] = cleaned.astype("category")

    # Feature-only duplicate check (diagnostic)
    feature_dup_count = int(X.duplicated(keep="first").sum())

    class_counts = {
        cls: int((y == cls).sum())
        for cls in CANONICAL_CLASSES
        if int((y == cls).sum()) > 0
    }

    metadata = {
        "source_archive": str(archive_path),
        "csv_member": csv_member,
        "kaggle_slug": "adityaprashantshirke/prakriti-updated",
        "label_provenance": "dataset-provided Dosha labels (origin, license, and annotator unstated)",
        "n_rows": int(len(X)),
        "n_features": int(X.shape[1]),
        "n_numeric": len(numeric_cols),
        "n_categorical": len(categorical_cols),
        "duplicate_row_count": duplicate_count,
        "duplicate_row_indices": duplicate_indices,
        "duplicates_retained": True,
        "feature_duplicate_count": feature_dup_count,
        "class_counts": class_counts,
    }

    return DatasetBundle(
        X=X,
        y=y,
        numeric_cols=numeric_cols,
        categorical_cols=categorical_cols,
        metadata=metadata,
    )
