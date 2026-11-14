import type { RecognizerEvent, WordId } from '@sign/recognizer-contract';
import { buildSentence, type SentenceModifier } from '@sign/sentence-builder';
import { VI_STRINGS } from '../../core/i18n/vi.ts';

export const REVIEW_DELAY_MS = 2000;
export const CORRECTION_WINDOW_MS = 30000;
export const HAND_MISSING_THRESHOLD_MS = 3000;

export type CameraFlowPhase =
  | 'idle'
  | 'capturing'
  | 'reviewing'
  | 'unmatched_review'
  | 'committed';

export interface CameraFlowWord {
  word: WordId;
  p: number;
  tMs: number;
}

export interface CameraSentenceSnapshot {
  phase: CameraFlowPhase;
  composingWords: CameraFlowWord[];
  experimentalWord: { word: WordId; label: string } | null;
  pendingSentence: string | null;
  committedSentence: string | null;
  lastCommittedAtMs: number | null;
  reviewDeadlineMs: number | null;
  notice: string | null;
  handPresent: boolean;
  handMissingSinceMs: number | null;
}

export interface CameraSentenceFlowCallbacks {
  enabledWords: readonly WordId[];
  onSpeak?: (text: string) => void;
  onRecordHistory?: (entry: { text: string; words: WordId[]; tMs: number }) => void;
}

export interface CameraSentenceFlow {
  getSnapshot(): CameraSentenceSnapshot;
  startCapture(nowMs: number): CameraSentenceSnapshot;
  handleEvent(event: RecognizerEvent, nowMs: number): CameraSentenceSnapshot;
  removeWordAt(index: number): CameraSentenceSnapshot;
  dropLastWord(): CameraSentenceSnapshot;
  finishCapture(modifier: SentenceModifier, nowMs: number): CameraSentenceSnapshot;
  cancelReview(): CameraSentenceSnapshot;
  tick(nowMs: number): CameraSentenceSnapshot;
  correctLastSentence(nowMs: number): boolean;
  canCorrectAt(nowMs: number): boolean;
}

export function createCameraSentenceFlow(
  callbacks: CameraSentenceFlowCallbacks
): CameraSentenceFlow {
  const enabledSet = new Set<WordId>(callbacks.enabledWords);

  let snapshot: CameraSentenceSnapshot = {
    phase: 'idle',
    composingWords: [],
    experimentalWord: null,
    pendingSentence: null,
    committedSentence: null,
    lastCommittedAtMs: null,
    reviewDeadlineMs: null,
    notice: null,
    handPresent: false,
    handMissingSinceMs: null,
  };

  const commitPending = (nowMs: number) => {
    if (!snapshot.pendingSentence) {
      return;
    }
    const text = snapshot.pendingSentence;
    const words = snapshot.composingWords.map((w) => w.word);
    callbacks.onSpeak?.(text);
    callbacks.onRecordHistory?.({ text, words, tMs: nowMs });
    snapshot = {
      ...snapshot,
      phase: 'committed',
      committedSentence: text,
      pendingSentence: null,
      reviewDeadlineMs: null,
      lastCommittedAtMs: nowMs,
      notice: null,
    };
  };

  return {
    getSnapshot() {
      return snapshot;
    },

    startCapture(nowMs: number) {
      snapshot = {
        phase: 'capturing',
        composingWords: [],
        experimentalWord: null,
        pendingSentence: null,
        committedSentence: null,
        lastCommittedAtMs: snapshot.lastCommittedAtMs,
        reviewDeadlineMs: null,
        notice: null,
        handPresent: snapshot.handPresent,
        handMissingSinceMs: snapshot.handPresent ? null : nowMs,
      };
      return snapshot;
    },

    handleEvent(event: RecognizerEvent, nowMs: number) {
      if (event.type === 'hand') {
        if (event.present) {
          const clearedNotice =
            snapshot.notice === VI_STRINGS.camera.noHandPrompt ? null : snapshot.notice;
          snapshot = {
            ...snapshot,
            handPresent: true,
            handMissingSinceMs: null,
            notice: clearedNotice,
          };
        } else {
          const missingSince = snapshot.handMissingSinceMs ?? nowMs;
          const missingExceeded =
            snapshot.phase === 'capturing' &&
            nowMs - missingSince >= HAND_MISSING_THRESHOLD_MS;
          snapshot = {
            ...snapshot,
            handPresent: false,
            handMissingSinceMs: missingSince,
            notice: missingExceeded ? VI_STRINGS.camera.noHandPrompt : snapshot.notice,
          };
        }
        return snapshot;
      }

      if (snapshot.phase !== 'capturing') {
        return snapshot;
      }

      if (event.type === 'unclear') {
        snapshot = {
          ...snapshot,
          experimentalWord: null,
          notice: VI_STRINGS.camera.unclearPrompt,
        };
        return snapshot;
      }

      if (event.type === 'locked') {
        if (!enabledSet.has(event.word)) {
          snapshot = {
            ...snapshot,
            experimentalWord: {
              word: event.word,
              label: VI_STRINGS.camera.experimentalLabel,
            },
            notice: null,
          };
          return snapshot;
        }
        snapshot = {
          ...snapshot,
          experimentalWord: null,
          notice: null,
          composingWords: [
            ...snapshot.composingWords,
            { word: event.word, p: event.p, tMs: event.tMs },
          ],
        };
        return snapshot;
      }

      return snapshot;
    },

    removeWordAt(index: number) {
      if (index < 0 || index >= snapshot.composingWords.length) {
        return snapshot;
      }
      snapshot = {
        ...snapshot,
        composingWords: snapshot.composingWords.filter((_, idx) => idx !== index),
      };
      return snapshot;
    },

    dropLastWord() {
      if (snapshot.composingWords.length === 0) {
        return snapshot;
      }
      snapshot = {
        ...snapshot,
        composingWords: snapshot.composingWords.slice(0, -1),
      };
      return snapshot;
    },

    finishCapture(modifier: SentenceModifier, nowMs: number) {
      const built = buildSentence(
        snapshot.composingWords.map((item) => item.word),
        modifier
      );
      if (!built) {
        snapshot = {
          ...snapshot,
          phase: 'unmatched_review',
          pendingSentence: null,
          reviewDeadlineMs: null,
          notice: VI_STRINGS.camera.unmatchedPrompt,
        };
        return snapshot;
      }
      snapshot = {
        ...snapshot,
        phase: 'reviewing',
        pendingSentence: built.text,
        reviewDeadlineMs: nowMs + REVIEW_DELAY_MS,
        notice: null,
      };
      return snapshot;
    },

    cancelReview() {
      if (snapshot.phase !== 'reviewing') {
        return snapshot;
      }
      snapshot = {
        ...snapshot,
        phase: 'capturing',
        pendingSentence: null,
        reviewDeadlineMs: null,
      };
      return snapshot;
    },

    tick(nowMs: number) {
      if (
        snapshot.phase === 'capturing' &&
        !snapshot.handPresent &&
        snapshot.handMissingSinceMs !== null &&
        nowMs - snapshot.handMissingSinceMs >= HAND_MISSING_THRESHOLD_MS
      ) {
        snapshot = {
          ...snapshot,
          notice: VI_STRINGS.camera.noHandPrompt,
        };
      }

      if (
        snapshot.phase === 'reviewing' &&
        snapshot.reviewDeadlineMs !== null &&
        nowMs >= snapshot.reviewDeadlineMs
      ) {
        commitPending(nowMs);
      }

      return snapshot;
    },

    canCorrectAt(nowMs: number) {
      return (
        snapshot.lastCommittedAtMs !== null &&
        snapshot.committedSentence !== null &&
        nowMs - snapshot.lastCommittedAtMs <= CORRECTION_WINDOW_MS
      );
    },

    correctLastSentence(nowMs: number) {
      if (!this.canCorrectAt(nowMs)) {
        return false;
      }
      callbacks.onSpeak?.(VI_STRINGS.camera.correctionSpeech);
      snapshot = {
        ...snapshot,
        phase: 'idle',
        composingWords: [],
        committedSentence: null,
        lastCommittedAtMs: null,
        notice: VI_STRINGS.camera.correctionSpeech,
      };
      return true;
    },
  };
}

