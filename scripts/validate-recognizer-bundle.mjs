import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

await import('./node-ts-register.mjs');
const { EXPECTED_BUNDLE_SPEC, validateBundleMetadata } = await import(
  '../packages/recognizer-plugin/src/bundleValidator.ts'
);

function findLogitsExpectedFile(sampleDir) {
  const candidates = [
    'logits_expected.npy',
    'logits_expected.npz',
    'logits_expected.json',
    'logits_expected',
  ];
  return candidates.find((name) => {
    const p = path.join(sampleDir, name);
    return fs.existsSync(p) && fs.statSync(p).isFile() && fs.statSync(p).size > 0;
  });
}

/**
 * Validates an AI-delivered `recognizer-bundle/` directory on disk.
 */
export function validateBundleDirectory(bundleDir) {
  const errors = [];
  if (!fs.existsSync(bundleDir) || !fs.statSync(bundleDir).isDirectory()) {
    return {
      valid: false,
      errors: [`Bundle directory not found: ${bundleDir}`],
      enabledWords: [],
      goldenCount: 0,
    };
  }

  const modelPath = path.join(bundleDir, 'model.tflite');
  if (!fs.existsSync(modelPath) || !fs.statSync(modelPath).isFile() || fs.statSync(modelPath).size === 0) {
    errors.push('Missing or empty model.tflite.');
  }

  const labelsPath = path.join(bundleDir, 'labels.json');
  const metaPath = path.join(bundleDir, 'meta.json');
  let labels;
  let meta;

  if (!fs.existsSync(labelsPath)) {
    errors.push('Missing labels.json.');
  } else {
    try {
      labels = JSON.parse(fs.readFileSync(labelsPath, 'utf8'));
    } catch (err) {
      errors.push(`Invalid JSON in labels.json: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (!fs.existsSync(metaPath)) {
    errors.push('Missing meta.json.');
  } else {
    try {
      meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    } catch (err) {
      errors.push(`Invalid JSON in meta.json: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  let enabledWords = [];
  if (labels !== undefined && meta !== undefined) {
    const metaCheck = validateBundleMetadata(labels, meta);
    errors.push(...metaCheck.errors);
    enabledWords = metaCheck.enabledWords;
  }

  const goldenDir = path.join(bundleDir, 'golden');
  let goldenCount = 0;

  if (!fs.existsSync(goldenDir) || !fs.statSync(goldenDir).isDirectory()) {
    errors.push('Missing golden/ directory.');
  } else {
    const entries = fs.readdirSync(goldenDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const sampleDir = path.join(goldenDir, entry.name);
      const framesPath = path.join(sampleDir, 'frames_in.npz');
      const hasFrames =
        fs.existsSync(framesPath) && fs.statSync(framesPath).isFile() && fs.statSync(framesPath).size > 0;
      const logitsFile = findLogitsExpectedFile(sampleDir);

      if (!hasFrames) {
        errors.push(`golden/${entry.name}: missing or empty frames_in.npz.`);
      }
      if (!logitsFile) {
        errors.push(`golden/${entry.name}: missing or empty logits_expected.`);
      }
      if (hasFrames && logitsFile) {
        goldenCount += 1;
      }
    }

    if (goldenCount < EXPECTED_BUNDLE_SPEC.minGoldenSamples) {
      errors.push(
        `golden/ requires >= ${EXPECTED_BUNDLE_SPEC.minGoldenSamples} valid samples, found ${goldenCount}.`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    enabledWords,
    goldenCount,
  };
}

const isCliEntrypoint =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntrypoint) {
  const targetDir = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve('recognizer-bundle');
  const result = validateBundleDirectory(targetDir);
  if (!result.valid) {
    console.error(`Bundle validation FAILED for ${targetDir}:`);
    for (const err of result.errors) {
      console.error(` - ${err}`);
    }
    process.exit(1);
  }
  console.log(
    `Bundle validation PASSED for ${targetDir} (golden samples: ${result.goldenCount}, enabledWords: ${result.enabledWords.length}).`
  );
}

