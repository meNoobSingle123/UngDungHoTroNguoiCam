import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { WORD_IDS } from '@sign/recognizer-contract';
import { VI_STRINGS } from '../../src/core/i18n/vi.ts';
import {
  FONT_SCALE_MULTIPLIERS,
  HIGH_CONTRAST_COLORS,
  LIGHT_COLORS,
  MOTION,
  SOS_COLORS,
  getContrastRatio,
  getScaledFontSizes,
  resolveDefaultFontScaleLevel,
  validateThemeContrast,
} from '../../src/core/theme/tokens.ts';
import {
  SOS_FLASH_HZ,
  SOS_HOLD_MS,
  createSosMachine,
} from '../../src/features/sos/sosMachine.ts';
import {
  CORRECTION_WINDOW_MS,
  HAND_MISSING_THRESHOLD_MS,
  REVIEW_DELAY_MS,
  createCameraSentenceFlow,
} from '../../src/features/camera/cameraSentenceFlow.ts';
import scanner from '../../scripts/release-bundle-scanner.cjs';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('U-01 Theme tokens & WCAG contrast', () => {
  it('passes WCAG >= 4.5:1 for light, >= 7:1 for high contrast, and >= 4.5:1 for SOS', () => {
    assert.deepEqual(validateThemeContrast(LIGHT_COLORS, 4.5), []);
    assert.deepEqual(validateThemeContrast(HIGH_CONTRAST_COLORS, 7), []);
    assert.ok(getContrastRatio(SOS_COLORS.text, SOS_COLORS.bg) >= 4.5);
    assert.ok(getContrastRatio(SOS_COLORS.flashAltText, SOS_COLORS.flashAltBg) >= 4.5);
  });

  it('defaults to large (x1.6) when system fontScale >= 1.3 and scales all 4 levels', () => {
    assert.equal(resolveDefaultFontScaleLevel(1.0), 'small');
    assert.equal(resolveDefaultFontScaleLevel(1.3), 'large');
    assert.deepEqual(Object.values(FONT_SCALE_MULTIPLIERS), [1, 1.25, 1.6, 2.1]);
    assert.equal(getScaledFontSizes('max').body, Math.round(16 * 2.1));
    assert.ok(MOTION.sosFlashHz <= 3);
  });
});

describe('U-02 SOS state machine', () => {
  it('enforces exact 1500ms hold, cancels early with hint, and asserts SOS_FLASH_HZ <= 3', () => {
    assert.equal(SOS_HOLD_MS, 1500);
    assert.equal(SOS_FLASH_HZ, 2);
    assert.ok(SOS_FLASH_HZ <= 3);

    const sos = createSosMachine();
    assert.equal(sos.getSnapshot().state, 'idle');

    // Release at 1499ms -> does NOT activate and shows hold hint
    sos.pressIn(1000);
    assert.equal(sos.tick(2499).state, 'arming');
    const cancelled = sos.pressOut();
    assert.equal(cancelled.state, 'idle');
    assert.equal(cancelled.hint, VI_STRINGS.sos.holdHint);

    // Hold full 1500ms -> activates -> stopping -> idle
    sos.pressIn(5000);
    assert.equal(sos.tick(6500).state, 'active');
    assert.equal(sos.requestStop().state, 'stopping');
    assert.equal(sos.completeStop().state, 'idle');
  });
});

describe('U-08 Camera sentence flow & MockEngine-free production src', () => {
  it('builds "Tôi muốn ăn." from locked(toi), locked(muon), locked(an) after 2s review and supports 30s correction', () => {
    const spoken: string[] = [];
    const history: Array<{ text: string; words: string[]; tMs: number }> = [];

    const flow = createCameraSentenceFlow({
      enabledWords: WORD_IDS,
      onSpeak: (text) => spoken.push(text),
      onRecordHistory: (entry) => history.push(entry),
    });

    flow.startCapture(0);
    flow.handleEvent({ type: 'hand', present: true, fps: 30 }, 100);
    flow.handleEvent({ type: 'locked', word: 'toi', p: 0.95, tMs: 600 }, 600);
    flow.handleEvent({ type: 'locked', word: 'muon', p: 0.93, tMs: 1400 }, 1400);
    flow.handleEvent({ type: 'locked', word: 'an', p: 0.94, tMs: 2200 }, 2200);

    const reviewing = flow.finishCapture('none', 2500);
    assert.equal(reviewing.phase, 'reviewing');
    assert.equal(reviewing.pendingSentence, 'Tôi muốn ăn.');

    // Before 2000ms review elapses -> not spoken yet
    flow.tick(2500 + REVIEW_DELAY_MS - 1);
    assert.equal(spoken.length, 0);

    // At 2000ms review -> spoken and saved to history
    flow.tick(2500 + REVIEW_DELAY_MS);
    assert.deepEqual(spoken, ['Tôi muốn ăn.']);
    assert.equal(history.length, 1);

    // Correction within 30 seconds -> speaks apology and clears sentence
    assert.equal(flow.correctLastSentence(2500 + REVIEW_DELAY_MS + CORRECTION_WINDOW_MS), true);
    assert.equal(spoken[1], VI_STRINGS.camera.correctionSpeech);
    assert.equal(flow.getSnapshot().committedSentence, null);
  });

  it('supports canceling during 2s review, dropping words, unmatched review, missing hand >3s, and experimental words', () => {
    const spoken: string[] = [];
    const flow = createCameraSentenceFlow({
      enabledWords: ['toi', 'muon', 'an'],
      onSpeak: (text) => spoken.push(text),
    });

    flow.startCapture(0);
    // Word outside enabledWords is NOT added, shows "thử nghiệm"
    flow.handleEvent({ type: 'locked', word: 'xin_loi', p: 0.9, tMs: 500 }, 500);
    assert.equal(flow.getSnapshot().composingWords.length, 0);
    assert.equal(flow.getSnapshot().experimentalWord?.label, 'thử nghiệm');

    // Hand missing >= 3000ms shows prompt
    flow.handleEvent({ type: 'hand', present: false, fps: 0 }, 1000);
    flow.tick(1000 + HAND_MISSING_THRESHOLD_MS);
    assert.equal(flow.getSnapshot().notice, VI_STRINGS.camera.noHandPrompt);

    // Unmatched sequence returns unmatched_review and never speaks
    flow.handleEvent({ type: 'hand', present: true, fps: 30 }, 4200);
    flow.handleEvent({ type: 'locked', word: 'muon', p: 0.9, tMs: 4500 }, 4500);
    flow.handleEvent({ type: 'locked', word: 'toi', p: 0.9, tMs: 5200 }, 5200);
    flow.handleEvent({ type: 'locked', word: 'an', p: 0.9, tMs: 5900 }, 5900);
    assert.equal(flow.finishCapture('none', 6000).phase, 'unmatched_review');
    assert.equal(spoken.length, 0);

    // Cancel during 2s review prevents speaking
    flow.startCapture(7000);
    flow.handleEvent({ type: 'locked', word: 'toi', p: 0.9, tMs: 7100 }, 7100);
    flow.handleEvent({ type: 'locked', word: 'muon', p: 0.9, tMs: 7200 }, 7200);
    flow.handleEvent({ type: 'locked', word: 'an', p: 0.9, tMs: 7300 }, 7300);
    flow.finishCapture('none', 7400);
    flow.cancelReview();
    flow.tick(10000);
    assert.equal(spoken.length, 0);

    // dropLastWord & removeWordAt
    flow.dropLastWord();
    assert.equal(flow.getSnapshot().composingWords.length, 2);
    flow.removeWordAt(0);
    assert.equal(flow.getSnapshot().composingWords.length, 1);
  });

  it('src/ contains zero MockEngine or recognizer-mock references', () => {
    assert.deepEqual(scanner.verifyProductionSourceExclusion(ROOT_DIR, ['src']), []);
  });
});

