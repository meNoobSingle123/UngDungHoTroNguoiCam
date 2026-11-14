import type {
  RecognizerEngine,
  RecognizerEvent,
  RecognizerState,
  WordId,
} from '@sign/recognizer-contract';

declare const __DEV__: boolean | undefined;

export const UNCLEAR_GESTURE_PROMPT = 'Chưa rõ cử chỉ, xin làm lại';
export const EXPERIMENTAL_WORD_LABEL = 'thử nghiệm';

export interface CandidateSnapshot {
  word: WordId;
  p: number;
  p2: number;
  isExperimental: boolean;
}

export interface LockedWordEntry {
  word: WordId;
  p: number;
  tMs: number;
}

export interface ExperimentalWordNotice {
  word: WordId;
  p: number;
  tMs: number;
  label: typeof EXPERIMENTAL_WORD_LABEL;
}

export interface RecognizerSessionSnapshot {
  state: RecognizerState;
  errorMessage: string | null;
  handPresent: boolean;
  fps: number;
  candidate: CandidateSnapshot | null;
  recognizedWords: LockedWordEntry[];
  experimentalWord: ExperimentalWordNotice | null;
  statusNotice: string | null;
  showMockBadge: boolean;
}

export function isMockBadgeVisible(
  engine: RecognizerEngine,
  isDev: boolean
): boolean {
  return isDev === true && engine.info().engine === 'mock';
}

export function createInitialSessionSnapshot(
  showMockBadge: boolean
): RecognizerSessionSnapshot {
  return {
    state: 'idle',
    errorMessage: null,
    handPresent: false,
    fps: 0,
    candidate: null,
    recognizedWords: [],
    experimentalWord: null,
    statusNotice: null,
    showMockBadge,
  };
}

/**
 * Pure UI event reducer enforcing contract rules:
 * - Locking is handled exclusively by the engine; `candidate` never appends words.
 * - Only words present in `info().enabledWords` are counted; others show `"thử nghiệm"`.
 * - `unclear` displays `UNCLEAR_GESTURE_PROMPT` and never adds a word.
 */
export function reduceRecognizerEvent(
  prev: RecognizerSessionSnapshot,
  event: RecognizerEvent,
  enabledWords?: ReadonlySet<WordId>
): RecognizerSessionSnapshot {
  switch (event.type) {
    case 'state':
      return {
        ...prev,
        state: event.state,
        errorMessage: event.state === 'error' ? (event.message ?? 'Lỗi bộ nhận diện') : null,
      };
    case 'hand':
      return {
        ...prev,
        handPresent: event.present,
        fps: event.fps,
        candidate: event.present ? prev.candidate : null,
      };
    case 'candidate': {
      const isExperimental = enabledWords ? !enabledWords.has(event.word) : false;
      return {
        ...prev,
        statusNotice: null,
        experimentalWord: null,
        candidate: { word: event.word, p: event.p, p2: event.p2, isExperimental },
      };
    }
    case 'locked': {
      const isEnabled = enabledWords ? enabledWords.has(event.word) : true;
      if (!isEnabled) {
        return {
          ...prev,
          candidate: null,
          statusNotice: null,
          experimentalWord: {
            word: event.word,
            p: event.p,
            tMs: event.tMs,
            label: EXPERIMENTAL_WORD_LABEL,
          },
        };
      }
      return {
        ...prev,
        candidate: null,
        statusNotice: null,
        experimentalWord: null,
        recognizedWords: [
          ...prev.recognizedWords,
          { word: event.word, p: event.p, tMs: event.tMs },
        ],
      };
    }
    case 'unclear':
      return {
        ...prev,
        candidate: null,
        experimentalWord: null,
        statusNotice: UNCLEAR_GESTURE_PROMPT,
      };
  }
}

export interface RecognizerSession {
  getSnapshot(): RecognizerSessionSnapshot;
  subscribe(listener: (snapshot: RecognizerSessionSnapshot) => void): () => void;
  clearWords(): void;
  dispose(): void;
}

/**
 * Connects UI state management to any RecognizerEngine contract implementation.
 */
export function createRecognizerSession(
  engine: RecognizerEngine,
  isDev: boolean = typeof __DEV__ !== 'undefined' && __DEV__ === true
): RecognizerSession {
  const enabledWords = new Set<WordId>(engine.info().enabledWords);
  let snapshot = createInitialSessionSnapshot(isMockBadgeVisible(engine, isDev));
  const listeners = new Set<(s: RecognizerSessionSnapshot) => void>();

  const notify = () => {
    for (const listener of [...listeners]) {
      listener(snapshot);
    }
  };

  const unsubscribeEngine = engine.subscribe((event) => {
    snapshot = reduceRecognizerEvent(snapshot, event, enabledWords);
    notify();
  });

  return {
    getSnapshot() {
      return snapshot;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    clearWords() {
      snapshot = {
        ...snapshot,
        recognizedWords: [],
        experimentalWord: null,
        statusNotice: null,
      };
      notify();
    },
    dispose() {
      unsubscribeEngine();
      listeners.clear();
    },
  };
}

