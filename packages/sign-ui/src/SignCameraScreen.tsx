import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import type { RecognizerEngine, SignCameraViewProps } from '@sign/recognizer-contract';
import {
  EXPERIMENTAL_WORD_LABEL,
  createRecognizerSession,
  type RecognizerSessionSnapshot,
} from './recognizerSession';
import { getWordDisplayText } from './wordLabels';

declare const __DEV__: boolean | undefined;

export interface SignCameraScreenProps extends SignCameraViewProps {
  /** Optional dev-only debug panel renderer injected from dev entrypoint when __DEV__ === true. */
  renderDebugPanel?: (engine: RecognizerEngine) => React.ReactNode;
}

/**
 * Camera recognition UI depending strictly on @sign/recognizer-contract.
 */
export function SignCameraScreen({
  engine,
  active,
  facing,
  style,
  renderDebugPanel,
}: SignCameraScreenProps): React.ReactElement {
  const isDev = typeof __DEV__ !== 'undefined' && __DEV__ === true;
  const session = useMemo(() => createRecognizerSession(engine, isDev), [engine, isDev]);
  const [snapshot, setSnapshot] = useState<RecognizerSessionSnapshot>(() =>
    session.getSnapshot()
  );

  useEffect(() => {
    setSnapshot(session.getSnapshot());
    const unsub = session.subscribe(setSnapshot);
    return () => {
      unsub();
      session.dispose();
    };
  }, [session]);

  useEffect(() => {
    if (!active) {
      return;
    }
    let cancelled = false;
    engine.start({ facing }).catch(() => {
      if (!cancelled) {
        // State errors are emitted through RecognizerEvent { type: 'state', state: 'error' }.
      }
    });
    return () => {
      cancelled = true;
      engine.stop().catch(() => {});
    };
  }, [engine, active, facing]);

  return (
    <View style={[styles.container, style as ViewStyle]}>
      <View style={styles.cameraStage}>
        <View style={styles.topBar}>
          <Text style={styles.statusText}>
            {snapshot.state.toUpperCase()} · {snapshot.handPresent ? `${snapshot.fps} FPS` : 'Không thấy tay'}
          </Text>

          {snapshot.showMockBadge ? (
            <View style={styles.mockBadge} testID="mock-badge">
              <Text style={styles.mockBadgeText}>MOCK</Text>
            </View>
          ) : null}
        </View>

        {snapshot.candidate ? (
          <View style={styles.candidateBanner} testID="candidate-banner">
            <Text style={styles.candidateText}>
              Gợi ý: {getWordDisplayText(snapshot.candidate.word)} (
              {Math.round(snapshot.candidate.p * 100)}%)
              {snapshot.candidate.isExperimental ? ` · ${EXPERIMENTAL_WORD_LABEL}` : ''}
            </Text>
          </View>
        ) : null}

        {snapshot.experimentalWord ? (
          <View style={styles.experimentalBanner} testID="experimental-banner">
            <Text style={styles.experimentalText}>
              {getWordDisplayText(snapshot.experimentalWord.word)} ({snapshot.experimentalWord.label})
            </Text>
          </View>
        ) : null}

        {snapshot.statusNotice ? (
          <View style={styles.unclearBanner} testID="unclear-banner">
            <Text style={styles.unclearText}>{snapshot.statusNotice}</Text>
          </View>
        ) : null}

        {snapshot.errorMessage ? (
          <View style={styles.errorBanner} testID="error-banner">
            <Text style={styles.errorText}>{snapshot.errorMessage}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.transcriptBox}>
        <View style={styles.transcriptHeader}>
          <Text style={styles.transcriptLabel}>Câu đã nhận:</Text>
          <Pressable onPress={() => session.clearWords()} testID="clear-words-btn">
            <Text style={styles.clearText}>Xóa</Text>
          </Pressable>
        </View>
        <Text style={styles.transcriptWords} testID="locked-words-text">
          {snapshot.recognizedWords.length > 0
            ? snapshot.recognizedWords.map((item) => getWordDisplayText(item.word)).join(' ')
            : 'Chưa có từ nào được khóa'}
        </Text>
      </View>

      {isDev && renderDebugPanel ? renderDebugPanel(engine) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
    padding: 16,
    gap: 12,
  },
  cameraStage: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#18181B',
    padding: 14,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusText: {
    color: '#D4D4D8',
    fontSize: 12,
    fontWeight: '600',
  },
  mockBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  mockBadgeText: {
    color: '#18181B',
    fontSize: 12,
    fontWeight: '800',
  },
  candidateBanner: {
    backgroundColor: 'rgba(37, 99, 235, 0.25)',
    borderColor: '#3B82F6',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  candidateText: {
    color: '#BFDBFE',
    fontSize: 15,
    fontWeight: '600',
  },
  experimentalBanner: {
    backgroundColor: 'rgba(217, 119, 6, 0.25)',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  experimentalText: {
    color: '#FDE68A',
    fontSize: 15,
    fontWeight: '600',
  },
  unclearBanner: {
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  unclearText: {
    color: '#FCA5A5',
    fontSize: 15,
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: '#7F1D1D',
    borderRadius: 10,
    padding: 10,
  },
  errorText: {
    color: '#FEE2E2',
    fontSize: 13,
  },
  transcriptBox: {
    backgroundColor: '#18181B',
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  transcriptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transcriptLabel: {
    color: '#A1A1AA',
    fontSize: 12,
    fontWeight: '600',
  },
  clearText: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: '600',
  },
  transcriptWords: {
    color: '#FAFAFA',
    fontSize: 18,
    fontWeight: '700',
  },
});

