import React from 'react';
import type { RecognizerEngine } from '@sign/recognizer-contract';
import { SignCameraScreen } from '@sign/sign-ui/camera-screen';

declare const __DEV__: boolean | undefined;

export interface AppCameraContainerProps {
  engine: RecognizerEngine;
  active?: boolean;
  facing?: 'front' | 'back';
}

function renderDevDebugPanel(engine: RecognizerEngine): React.ReactNode {
  if (typeof __DEV__ !== 'undefined' && __DEV__ === true) {
    if (engine.info().engine !== 'mock') {
      return null;
    }
    const { MockDebugPanel } = require('@sign/recognizer-mock/debug-panel') as {
      MockDebugPanel: React.ComponentType<{ engine: RecognizerEngine }>;
    };
    return <MockDebugPanel engine={engine} />;
  }
  return null;
}

/**
 * Top-level camera screen wiring production UI with optional dev-only debug panel.
 */
export function AppCameraContainer({
  engine,
  active = true,
  facing = 'front',
}: AppCameraContainerProps): React.ReactElement {
  return (
    <SignCameraScreen
      engine={engine}
      active={active}
      facing={facing}
      renderDebugPanel={
        typeof __DEV__ !== 'undefined' && __DEV__ === true
          ? renderDevDebugPanel
          : undefined
      }
    />
  );
}

