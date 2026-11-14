import { WORD_IDS, type WordId } from '@sign/recognizer-contract';
import type { MockEngine } from './MockEngine.ts';

export interface MockDebugController {
  readonly availableWords: readonly WordId[];
  getSelectedWord(): WordId;
  selectWord(word: WordId): void;
  triggerCandidate(p?: number, p2?: number): void;
  triggerLocked(p?: number): void;
  triggerUnclear(): void;
  toggleHand(): boolean;
}

/**
 * Stateful helper connecting debug panel controls to a MockEngine instance.
 */
export function createMockDebugController(
  engine: MockEngine,
  initialWord: WordId = WORD_IDS[0]
): MockDebugController {
  let selectedWord: WordId = initialWord;

  return {
    availableWords: WORD_IDS,
    getSelectedWord() {
      return selectedWord;
    },
    selectWord(word: WordId) {
      selectedWord = word;
    },
    triggerCandidate(p = 0.72, p2 = 0.16) {
      engine.emitCandidate(selectedWord, p, p2);
    },
    triggerLocked(p = 0.94) {
      engine.emitLocked(selectedWord, p, Date.now());
    },
    triggerUnclear() {
      engine.emitUnclear(Date.now());
    },
    toggleHand() {
      const next = !engine.isHandPresent();
      engine.emitHand(next, next ? 30 : 0);
      return next;
    },
  };
}

