#!/usr/bin/env node
/**
 * Verification guard (Rule R1 & R9):
 *  1. Confirms public/data/{real_data,synthetic,expert_review}.json match results/*.json byte-for-byte.
 *  2. Collects every numeric value present in results/{real_data,synthetic,expert_review}.json.
 *  3. Inspects all JSX text content in src/components/*.jsx and src/App.jsx; fails if any
 *     hard-coded benchmark/result number displayed in the UI is not present in the results JSON.
 *  4. Fails if any forbidden legacy/slop tokens appear anywhere in src/.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const FORBIDDEN_PATTERNS = [
  /clinicalCohort/i,
  /benchmarkData/i,
  /mulberry32/i,
  /0\.8162/,
  /0\.8037/,
  /0\.2274/,
  /0\.4762/,
  /0\.3122/,
  /0\.2731/,
  /0\.1620/,
  /SIH26008/i,
  /Smart India Hackathon/i,
  /\bflawless\b/i,
  /\bmanifold\b/i,
  /production-ready/i,
  /\btelemetry\b/i,
];

function collectJsonNumbers(node, outSet) {
  if (typeof node === 'number' && Number.isFinite(node)) {
    outSet.add(String(node));
    for (let d = 0; d <= 6; d++) {
      outSet.add(node.toFixed(d));
    }
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) collectJsonNumbers(item, outSet);
    return;
  }
  if (node && typeof node === 'object') {
    for (const v of Object.values(node)) collectJsonNumbers(v, outSet);
  }
}

function listFiles(dir, exts) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...listFiles(full, exts));
    else if (exts.some((ext) => entry.name.endsWith(ext))) results.push(full);
  }
  return results;
}

let failures = 0;

// 1. Check byte-for-byte parity between results/*.json and public/data/*.json
for (const fname of ['real_data.json', 'synthetic.json', 'expert_review.json']) {
  const resPath = path.join(REPO_ROOT, 'results', fname);
  const pubPath = path.join(REPO_ROOT, 'public', 'data', fname);
  if (!fs.existsSync(resPath) || !fs.existsSync(pubPath)) {
    console.error(`[FAIL] Missing JSON artifact: ${fname}`);
    failures++;
    continue;
  }
  const a = fs.readFileSync(resPath);
  const b = fs.readFileSync(pubPath);
  if (!a.equals(b)) {
    console.error(`[FAIL] public/data/${fname} differs from results/${fname}. Re-run export_ui_data.py.`);
    failures++;
  }
}

// 2. Collect all numbers from results/*.json
const validJsonNumbers = new Set();
for (const fname of ['real_data.json', 'synthetic.json', 'expert_review.json']) {
  const obj = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'results', fname), 'utf8'));
  collectJsonNumbers(obj, validJsonNumbers);
}

// 3. Scan all src/ files for forbidden legacy/slop strings
const srcFiles = listFiles(path.join(REPO_ROOT, 'src'), ['.js', '.jsx', '.css']);
for (const file of srcFiles) {
  const rel = path.relative(REPO_ROOT, file);
  const content = fs.readFileSync(file, 'utf8');
  for (const pat of FORBIDDEN_PATTERNS) {
    if (pat.test(content)) {
      console.error(`[FAIL] Forbidden pattern ${pat} found in ${rel}`);
      failures++;
    }
  }
}

// 4. Scan JSX display text in src/components/*.jsx and src/App.jsx for numeric literals not in results JSON
const uiFiles = [
  path.join(REPO_ROOT, 'src', 'App.jsx'),
  ...listFiles(path.join(REPO_ROOT, 'src', 'components'), ['.jsx']),
];

// Allowed structural / non-result constants in JSX prose (e.g., "Top-5", "d = 0", "d = 2", "p < 0.05", "L2", "#1-#5", "k=3..8", vitals validation ranges, batch limit)
const ALLOWED_STRUCTURAL_TOKENS = new Set([
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '10',
  '14', '15', '18', '20', '45', '50', '55', '80', '130', '220', '1000',
  '0.05', '1200', '29'
]);

for (const file of uiFiles) {
  const rel = path.relative(REPO_ROOT, file);
  const content = fs.readFileSync(file, 'utf8');

  // Extract visible JSX text segments between '>' and '<' (excluding JS expression blocks `{...}`)
  const jsxTextMatches = content.matchAll(/>([^<>{}]+)</g);
  for (const match of jsxTextMatches) {
    const text = match[1].trim();
    if (!text) continue;
    // Find decimal numbers or percentages or integers in visible text
    const numMatches = text.matchAll(/(?<![A-Za-z_-])(\d+(?:\.\d+)?)(%?)/g);
    for (const nm of numMatches) {
      const rawNum = nm[1];
      const isPct = nm[2] === '%';
      // Structural labels like "Top-5", "d = 0", "p < 0.05"
      if (!isPct && ALLOWED_STRUCTURAL_TOKENS.has(rawNum)) continue;
      // Check if number exists directly in results JSON (or as decimal fraction if percentage)
      const asFraction = isPct ? (Number(rawNum) / 100).toFixed(4) : null;
      const found =
        validJsonNumbers.has(rawNum) ||
        (asFraction !== null && validJsonNumbers.has(asFraction));
      if (!found) {
        console.error(
          `[FAIL] Unverified UI number "${nm[0]}" in ${rel} JSX text: "${text}"`
        );
        failures++;
      }
    }
  }
}

if (failures > 0) {
  console.error(`\n[check_ui_numbers] FAILED with ${failures} violation(s).`);
  process.exit(1);
}

console.log(
  `[check_ui_numbers] PASSED: ${uiFiles.length} UI files checked against ${validJsonNumbers.size} JSON numeric tokens; 0 unverified numbers, 0 forbidden tokens, public/data matches results/*.json.`
);
