import type { RecognizerEngine } from '@sign/recognizer-contract';

declare const __DEV__: boolean | undefined;

export interface CreateAppEngineOptions {
  useDevEngine?: boolean;
  createProductionEngine: () => RecognizerEngine;
  loadDevEngine?: () => RecognizerEngine;
}

/**
 * Application engine composition root.
 * The dev-only engine is strictly gated inside __DEV__ === true so release
 * builds (__DEV__ = false) eliminate it via dead-code elimination.
 */
export function createAppEngine(options: CreateAppEngineOptions): RecognizerEngine {
  if (typeof __DEV__ !== 'undefined' && __DEV__ === true) {
    if (options.useDevEngine !== false) {
      if (options.loadDevEngine) {
        return options.loadDevEngine();
      }
      const { MockEngine } = require('@sign/recognizer-mock') as {
        MockEngine: new () => RecognizerEngine;
      };
      return new MockEngine();
    }
  }

  return options.createProductionEngine();
}
