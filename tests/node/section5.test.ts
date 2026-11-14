import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  WORD_IDS,
  type RecognizerEngine,
  type RecognizerEvent,
} from '@sign/recognizer-contract';
import {
  MOCK_ENGINE_BUNDLE_MARKER,
  MockEngine,
  createMockDebugController,
} from '@sign/recognizer-mock';
import {
  MediaPipeLiteRtEngine,
  WordLockDecoder,
  extractEnabledWords,
  validateBundleMetadata,
  verifyGoldenArgmaxParity,
  type GoldenSample,
  type RecognizerBundleMeta,
} from '@sign/recognizer-plugin';
import {
  UNCLEAR_GESTURE_PROMPT,
  WORD_LABELS,
  createRecognizerSession,
  getWordDisplayText,
  isMockBadgeVisible,
} from '@sign/sign-ui';
import { createAppEngine } from '../../src/features/camera/createAppEngine.ts';
import scanner from '../../scripts/release-bundle-scanner.cjs';
import { validateBundleDirectory } from '../../scripts/validate-recognizer-bundle.mjs';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function setGlobalDev(value: boolean | undefined): void {
  const g = globalThis as { __DEV__?: boolean };
  if (value === undefined) {
    delete g.__DEV__;
  } else {
    g.__DEV__ = value;
  }
}

afterEach(() => {
  setGlobalDev(undefined);
});

describe('1. Contract & docs/spec parity', () => {
  it('WORD_IDS matches docs/spec/words.json and labels.json in exact order', () => {
    const words = JSON.parse(
      fs.readFileSync(path.join(ROOT_DIR, 'docs/spec/words.json'), 'utf8')
    ) as Array<{ id: string; vi: string; group: string }>;
    const labels = JSON.parse(
      fs.readFileSync(path.join(ROOT_DIR, 'docs/spec/recognizer-bundle/labels.json'), 'utf8')
    ) as string[];

    assert.equal(WORD_IDS.length, 20);
    assert.deepEqual(
      words.map((w) => w.id),
      [...WORD_IDS]
    );
    assert.deepEqual(labels, ['none', ...WORD_IDS]);
    for (const w of words) {
      assert.equal(WORD_LABELS[w.id as keyof typeof WORD_LABELS]?.vi, w.vi);
      assert.equal(WORD_LABELS[w.id as keyof typeof WORD_LABELS]?.group, w.group);
      assert.equal(getWordDisplayText(w.id as keyof typeof WORD_LABELS), w.vi);
    }
  });

  it('meta.example.json passes bundle validation and filters enabledWords >= 85%', () => {
    const labels = JSON.parse(
      fs.readFileSync(path.join(ROOT_DIR, 'docs/spec/recognizer-bundle/labels.json'), 'utf8')
    );
    const meta = JSON.parse(
      fs.readFileSync(path.join(ROOT_DIR, 'docs/spec/recognizer-bundle/meta.example.json'), 'utf8')
    ) as RecognizerBundleMeta;

    const result = validateBundleMetadata(labels, meta);
    assert.equal(result.valid, true, result.errors.join('; '));
    assert.deepEqual(result.enabledWords, extractEnabledWords(meta, 0.85));
    assert.ok(result.enabledWords.includes('xin_chao'));
    assert.ok(!result.enabledWords.includes('xin_loi'));
  });
});

describe('2. MockEngine & __DEV__ enforcement', () => {
  it('refuses instantiation when __DEV__ is false or undefined', () => {
    setGlobalDev(false);
    assert.throws(() => new MockEngine(), /__DEV__ === true/);

    setGlobalDev(undefined);
    assert.throws(() => new MockEngine(), /__DEV__ === true/);
  });

  it('works in __DEV__ === true and emits state, hand, candidate, locked, unclear', async () => {
    setGlobalDev(true);
    const engine = new MockEngine();
    assert.equal(engine.marker, MOCK_ENGINE_BUNDLE_MARKER);
    assert.equal(engine.info().engine, 'mock');

    const events: RecognizerEvent[] = [];
    const unsubscribe = engine.subscribe((e) => events.push(e));

    await engine.start({ facing: 'front' });
    const debug = createMockDebugController(engine);
    debug.selectWord('cam_on');
    debug.triggerCandidate(0.7, 0.2);
    debug.triggerLocked(0.95);
    debug.triggerUnclear();
    await engine.stop();
    unsubscribe();

    assert.deepEqual(
      events.map((e) => e.type),
      ['state', 'state', 'hand', 'candidate', 'locked', 'unclear', 'hand', 'state']
    );
    assert.deepEqual(events[3], { type: 'candidate', word: 'cam_on', p: 0.7, p2: 0.2 });
    assert.equal(events[4].type, 'locked');
    if (events[4].type === 'locked') {
      assert.equal(events[4].word, 'cam_on');
      assert.equal(events[4].p, 0.95);
    }
  });
});

describe('3. UI session flow rules (packages/sign-ui)', () => {
  it('never locks from candidate, adds word only on locked, and shows unclear prompt on unclear', () => {
    setGlobalDev(true);
    const engine = new MockEngine();
    const session = createRecognizerSession(engine, true);

    assert.equal(session.getSnapshot().showMockBadge, true);
    assert.equal(isMockBadgeVisible(engine, false), false);

    engine.emitCandidate('xin_chao', 0.85, 0.1);
    assert.equal(session.getSnapshot().recognizedWords.length, 0);
    assert.equal(session.getSnapshot().candidate?.word, 'xin_chao');

    engine.emitUnclear(1000);
    assert.equal(session.getSnapshot().recognizedWords.length, 0);
    assert.equal(session.getSnapshot().statusNotice, UNCLEAR_GESTURE_PROMPT);
    assert.equal(session.getSnapshot().statusNotice, 'Chưa rõ cử chỉ, xin làm lại');

    engine.emitLocked('xin_chao', 0.92, 1600);
    assert.equal(session.getSnapshot().recognizedWords.length, 1);
    assert.equal(session.getSnapshot().recognizedWords[0].word, 'xin_chao');
    assert.equal(session.getSnapshot().statusNotice, null);

    session.dispose();
  });

  it('counts only info().enabledWords and labels other words as "thử nghiệm"', () => {
    setGlobalDev(true);
    const engine = new MockEngine({ enabledWords: ['xin_chao'] });
    const session = createRecognizerSession(engine, true);

    // Non-enabled word candidate shows experimental flag
    engine.emitCandidate('xin_loi', 0.88, 0.05);
    assert.equal(session.getSnapshot().candidate?.isExperimental, true);

    // Non-enabled word locked is NOT counted in recognizedWords; shows "thử nghiệm"
    engine.emitLocked('xin_loi', 0.91, 1200);
    assert.equal(session.getSnapshot().recognizedWords.length, 0);
    assert.equal(session.getSnapshot().experimentalWord?.word, 'xin_loi');
    assert.equal(session.getSnapshot().experimentalWord?.label, 'thử nghiệm');

    // Enabled word locked IS counted in recognizedWords and clears experimentalWord
    engine.emitLocked('xin_chao', 0.95, 2000);
    assert.equal(session.getSnapshot().recognizedWords.length, 1);
    assert.equal(session.getSnapshot().recognizedWords[0].word, 'xin_chao');
    assert.equal(session.getSnapshot().experimentalWord, null);

    session.dispose();
  });
});

describe('4. Engine-side WordLockDecoder & Golden parity', () => {
  function makeProbs(wordIndex1Based: number, p1: number, secondIndex1Based: number, p2: number): number[] {
    const arr = new Array(WORD_IDS.length + 1).fill(0);
    arr[wordIndex1Based] = p1;
    arr[secondIndex1Based] = p2;
    const rem = Math.max(0, 1 - p1 - p2);
    arr[0] = rem;
    return arr;
  }

  it('requires threshold >= 0.8, margin >= 0.2, hold >= 500ms, and enforces 700ms cooldown', () => {
    const decoder = new WordLockDecoder({
      threshold: 0.8,
      margin: 0.2,
      minHoldMs: 500,
      cooldownMs: 700,
    });

    // t=0: strong candidate for xin_chao (idx 1)
    let evts = decoder.stepProbabilities(makeProbs(1, 0.85, 2, 0.1), 0);
    assert.equal(evts[0]?.type, 'candidate');

    // t=400: still holding (< 500ms) -> still candidate
    evts = decoder.stepProbabilities(makeProbs(1, 0.88, 2, 0.08), 400);
    assert.equal(evts[0]?.type, 'candidate');

    // t=500: held >= 500ms -> locked!
    evts = decoder.stepProbabilities(makeProbs(1, 0.9, 2, 0.05), 500);
    assert.equal(evts[0]?.type, 'locked');

    // t=800: inside 700ms cooldown (500 + 700 = 1200) -> suppressed
    evts = decoder.stepProbabilities(makeProbs(1, 0.95, 2, 0.02), 800);
    assert.equal(evts.length, 0);

    // t=1250: after cooldown, ambiguous gesture (0.55 vs 0.40) -> candidate then unclear after 500ms
    evts = decoder.stepProbabilities(makeProbs(2, 0.55, 3, 0.4), 1250);
    assert.equal(evts[0]?.type, 'candidate');

    evts = decoder.stepProbabilities(makeProbs(2, 0.55, 3, 0.4), 1800);
    assert.equal(evts[0]?.type, 'unclear');
  });

  it('verifies 100% golden argmax parity across >= 20 samples and MediaPipeLiteRtEngine info', async () => {
    const labels = JSON.parse(
      fs.readFileSync(path.join(ROOT_DIR, 'docs/spec/recognizer-bundle/labels.json'), 'utf8')
    ) as string[];
    const meta = JSON.parse(
      fs.readFileSync(path.join(ROOT_DIR, 'docs/spec/recognizer-bundle/meta.example.json'), 'utf8')
    ) as RecognizerBundleMeta;

    const samples: GoldenSample[] = Array.from({ length: 20 }, (_, i) => {
      const logits = new Array(21).fill(-2);
      logits[i + 1] = 3.5;
      return {
        sampleId: `sample_${String(i).padStart(2, '0')}`,
        framesIn: [[i]],
        logitsExpected: logits,
      };
    });

    const parity = verifyGoldenArgmaxParity(samples, (frames) => {
      const idx = frames[0][0] + 1;
      const out = new Array(21).fill(-1);
      out[idx] = 2.0;
      return out;
    });

    assert.equal(parity.passed, true);
    assert.equal(parity.matchedSamples, 20);

    const engine = new MediaPipeLiteRtEngine({
      labels,
      meta,
      driver: {
        async startCameraAndModel() {},
        async stop() {},
      },
    });
    assert.equal(engine.info().engine, 'mediapipe-litert');
    assert.deepEqual(engine.info().enabledWords, extractEnabledWords(meta));
    await engine.start({ facing: 'back' });
    await engine.stop();
  });

  it('rejects disabled words and resets hold timer when top word changes mid-hold', () => {
    const decoder = new WordLockDecoder({
      threshold: 0.8,
      margin: 0.2,
      minHoldMs: 500,
      cooldownMs: 700,
      enabledWords: ['xin_chao'],
    });

    // Enabled word xin_chao (idx 1) held for 300ms, then switches to cam_on (idx 2, disabled)
    let evts = decoder.stepProbabilities(makeProbs(1, 0.9, 3, 0.05), 0);
    assert.equal(evts[0]?.type, 'candidate');

    evts = decoder.stepProbabilities(makeProbs(1, 0.9, 3, 0.05), 300);
    assert.equal(evts[0]?.type, 'candidate');

    // Disabled word cam_on held >= 500ms must emit unclear, never locked
    evts = decoder.stepProbabilities(makeProbs(2, 0.92, 3, 0.05), 350);
    assert.equal(evts[0]?.type, 'candidate');
    evts = decoder.stepProbabilities(makeProbs(2, 0.92, 3, 0.05), 900);
    assert.equal(evts[0]?.type, 'unclear');
  });

  it('MediaPipeLiteRtEngine emits locked through decoder on native frame callbacks', async () => {
    const labels = JSON.parse(
      fs.readFileSync(path.join(ROOT_DIR, 'docs/spec/recognizer-bundle/labels.json'), 'utf8')
    ) as string[];
    const meta = JSON.parse(
      fs.readFileSync(path.join(ROOT_DIR, 'docs/spec/recognizer-bundle/meta.example.json'), 'utf8')
    ) as RecognizerBundleMeta;

    let emitFrame:
      | ((logits: readonly number[], tMs: number, fps: number, handPresent: boolean) => void)
      | undefined;

    const engine = new MediaPipeLiteRtEngine({
      labels,
      meta,
      driver: {
        async startCameraAndModel(opts) {
          emitFrame = opts.onFrameLogits;
        },
        async stop() {},
      },
    });

    const events: RecognizerEvent[] = [];
    const unsub = engine.subscribe((e) => events.push(e));
    await engine.start({ facing: 'front' });

    const logits = new Array(21).fill(-5);
    logits[1] = 5; // xin_chao (enabled in meta.example.json)
    emitFrame?.(logits, 100, 30, true);
    emitFrame?.(logits, 650, 30, true);
    await engine.stop();
    unsub();

    assert.ok(events.some((e) => e.type === 'locked' && e.word === 'xin_chao'));
  });
});

describe('5. Release bundle exclusion & app wiring', () => {
  it('createAppEngine loads MockEngine only when __DEV__ === true and uses production engine otherwise', () => {
    const prodEngine: RecognizerEngine = {
      async start() {},
      async stop() {},
      subscribe: () => () => {},
      info: () => ({
        engine: 'mediapipe-litert',
        modelVersion: '1.0.0',
        preprocessVersion: '1.0.0',
        enabledWords: ['xin_chao'],
      }),
    };

    setGlobalDev(false);
    const releaseResult = createAppEngine({
      useDevEngine: true,
      createProductionEngine: () => prodEngine,
      loadDevEngine: () => {
        throw new Error('Should never load dev engine in release mode');
      },
    });
    assert.equal(releaseResult.info().engine, 'mediapipe-litert');

    setGlobalDev(true);
    const devResult = createAppEngine({
      useDevEngine: true,
      createProductionEngine: () => prodEngine,
      loadDevEngine: () => new MockEngine(),
    });
    assert.equal(devResult.info().engine, 'mock');
  });

  it('release-bundle-scanner passes on repo and fails on simulated MockEngine leak', () => {
    assert.deepEqual(scanner.checkUiContractBoundary(ROOT_DIR), []);
    assert.deepEqual(scanner.verifyProductionSourceExclusion(ROOT_DIR), []);
    assert.deepEqual(scanner.scanReleaseBundleArtifacts(ROOT_DIR).errors, []);

    const leaked = scanner.scanTextForMockTokens(
      'var x = MockEngine; require("@sign/recognizer-mock");',
      'leaked.bundle.js'
    );
    assert.ok(leaked.length >= 2);
  });

  it('validateBundleDirectory passes valid bundle >=20 golden samples and fails incomplete bundles', () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sign-bundle-test-'));
    try {
      const validDir = path.join(tmpRoot, 'valid-bundle');
      fs.mkdirSync(path.join(validDir, 'golden'), { recursive: true });
      fs.writeFileSync(path.join(validDir, 'model.tflite'), Buffer.from('tflite-bytes'));
      fs.copyFileSync(
        path.join(ROOT_DIR, 'docs/spec/recognizer-bundle/labels.json'),
        path.join(validDir, 'labels.json')
      );
      fs.copyFileSync(
        path.join(ROOT_DIR, 'docs/spec/recognizer-bundle/meta.example.json'),
        path.join(validDir, 'meta.json')
      );
      for (let i = 0; i < 20; i += 1) {
        const sampleDir = path.join(validDir, 'golden', `s_${i}`);
        fs.mkdirSync(sampleDir, { recursive: true });
        fs.writeFileSync(path.join(sampleDir, 'frames_in.npz'), Buffer.from('npz'));
        fs.writeFileSync(path.join(sampleDir, 'logits_expected.npy'), Buffer.from('npy'));
      }

      const ok = validateBundleDirectory(validDir);
      assert.equal(ok.valid, true, ok.errors.join('; '));
      assert.equal(ok.goldenCount, 20);
      assert.ok(ok.enabledWords.includes('xin_chao'));

      const brokenDir = path.join(tmpRoot, 'broken-bundle');
      fs.mkdirSync(brokenDir, { recursive: true });
      const bad = validateBundleDirectory(brokenDir);
      assert.equal(bad.valid, false);
      assert.ok(bad.errors.some((e) => e.includes('model.tflite')));
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
});
