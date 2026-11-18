/**
 * src/engine/distances.test.js
 *
 * Vitest parity tests for the JS distance engine.
 * Loads tests/fixtures/parity.json and asserts that all 5 metric variants
 * produce neighbour indices and distances matching Python within 1e-9.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  gowerDistance,
  euclideanModeImpute,
  cosineModeImpute,
  euclideanObservedOnly,
  cosineObservedOnly,
  topK,
  precomputeStats,
  precomputeZStats,
  precomputeGowerRanges,
} from './distances.js';

// ---------------------------------------------------------------------------
// Load fixtures & data
// ---------------------------------------------------------------------------
const FIXTURE_PATH = path.resolve(
  import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname),
  '../../tests/fixtures/parity.json'
);

const REAL_DATA_PATH = path.resolve(
  import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname),
  '../../public/data/real_records.json'
);

const SYNTH_DATA_PATH = path.resolve(
  import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname),
  '../../public/data/synthetic_records.json'
);

let fixture, realRecords, synthRecords;

try {
  fixture = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
  realRecords = JSON.parse(fs.readFileSync(REAL_DATA_PATH, 'utf8'));
  synthRecords = JSON.parse(fs.readFileSync(SYNTH_DATA_PATH, 'utf8'));
} catch (e) {
  console.error('Could not load fixture or records:', e.message);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function queryTraitsToIndices(queryObj, traits) {
  return traits.map((t) => {
    const v = queryObj[t.name];
    if (v === undefined || v === null) return null;
    const idx = t.levels.indexOf(v);
    return idx >= 0 ? idx : null;
  });
}

const TOLERANCE = 1e-9;

// ---------------------------------------------------------------------------
// 1. Real Data Parity
// ---------------------------------------------------------------------------
describe('Distance engine parity (real data, all 5 variants)', () => {
  const traits = realRecords.traits;
  const dbRows = realRecords.rows;
  const nRows = dbRows.length;
  const nTraits = traits.length;
  const { modes } = precomputeStats(realRecords);

  const queries = fixture.datasets.real.queries;

  it('has 60 real queries', () => {
    expect(queries.length).toBe(60);
  });

  for (const query of queries) {
    const qId = query.query_id;
    const qType = query.query_type;

    describe(`Query ${qId} (${qType})`, () => {
      const queryTraits = queryTraitsToIndices(query.traits, traits);

      it(`${qId}: gower top-10 matches within 1e-9`, () => {
        const expected = query.metrics.gower;
        const dists = gowerDistance(queryTraits, dbRows, nTraits, nRows);
        const { indices, distances } = topK(dists, 10);

        expect(indices).toEqual(expected.neighbor_indices);
        for (let i = 0; i < distances.length; i++) {
          expect(Math.abs(distances[i] - expected.neighbor_distances[i])).toBeLessThan(TOLERANCE);
        }
      });

      it(`${qId}: euclidean_modeimpute top-10 matches within 1e-9`, () => {
        const expected = query.metrics.euclidean_modeimpute;
        const dists = euclideanModeImpute(queryTraits, dbRows, traits, modes, nRows);
        const { indices, distances } = topK(dists, 10);

        expect(indices).toEqual(expected.neighbor_indices);
        for (let i = 0; i < distances.length; i++) {
          expect(Math.abs(distances[i] - expected.neighbor_distances[i])).toBeLessThan(TOLERANCE);
        }
      });

      it(`${qId}: cosine_modeimpute top-10 matches within 1e-9`, () => {
        const expected = query.metrics.cosine_modeimpute;
        const dists = cosineModeImpute(queryTraits, dbRows, traits, modes, nRows);
        const { indices, distances } = topK(dists, 10);

        expect(indices).toEqual(expected.neighbor_indices);
        for (let i = 0; i < distances.length; i++) {
          expect(Math.abs(distances[i] - expected.neighbor_distances[i])).toBeLessThan(TOLERANCE);
        }
      });

      it(`${qId}: euclidean_observed_only top-10 matches within 1e-9`, () => {
        const expected = query.metrics.euclidean_observed_only;
        const dists = euclideanObservedOnly(queryTraits, dbRows, traits, nRows);
        const { indices, distances } = topK(dists, 10);

        expect(indices).toEqual(expected.neighbor_indices);
        for (let i = 0; i < distances.length; i++) {
          expect(Math.abs(distances[i] - expected.neighbor_distances[i])).toBeLessThan(TOLERANCE);
        }
      });

      it(`${qId}: cosine_observed_only top-10 matches within 1e-9`, () => {
        const expected = query.metrics.cosine_observed_only;
        const dists = cosineObservedOnly(queryTraits, dbRows, traits, nRows);
        const { indices, distances } = topK(dists, 10);

        expect(indices).toEqual(expected.neighbor_indices);
        for (let i = 0; i < distances.length; i++) {
          expect(Math.abs(distances[i] - expected.neighbor_distances[i])).toBeLessThan(TOLERANCE);
        }
      });
    });
  }
});

// ---------------------------------------------------------------------------
// 2. Synthetic Data Parity
// ---------------------------------------------------------------------------
describe('Distance engine parity (synthetic data, all 5 variants)', () => {
  const traits = synthRecords.traits;
  const dbRows = synthRecords.rows.map((r) => r.traits);
  const dbVitals = synthRecords.rows.map((r) => r.vitals);
  const nRows = dbRows.length;
  const nTraits = traits.length;
  const { modes } = precomputeStats({ traits, rows: dbRows });
  const zStats = precomputeZStats(dbVitals);
  const gRanges = precomputeGowerRanges(synthRecords, synthRecords.vitals, dbVitals);
  const numericRanges = gRanges.slice(nTraits);

  // Numeric medians
  const medians = new Float64Array(dbVitals[0].length);
  for (let c = 0; c < dbVitals[0].length; c++) {
    const vals = dbVitals.map((r) => r[c]).filter((v) => v !== null && !isNaN(v)).sort((a, b) => a - b);
    medians[c] = vals[Math.floor(vals.length / 2)];
  }

  const queries = fixture.datasets.synthetic.queries;

  it('has 60 synthetic queries', () => {
    expect(queries.length).toBe(60);
  });

  for (const query of queries) {
    const qId = query.query_id;
    const qType = query.query_type;

    describe(`Synthetic Query ${qId} (${qType})`, () => {
      const queryTraits = queryTraitsToIndices(query.traits, traits);
      const queryVitals = synthRecords.vitals.map((v) => query.vitals[v]);

      it(`${qId}: gower top-10 matches within 1e-9`, () => {
        const expected = query.metrics.gower;
        const dists = gowerDistance(
          queryTraits, dbRows, nTraits, nRows,
          synthRecords.vitals, queryVitals, dbVitals, numericRanges
        );
        const { indices, distances } = topK(dists, 10);

        expect(indices).toEqual(expected.neighbor_indices);
        for (let i = 0; i < distances.length; i++) {
          expect(Math.abs(distances[i] - expected.neighbor_distances[i])).toBeLessThan(TOLERANCE);
        }
      });

      it(`${qId}: euclidean_modeimpute top-10 matches within 1e-9`, () => {
        const expected = query.metrics.euclidean_modeimpute;
        const dists = euclideanModeImpute(
          queryTraits, dbRows, traits, modes, nRows,
          queryVitals, dbVitals, zStats.means, zStats.stds, medians
        );
        const { indices, distances } = topK(dists, 10);

        expect(indices).toEqual(expected.neighbor_indices);
        for (let i = 0; i < distances.length; i++) {
          expect(Math.abs(distances[i] - expected.neighbor_distances[i])).toBeLessThan(TOLERANCE);
        }
      });

      it(`${qId}: cosine_modeimpute top-10 matches within 1e-9`, () => {
        const expected = query.metrics.cosine_modeimpute;
        const dists = cosineModeImpute(
          queryTraits, dbRows, traits, modes, nRows,
          queryVitals, dbVitals, zStats.means, zStats.stds, medians
        );
        const { indices, distances } = topK(dists, 10);

        expect(indices).toEqual(expected.neighbor_indices);
        for (let i = 0; i < distances.length; i++) {
          expect(Math.abs(distances[i] - expected.neighbor_distances[i])).toBeLessThan(TOLERANCE);
        }
      });

      it(`${qId}: euclidean_observed_only top-10 matches within 1e-9`, () => {
        const expected = query.metrics.euclidean_observed_only;
        const dists = euclideanObservedOnly(
          queryTraits, dbRows, traits, nRows,
          queryVitals, dbVitals, zStats.means, zStats.stds
        );
        const { indices, distances } = topK(dists, 10);

        expect(indices).toEqual(expected.neighbor_indices);
        for (let i = 0; i < distances.length; i++) {
          expect(Math.abs(distances[i] - expected.neighbor_distances[i])).toBeLessThan(TOLERANCE);
        }
      });

      it(`${qId}: cosine_observed_only top-10 matches within 1e-9`, () => {
        const expected = query.metrics.cosine_observed_only;
        const dists = cosineObservedOnly(
          queryTraits, dbRows, traits, nRows,
          queryVitals, dbVitals, zStats.means, zStats.stds
        );
        const { indices, distances } = topK(dists, 10);

        expect(indices).toEqual(expected.neighbor_indices);
        for (let i = 0; i < distances.length; i++) {
          expect(Math.abs(distances[i] - expected.neighbor_distances[i])).toBeLessThan(TOLERANCE);
        }
      });
    });
  }
});
