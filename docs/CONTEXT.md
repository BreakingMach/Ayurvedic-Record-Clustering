# Project context (read first, obey always)

## Problem statement
Benchmarking Gower, Euclidean, and Cosine Distances for Similarity-Based Grouping of Ayurvedic Patient Case Records.
1) Consolidate mixed categorical-numerical Ayurvedic patient case attributes.
2) Benchmark Gower, Euclidean, Cosine distances for patient case similarity.
3) Validate metric choice against diagnostic categories.
The three-distance benchmark is the headline. MI weighting, hybrid distance, spectral clustering are optional and labelled EXPLORATORY.

## Data facts (verified)
- Dataset/tridosha.zip contains Updated_Prakriti_With_Features.csv: 1200 rows, 29 categorical traits (3 levels each), label column "Dosha" with 6 classes: vata+pitta 624, Vata 264, Pitta 144, Kapha 72, pitta+kapha 48, vata+kapha 48 (normalise casing). No numeric columns. 1 duplicate row.
- Source: Kaggle adityaprashantshirke/prakriti-updated. Origin, license, and who assigned the labels are NOT stated. Call them "dataset-provided Dosha labels", never "practitioner-assigned".
- A random forest gets 100% CV accuracy from the 29 traits; no identical feature rows have different labels. Labels look like a deterministic function of the traits.
- On categorical-only data, Gower(uniform), Euclidean(one-hot), Cosine(one-hot) are monotone transforms of Hamming distance (Spearman 1.0).

## Problems in the existing code (to be fixed in later steps)
P1. The old benchmark script and the notebook invent Age_Vaya, BMI, Systolic_BP, Pulse_Nadi_Rate with np.random and shift three of them by the label index (y*2.2, y*4.5, -y*3.5): label leakage.
P2. evaluate_matrix chooses between spectral and complete-linkage by comparing ARI to the true labels: label-based selection.
P3. README baseline ARIs (0.4762, 0.3122, 0.2731, 0.1620) do not reproduce; silhouette is compared across different metric spaces.
P4. The UI's clinicalCohort.js generates 120 fake patients with trait names not in the CSV and cluster assignments and coordinates tuned to chosen scores; benchmarkData.js hard-codes results.

## Rules
R1. No hand-typed result numbers anywhere. Every number shown comes from results/*.json produced by code.
R2. Labels are never used for model or hyperparameter selection outside training folds. Unsupervised preprocessing (scaling ranges) may use all rows.
R3. Never tune anything to reach a target number. If Gower is not better, report that.
R4. All synthetic data and results are labelled SYNTHETIC/SIMULATED everywhere. The latent class in the simulation is ground truth by construction, not a practitioner label.
R5. Never invent patient records, features, or sources.
R6. Do not delete the original notebook; add a note at its top that it is superseded and contains leaked-vitals logic.
R7. Ambiguities: choose the most conservative option and log it in docs/DECISIONS.md.
R8. One git commit per step. After each step, stop and report; do not start the next step.
R9. Never reintroduce "SIH26008" or "Smart India Hackathon" anywhere.
