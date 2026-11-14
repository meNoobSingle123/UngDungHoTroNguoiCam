import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RecognizerEngine, RecognizerEvent } from '@sign/recognizer-contract';
import type { SentenceModifier } from '@sign/sentence-builder';
import { getWordDisplayText } from '@sign/sign-ui';
import { SignCameraScreen } from '@sign/sign-ui/camera-screen';
import { VI_STRINGS } from '../../core/i18n/vi.ts';
import { useSystemStore } from '../../core/store/systemStatus.ts';
import { AppText, useAppTheme } from '../../core/theme/ThemeProvider.tsx';
import { speakVietnamese } from '../../core/tts/speechService.ts';
import { createAppEngine } from './createAppEngine.ts';
import {
  createCameraSentenceFlow,
  type CameraSentenceSnapshot,
} from './cameraSentenceFlow.ts';

declare const __DEV__: boolean | undefined;

function createFallbackProductionEngine(): RecognizerEngine {
  return {
    async start() {},
    async stop() {},
    subscribe: () => () => {},
    info: () => ({
      engine: 'mediapipe-litert',
      modelVersion: 'pending-bundle',
      preprocessVersion: 'pending',
      enabledWords: [],
    }),
  };
}

function renderDevPanel(engine: RecognizerEngine): React.ReactNode {
  if (typeof __DEV__ !== 'undefined' && __DEV__ === true) {
    if (engine.info().engine !== 'mock') return null;
    const { MockDebugPanel } = require('@sign/recognizer-mock/debug-panel') as {
      MockDebugPanel: React.ComponentType<{ engine: RecognizerEngine }>;
    };
    return <MockDebugPanel engine={engine} />;
  }
  return null;
}

export interface CameraModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CameraModal({
  visible,
  onClose,
}: CameraModalProps): React.ReactElement {
  const theme = useAppTheme();
  const speechRate = useSystemStore((s) => s.speechRate);
  const history = useSystemStore((s) => s.history);
  const addHistoryEntry = useSystemStore((s) => s.addHistoryEntry);
  const latestOther = [...history].reverse().find((h) => h.speaker === 'other');

  const engine = useMemo(
    () =>
      createAppEngine({
        useDevEngine: true,
        createProductionEngine: createFallbackProductionEngine,
      }),
    []
  );

  const flowRef = useRef<ReturnType<typeof createCameraSentenceFlow> | null>(null);
  if (!flowRef.current) {
    flowRef.current = createCameraSentenceFlow({
      enabledWords: engine.info().enabledWords,
      onSpeak: (text) => speakVietnamese(text, { rate: speechRate }),
      onRecordHistory: ({ text, tMs }) => addHistoryEntry('me', text, tMs),
    });
  }
  const flow = flowRef.current;

  const [snapshot, setSnapshot] = useState<CameraSentenceSnapshot>(() => flow.getSnapshot());
  const [modifier, setModifier] = useState<SentenceModifier>('none');
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!visible) return;
    const unsub = engine.subscribe((event: RecognizerEvent) => {
      setSnapshot(flow.handleEvent(event, Date.now()));
    });
    const timer = setInterval(() => {
      const t = Date.now();
      setNowMs(t);
      setSnapshot(flow.tick(t));
    }, 250);
    return () => {
      unsub();
      clearInterval(timer);
    };
  }, [engine, flow, visible]);

  const handleToggleCapture = () => {
    const t = Date.now();
    if (snapshot.phase === 'capturing' || snapshot.phase === 'unmatched_review') {
      setSnapshot(flow.finishCapture(modifier, t));
    } else {
      setSnapshot(flow.startCapture(t));
    }
  };

  const canCorrect = flow.canCorrectAt(nowMs);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.bg }]}>
        <View
          style={[
            styles.header,
            {
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              borderBottomColor: theme.colors.border,
            },
          ]}
        >
          <AppText variant="title" bold>
            {VI_STRINGS.camera.title}
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={VI_STRINGS.camera.closeButton}
            onPress={onClose}
            style={[
              styles.smallBtn,
              {
                minHeight: theme.dimensions.minTouchTarget,
                borderRadius: theme.radii.button,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <AppText variant="label" bold>
              {VI_STRINGS.camera.closeButton}
            </AppText>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md, flexGrow: 1 }}>
          {latestOther ? (
            <View
              testID="camera-other-pinned"
              style={[
                styles.panel,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.primary,
                  borderRadius: theme.radii.card,
                  padding: theme.spacing.sm,
                },
              ]}
            >
              <AppText variant="label" bold color={theme.colors.primary}>
                {VI_STRINGS.camera.otherSaidPrefix} {latestOther.text}
              </AppText>
            </View>
          ) : null}

          <View style={styles.cameraBox}>
            <SignCameraScreen
              engine={engine}
              active={visible && snapshot.phase === 'capturing'}
              facing="front"
              renderDebugPanel={
                typeof __DEV__ !== 'undefined' && __DEV__ === true
                  ? renderDevPanel
                  : undefined
              }
            />
          </View>

          <View
            style={[
              styles.panel,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: theme.radii.card,
                padding: theme.spacing.md,
              },
            ]}
          >
            <AppText variant="label" bold color={theme.colors.textMuted}>
              {VI_STRINGS.camera.composingLabel}
            </AppText>

            <View style={styles.chipsRow}>
              {snapshot.composingWords.length === 0 ? (
                <AppText variant="body" color={theme.colors.textMuted}>
                  {VI_STRINGS.camera.composingEmpty}
                </AppText>
              ) : (
                snapshot.composingWords.map((item, idx) => (
                  <Pressable
                    key={`${item.word}-${item.tMs}-${idx}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${VI_STRINGS.cards.deleteButton} ${getWordDisplayText(item.word)}`}
                    onPress={() => setSnapshot(flow.removeWordAt(idx))}
                    style={[
                      styles.wordChip,
                      {
                        minHeight: theme.dimensions.minTouchTarget,
                        borderRadius: theme.radii.chip,
                        backgroundColor: theme.colors.primary,
                      },
                    ]}
                  >
                    <AppText variant="label" bold color={theme.colors.onPrimary}>
                      {getWordDisplayText(item.word)} ×
                    </AppText>
                  </Pressable>
                ))
              )}
            </View>

            {snapshot.notice ? (
              <AppText variant="body" bold color={theme.colors.warning}>
                {snapshot.notice}
              </AppText>
            ) : null}

            <View style={styles.chipsRow}>
              {(['none', 'question', 'urgent'] as const).map((mod) => {
                const active = modifier === mod;
                const label = VI_STRINGS.camera.modifiers[mod];
                return (
                  <Pressable
                    key={mod}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    testID={`modifier-${mod}`}
                    onPress={() => setModifier(mod)}
                    style={[
                      styles.wordChip,
                      {
                        minHeight: theme.dimensions.minTouchTarget,
                        borderRadius: theme.radii.chip,
                        backgroundColor: active ? theme.colors.primary : theme.colors.bg,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <AppText
                      variant="label"
                      bold
                      color={active ? theme.colors.onPrimary : theme.colors.text}
                    >
                      {label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            {snapshot.phase === 'reviewing' && snapshot.pendingSentence ? (
              <View style={{ gap: theme.spacing.sm }}>
                <AppText variant="body" bold color={theme.colors.primary}>
                  {VI_STRINGS.camera.reviewingPrefix} {snapshot.pendingSentence}
                </AppText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={VI_STRINGS.camera.cancelReviewButton}
                  onPress={() => setSnapshot(flow.cancelReview())}
                  style={[
                    styles.actionBtn,
                    {
                      minHeight: theme.dimensions.primaryActionMinHeight,
                      borderRadius: theme.radii.button,
                      backgroundColor: theme.colors.danger,
                    },
                  ]}
                >
                  <AppText variant="body" bold color={theme.colors.onDanger}>
                    {VI_STRINGS.camera.cancelReviewButton}
                  </AppText>
                </Pressable>
              </View>
            ) : null}
          </View>

          <View style={styles.controlsRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.camera.correctButton}
              disabled={!canCorrect}
              onPress={() => {
                flow.correctLastSentence(Date.now());
                setSnapshot(flow.getSnapshot());
              }}
              style={[
                styles.actionBtn,
                {
                  flex: 1,
                  minHeight: theme.dimensions.primaryActionMinHeight,
                  borderRadius: theme.radii.button,
                  backgroundColor: canCorrect ? theme.colors.warning : theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <AppText
                variant="label"
                bold
                color={canCorrect ? theme.colors.onPrimary : theme.colors.textMuted}
              >
                {VI_STRINGS.camera.correctButton}
              </AppText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                snapshot.phase === 'capturing'
                  ? VI_STRINGS.camera.stopButton
                  : VI_STRINGS.camera.startButton
              }
              onPress={handleToggleCapture}
              style={[
                styles.actionBtn,
                {
                  flex: 1.4,
                  minHeight: theme.dimensions.primaryActionMinHeight,
                  borderRadius: theme.radii.button,
                  backgroundColor: theme.colors.primary,
                },
              ]}
            >
              <AppText variant="body" bold color={theme.colors.onPrimary}>
                {snapshot.phase === 'capturing' || snapshot.phase === 'unmatched_review'
                  ? VI_STRINGS.camera.stopButton
                  : VI_STRINGS.camera.startButton}
              </AppText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.camera.dropWordButton}
              onPress={() => setSnapshot(flow.dropLastWord())}
              style={[
                styles.actionBtn,
                {
                  flex: 1,
                  minHeight: theme.dimensions.primaryActionMinHeight,
                  borderRadius: theme.radii.button,
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <AppText variant="label" bold>
                {VI_STRINGS.camera.dropWordButton}
              </AppText>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  smallBtn: {
    paddingHorizontal: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBox: {
    minHeight: 300,
    borderRadius: 16,
    overflow: 'hidden',
  },
  panel: {
    borderWidth: 1,
    gap: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wordChip: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
});

