import {
  WORD_IDS,
  type RecognizerEvent,
  type WordId,
} from '@sign/recognizer-contract';

export interface WordLockConfig {
  threshold: number;
  margin: number;
  minHoldMs: number;
  cooldownMs: number;
  enabledWords?: readonly WordId[];
  /** Minimum non-none probability to consider a user attempt active before emitting unclear. */
  unclearAttemptMinProb?: number;
}

export const DEFAULT_WORD_LOCK_CONFIG: WordLockConfig = {
  threshold: 0.8,
  margin: 0.2,
  minHoldMs: 500,
  cooldownMs: 700,
  unclearAttemptMinProb: 0.25,
};

export function argmax(values: readonly number[]): number {
  if (values.length === 0) {
    throw new Error('Cannot compute argmax of an empty vector.');
  }
  let bestIdx = 0;
  let bestVal = values[0];
  for (let i = 1; i < values.length; i += 1) {
    if (values[i] > bestVal) {
      bestVal = values[i];
      bestIdx = i;
    }
  }
  return bestIdx;
}

export function softmax(logits: readonly number[]): number[] {
  if (logits.length === 0) {
    throw new Error('Cannot compute softmax of an empty vector.');
  }
  let maxLogit = logits[0];
  for (let i = 1; i < logits.length; i += 1) {
    if (logits[i] > maxLogit) {
      maxLogit = logits[i];
    }
  }
  const exps = logits.map((v) => Math.exp(v - maxLogit));
  const sum = exps.reduce((acc, v) => acc + v, 0);
  return exps.map((v) => v / sum);
}

/**
 * Engine-side stability & locking state machine:
 * - Holds the same top word >= minHoldMs (default 500ms)
 * - Requires top probability >= threshold (default 0.8) and (p1 - p2) >= margin (default 0.2)
 * - Enforces cooldownMs (default 700ms) after each lock
 * - Emits `unclear` when an active gesture attempt fails confidence checks over minHoldMs
 */
export class WordLockDecoder {
  private readonly config: Required<Omit<WordLockConfig, 'enabledWords'>>;
  private readonly enabledSet: Set<WordId>;

  private holdWord: WordId | null = null;
  private holdStartMs = 0;
  private attemptStartMs: number | null = null;
  private cooldownUntilMs = -Infinity;
  private lastUnclearAtMs = -Infinity;

  constructor(config: Partial<WordLockConfig> = {}) {
    this.config = {
      threshold: config.threshold ?? DEFAULT_WORD_LOCK_CONFIG.threshold,
      margin: config.margin ?? DEFAULT_WORD_LOCK_CONFIG.margin,
      minHoldMs: config.minHoldMs ?? DEFAULT_WORD_LOCK_CONFIG.minHoldMs,
      cooldownMs: config.cooldownMs ?? DEFAULT_WORD_LOCK_CONFIG.cooldownMs,
      unclearAttemptMinProb:
        config.unclearAttemptMinProb ?? DEFAULT_WORD_LOCK_CONFIG.unclearAttemptMinProb!,
    };
    this.enabledSet = new Set<WordId>(config.enabledWords ?? WORD_IDS);
  }

  public reset(): void {
    this.holdWord = null;
    this.holdStartMs = 0;
    this.attemptStartMs = null;
    this.cooldownUntilMs = -Infinity;
    this.lastUnclearAtMs = -Infinity;
  }

  /**
   * Process probabilities aligned with labels.json: ["none", ...WORD_IDS] (length 21).
   */
  public stepProbabilities(probs: readonly number[], tMs: number): RecognizerEvent[] {
    if (probs.length !== WORD_IDS.length + 1) {
      throw new Error(
        `Expected ${WORD_IDS.length + 1} probabilities (["none", ...WORD_IDS]), got ${probs.length}.`
      );
    }

    if (tMs < this.cooldownUntilMs) {
      this.holdWord = null;
      this.attemptStartMs = null;
      return [];
    }

    const overallBestIdx = argmax(probs);
    if (overallBestIdx === 0) {
      this.holdWord = null;
      this.attemptStartMs = null;
      return [];
    }

    // Find top-1 and top-2 among the 20 sign classes (indices 1..20).
    let bestWordIdx = 1;
    let p1 = -Infinity;
    let p2 = -Infinity;

    for (let i = 1; i < probs.length; i += 1) {
      const p = probs[i];
      if (p > p1) {
        p2 = p1;
        p1 = p;
        bestWordIdx = i;
      } else if (p > p2) {
        p2 = p;
      }
    }

    const bestWord = WORD_IDS[bestWordIdx - 1];
    const isEnabled = this.enabledSet.has(bestWord);
    const passesConfidence =
      isEnabled &&
      p1 >= this.config.threshold &&
      p1 - p2 >= this.config.margin;

    if (passesConfidence) {
      this.attemptStartMs = null;
      if (this.holdWord !== bestWord) {
        this.holdWord = bestWord;
        this.holdStartMs = tMs;
        return [{ type: 'candidate', word: bestWord, p: p1, p2 }];
      }

      if (tMs - this.holdStartMs >= this.config.minHoldMs) {
        this.holdWord = null;
        this.cooldownUntilMs = tMs + this.config.cooldownMs;
        return [{ type: 'locked', word: bestWord, p: p1, tMs }];
      }

      return [{ type: 'candidate', word: bestWord, p: p1, p2 }];
    }

    // Gesture is non-none, but below confidence/margin or disabled -> track unclear attempt.
    this.holdWord = null;
    if (p1 >= this.config.unclearAttemptMinProb) {
      if (this.attemptStartMs === null) {
        this.attemptStartMs = tMs;
        return [{ type: 'candidate', word: bestWord, p: p1, p2 }];
      }

      if (
        tMs - this.attemptStartMs >= this.config.minHoldMs &&
        tMs - this.lastUnclearAtMs >= this.config.cooldownMs
      ) {
        this.attemptStartMs = null;
        this.lastUnclearAtMs = tMs;
        return [{ type: 'unclear', tMs }];
      }

      return [{ type: 'candidate', word: bestWord, p: p1, p2 }];
    }

    this.attemptStartMs = null;
    return [];
  }

  public stepLogits(logits: readonly number[], tMs: number): RecognizerEvent[] {
    return this.stepProbabilities(softmax(logits), tMs);
  }
}

