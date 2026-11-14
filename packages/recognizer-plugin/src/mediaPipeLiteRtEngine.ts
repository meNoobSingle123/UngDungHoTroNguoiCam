import type {
  RecognizerEngine,
  RecognizerEvent,
  RecognizerInfo,
  RecognizerState,
  WordId,
} from '@sign/recognizer-contract';
import {
  extractEnabledWords,
  validateBundleMetadata,
  type RecognizerBundleMeta,
} from './bundleValidator.ts';
import { WordLockDecoder } from './wordLockDecoder.ts';

export interface NativeMediaPipeLiteRtDriver {
  startCameraAndModel(opts: {
    facing: 'front' | 'back';
    meta: RecognizerBundleMeta;
    onFrameLogits: (logits: readonly number[], tMs: number, fps: number, handPresent: boolean) => void;
    onError: (message: string) => void;
  }): Promise<void>;
  stop(): Promise<void>;
}

export interface MediaPipeLiteRtEngineConfig {
  labels: readonly string[];
  meta: RecognizerBundleMeta;
  driver: NativeMediaPipeLiteRtDriver;
}

/**
 * Contract-compliant RecognizerEngine adapter for the real MediaPipe + LiteRT native driver.
 * Replacing `recognizer-bundle/` only swaps the bundle data loaded into this engine.
 */
export class MediaPipeLiteRtEngine implements RecognizerEngine {
  private readonly listeners = new Set<(e: RecognizerEvent) => void>();
  private readonly meta: RecognizerBundleMeta;
  private readonly enabledWords: WordId[];
  private readonly driver: NativeMediaPipeLiteRtDriver;
  private readonly decoder: WordLockDecoder;
  private state: RecognizerState = 'idle';

  constructor(config: MediaPipeLiteRtEngineConfig) {
    const check = validateBundleMetadata(config.labels, config.meta);
    if (!check.valid) {
      throw new Error(`Invalid recognizer-bundle: ${check.errors.join('; ')}`);
    }

    this.meta = config.meta;
    this.enabledWords = extractEnabledWords(config.meta);
    this.driver = config.driver;
    this.decoder = new WordLockDecoder({
      threshold: config.meta.threshold,
      margin: config.meta.margin,
      minHoldMs: config.meta.minHoldMs,
      cooldownMs: config.meta.cooldownMs,
      enabledWords: this.enabledWords,
    });
  }

  public async start(opts: { facing: 'front' | 'back' }): Promise<void> {
    this.decoder.reset();
    this.emitState('starting');
    try {
      await this.driver.startCameraAndModel({
        facing: opts.facing,
        meta: this.meta,
        onFrameLogits: (logits, tMs, fps, handPresent) => {
          this.dispatch({ type: 'hand', present: handPresent, fps });
          if (!handPresent) {
            this.decoder.reset();
            return;
          }
          const events = this.decoder.stepLogits(logits, tMs);
          for (const evt of events) {
            this.dispatch(evt);
          }
        },
        onError: (message) => {
          this.emitState('error', message);
        },
      });
      if (this.state !== 'error') {
        this.emitState('running');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.emitState('error', msg);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    await this.driver.stop();
    this.decoder.reset();
    this.dispatch({ type: 'hand', present: false, fps: 0 });
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
      engine: 'mediapipe-litert',
      modelVersion: this.meta.version,
      preprocessVersion: this.meta.preprocessVersion,
      enabledWords: [...this.enabledWords],
    };
  }

  private emitState(nextState: RecognizerState, message?: string): void {
    this.state = nextState;
    this.dispatch(
      message !== undefined
        ? { type: 'state', state: nextState, message }
        : { type: 'state', state: nextState }
    );
  }

  private dispatch(event: RecognizerEvent): void {
    for (const listener of [...this.listeners]) {
      listener(event);
    }
  }
}

