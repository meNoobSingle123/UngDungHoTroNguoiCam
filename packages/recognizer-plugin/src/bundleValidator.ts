import { WORD_IDS, type WordId } from '@sign/recognizer-contract';
import { argmax } from './wordLockDecoder.ts';

export interface BundleWordMeta {
  id: WordId;
  enabled: boolean;
  valAcc: number;
}

export interface RecognizerBundleMeta {
  version: string;
  preprocessVersion: string;
  windowMs: number;
  steps: number;
  features: number;
  threshold: number;
  margin: number;
  minHoldMs: number;
  cooldownMs: number;
  words: BundleWordMeta[];
}

export interface GoldenSample {
  sampleId: string;
  framesIn: number[][];
  logitsExpected: number[];
}

export interface BundleValidationResult {
  valid: boolean;
  errors: string[];
  enabledWords: WordId[];
}

export const EXPECTED_BUNDLE_SPEC = {
  windowMs: 1000,
  steps: 30,
  features: 262,
  minHoldMs: 500,
  cooldownMs: 700,
  minEnabledValAcc: 0.85,
  minGoldenSamples: 20,
} as const;

export function validateLabelsList(labels: unknown): string[] {
  const errors: string[] = [];
  if (!Array.isArray(labels)) {
    return ['labels.json must be a JSON array.'];
  }
  const expected = ['none', ...WORD_IDS];
  if (labels.length !== expected.length) {
    errors.push(`labels.json must have ${expected.length} entries, found ${labels.length}.`);
  }
  for (let i = 0; i < expected.length; i += 1) {
    if (labels[i] !== expected[i]) {
      errors.push(`labels[${i}] expected "${expected[i]}", got "${String(labels[i])}".`);
    }
  }
  return errors;
}

export function extractEnabledWords(
  meta: RecognizerBundleMeta,
  minValAcc: number = EXPECTED_BUNDLE_SPEC.minEnabledValAcc
): WordId[] {
  const wordMetaMap = new Map<string, BundleWordMeta>();
  for (const item of meta.words) {
    wordMetaMap.set(item.id, item);
  }
  return WORD_IDS.filter((id) => {
    const entry = wordMetaMap.get(id);
    return entry !== undefined && entry.enabled === true && entry.valAcc >= minValAcc;
  });
}

export function validateBundleMetadata(
  labels: unknown,
  meta: unknown
): BundleValidationResult {
  const errors: string[] = [...validateLabelsList(labels)];

  if (!meta || typeof meta !== 'object') {
    return {
      valid: false,
      errors: [...errors, 'meta.json must be a JSON object.'],
      enabledWords: [],
    };
  }

  const m = meta as Partial<RecognizerBundleMeta>;
  if (typeof m.version !== 'string' || m.version.trim() === '') {
    errors.push('meta.version must be a non-empty string.');
  }
  if (typeof m.preprocessVersion !== 'string' || m.preprocessVersion.trim() === '') {
    errors.push('meta.preprocessVersion must be a non-empty string.');
  }
  if (m.windowMs !== EXPECTED_BUNDLE_SPEC.windowMs) {
    errors.push(`meta.windowMs must be ${EXPECTED_BUNDLE_SPEC.windowMs}, got ${String(m.windowMs)}.`);
  }
  if (m.steps !== EXPECTED_BUNDLE_SPEC.steps) {
    errors.push(`meta.steps must be ${EXPECTED_BUNDLE_SPEC.steps}, got ${String(m.steps)}.`);
  }
  if (m.features !== EXPECTED_BUNDLE_SPEC.features) {
    errors.push(`meta.features must be ${EXPECTED_BUNDLE_SPEC.features}, got ${String(m.features)}.`);
  }
  if (typeof m.threshold !== 'number' || m.threshold <= 0 || m.threshold > 1) {
    errors.push(`meta.threshold must be in (0, 1], got ${String(m.threshold)}.`);
  }
  if (typeof m.margin !== 'number' || m.margin < 0 || m.margin >= 1) {
    errors.push(`meta.margin must be in [0, 1), got ${String(m.margin)}.`);
  }
  if (typeof m.minHoldMs !== 'number' || m.minHoldMs < EXPECTED_BUNDLE_SPEC.minHoldMs) {
    errors.push(
      `meta.minHoldMs must be >= ${EXPECTED_BUNDLE_SPEC.minHoldMs}, got ${String(m.minHoldMs)}.`
    );
  }
  if (m.cooldownMs !== EXPECTED_BUNDLE_SPEC.cooldownMs) {
    errors.push(
      `meta.cooldownMs must be ${EXPECTED_BUNDLE_SPEC.cooldownMs}, got ${String(m.cooldownMs)}.`
    );
  }

  if (!Array.isArray(m.words) || m.words.length !== WORD_IDS.length) {
    errors.push(`meta.words must cover all ${WORD_IDS.length} WORD_IDS.`);
  } else {
    const seen = new Set<string>();
    for (let i = 0; i < m.words.length; i += 1) {
      const w = m.words[i];
      if (!w || typeof w !== 'object') {
        errors.push(`meta.words[${i}] must be an object.`);
        continue;
      }
      if (!WORD_IDS.includes(w.id)) {
        errors.push(`meta.words[${i}].id "${String(w.id)}" is not a valid WordId.`);
      }
      if (seen.has(w.id)) {
        errors.push(`Duplicate word id in meta.words: "${w.id}".`);
      }
      seen.add(w.id);
      if (typeof w.enabled !== 'boolean') {
        errors.push(`meta.words[${i}].enabled must be boolean.`);
      }
      if (typeof w.valAcc !== 'number' || w.valAcc < 0 || w.valAcc > 1) {
        errors.push(`meta.words[${i}].valAcc must be in [0, 1].`);
      }
    }
    for (const id of WORD_IDS) {
      if (!seen.has(id)) {
        errors.push(`meta.words is missing required WordId "${id}".`);
      }
    }
  }

  const enabledWords =
    errors.length === 0 ? extractEnabledWords(m as RecognizerBundleMeta) : [];

  return {
    valid: errors.length === 0,
    errors,
    enabledWords,
  };
}

export interface GoldenParityResult {
  passed: boolean;
  totalSamples: number;
  matchedSamples: number;
  mismatches: Array<{ sampleId: string; expectedIdx: number; actualIdx: number }>;
}

/**
 * Integration acceptance check: plugin argmax must match golden logits_expected 100% across >= 20 samples.
 */
export function verifyGoldenArgmaxParity(
  samples: readonly GoldenSample[],
  runInference: (framesIn: readonly number[][]) => readonly number[]
): GoldenParityResult {
  if (samples.length < EXPECTED_BUNDLE_SPEC.minGoldenSamples) {
    throw new Error(
      `Golden suite requires at least ${EXPECTED_BUNDLE_SPEC.minGoldenSamples} samples, got ${samples.length}.`
    );
  }

  const mismatches: GoldenParityResult['mismatches'] = [];
  for (const sample of samples) {
    const actualLogits = runInference(sample.framesIn);
    const expectedIdx = argmax(sample.logitsExpected);
    const actualIdx = argmax(actualLogits);
    if (expectedIdx !== actualIdx) {
      mismatches.push({
        sampleId: sample.sampleId,
        expectedIdx,
        actualIdx,
      });
    }
  }

  return {
    passed: mismatches.length === 0,
    totalSamples: samples.length,
    matchedSamples: samples.length - mismatches.length,
    mismatches,
  };
}

