import {
  WORD_IDS,
  type RecognizerEngine,
  type RecognizerEvent,
  type RecognizerInfo,
  type RecognizerState,
  type WordId,
} from '@sign/recognizer-contract';

export const MOCK_ENGINE_BUNDLE_MARKER = '__MOCK_ENGINE_DO_NOT_SHIP__';

export interface MockEngineOptions {
  modelVersion?: string;
  preprocessVersion?: string;
  enabledWords?: readonly WordId[];
  initialFps?: number;
}

const VALID_WORD_SET = new Set<string>(WORD_IDS);

function assertDevOnly(): void {
  const devFlag = (globalThis as { __DEV__?: unknown }).__DEV__;
  if (devFlag !== true) {
    throw new Error(
      'MockEngine can only be loaded and instantiated when __DEV__ === true.'
    );
  }
}

function assertValidWord(word: WordId): void {
  if (!VALID_WORD_SET.has(word)) {
    throw new Error(`Invalid WordId for MockEngine: ${String(word)}`);
  }
}

/**
 * Development-only RecognizerEngine implementation for UI development and debug triggers.
 */
export class MockEngine implements RecognizerEngine {
  public readonly marker = MOCK_ENGINE_BUNDLE_MARKER;
  private readonly listeners = new Set<(e: RecognizerEvent) => void>();
  private readonly modelVersion: string;
  private readonly preprocessVersion: string;
  private readonly enabledWords: WordId[];
  private readonly initialFps: number;
  private currentState: RecognizerState = 'idle';
  private facing: 'front' | 'back' = 'front';
  private handPresent = false;

  constructor(options: MockEngineOptions = {}) {
    assertDevOnly();
    this.modelVersion = options.modelVersion ?? 'mock-0.1.0';
    this.preprocessVersion = options.preprocessVersion ?? 'mock-preprocess-1';
    this.enabledWords = options.enabledWords ? [...options.enabledWords] : [...WORD_IDS];
    this.initialFps = options.initialFps ?? 30;
  }

  public async start(opts: { facing: 'front' | 'back' }): Promise<void> {
    assertDevOnly();
    this.facing = opts.facing;
    this.emitState('starting');
    this.emitState('running');
    this.emitHand(true, this.initialFps);
  }

  public async stop(): Promise<void> {
    this.emitHand(false, 0);
    this.emitState('idle');
  }

  public subscribe(listener: (e: RecognizerEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public info(): RecognizerInfo {
    return {
      engine: 'mock',
      modelVersion: this.modelVersion,
      preprocessVersion: this.preprocessVersion,
      enabledWords: [...this.enabledWords],
    };
  }

  public getState(): RecognizerState {
    return this.currentState;
  }

  public getFacing(): 'front' | 'back' {
    return this.facing;
  }

  public isHandPresent(): boolean {
    return this.handPresent;
  }

  public emitState(state: RecognizerState, message?: string): void {
    this.currentState = state;
    this.dispatch(
      message !== undefined
        ? { type: 'state', state, message }
        : { type: 'state', state }
    );
  }

  public emitHand(present: boolean, fps = present ? this.initialFps : 0): void {
    this.handPresent = present;
    this.dispatch({ type: 'hand', present, fps });
  }

  public emitCandidate(word: WordId, p = 0.72, p2 = 0.16): void {
    assertValidWord(word);
    this.dispatch({ type: 'candidate', word, p, p2 });
  }

  public emitLocked(word: WordId, p = 0.94, tMs = Date.now()): void {
    assertValidWord(word);
    this.dispatch({ type: 'locked', word, p, tMs });
  }

  public emitUnclear(tMs = Date.now()): void {
    this.dispatch({ type: 'unclear', tMs });
  }

  private dispatch(event: RecognizerEvent): void {
    for (const listener of [...this.listeners]) {
      listener(event);
    }
  }
}

