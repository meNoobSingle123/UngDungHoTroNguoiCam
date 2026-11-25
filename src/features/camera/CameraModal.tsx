import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { RecognizerEngine, RecognizerEvent } from '@sign/recognizer-contract';
import type { SentenceModifier } from '@sign/sentence-builder';
import { getWordDisplayText } from '@sign/sign-ui';
import { SignCameraScreen } from '@sign/sign-ui/camera-screen';
import {
  hapticLight,
  hapticWarning,
} from '../../core/haptics/hapticFeedback.ts';
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

/** Icon name for modifier pills */
const MODIFIER_ICONS: Record<SentenceModifier, React.ComponentProps<typeof Ionicons>['name']> = {
  none: 'chatbubble-outline',
  question: 'help-circle-outline',
  urgent: 'alert-circle-outline',
};

export interface CameraModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CameraModal({
  visible,
  onClose,
}: CameraModalProps): React.ReactElement {
  const theme = useAppTheme();
  const highContrast = theme.isHighContrast;
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
    hapticLight();
    const t = Date.now();
    if (snapshot.phase === 'capturing' || snapshot.phase === 'unmatched_review') {
      setSnapshot(flow.finishCapture(modifier, t));
    } else {
      setSnapshot(flow.startCapture(t));
    }
  };

  const canCorrect = flow.canCorrectAt(nowMs);
  const isCapturing = snapshot.phase === 'capturing' || snapshot.phase === 'unmatched_review';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.root, { backgroundColor: highContrast ? theme.colors.bg : '#F8FAFC' }]}>
        {/* ─── Header ─── */}
        <View
          style={[
            styles.header,
            {
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: theme.spacing.sm,
              borderBottomColor: highContrast ? theme.colors.border : '#E2E8F0',
              backgroundColor: highContrast ? theme.colors.surface : '#FFFFFF',
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.headerIconCircle,
                { backgroundColor: highContrast ? theme.colors.bg : '#EEF2FF' },
              ]}
            >
              <Ionicons name="hand-right" size={18} color={theme.colors.primary} />
            </View>
            <AppText variant="title" bold>
              {VI_STRINGS.camera.title}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={VI_STRINGS.camera.closeButton}
            onPress={onClose}
            style={[
              styles.closeCircle,
              {
                backgroundColor: highContrast ? theme.colors.bg : '#F1F5F9',
              },
            ]}
          >
            <Ionicons name="close" size={22} color={theme.colors.text} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{
            padding: theme.spacing.lg,
            gap: theme.spacing.md,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Người kia vừa nói ─── */}
          {latestOther ? (
            <View
              style={[
                styles.otherSaidCard,
                {
                  backgroundColor: highContrast ? theme.colors.surface : '#EFF6FF',
                  borderColor: highContrast ? theme.colors.primary : '#BFDBFE',
                  borderRadius: theme.radii.subCard,
                  padding: theme.spacing.sm,
                },
              ]}
            >
              <Ionicons name="chatbubble-ellipses" size={16} color={theme.colors.primary} />
              <AppText
                testID="camera-other-pinned"
                variant="label"
                bold
                color={theme.colors.primary}
                style={{ flex: 1 }}
              >
                {VI_STRINGS.camera.otherSaidPrefix} {latestOther.text}
              </AppText>
            </View>
          ) : null}

          {/* ─── Mục 1: Khung Camera nhận diện ─── */}
          <View style={styles.sectionBlock}>
            <AppText variant="caption" weight="600" color={theme.colors.textMuted} style={styles.sectionLabel}>
              1. KHUNG CAMERA NHẬN DIỆN
            </AppText>
            <View
              style={[
                styles.cameraBox,
                {
                  borderRadius: theme.radii.card,
                  shadowColor: '#0F172A',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.08,
                  shadowRadius: 16,
                  elevation: 4,
                },
              ]}
            >
              <SignCameraScreen
                engine={engine}
                active={visible && snapshot.phase === 'capturing'}
                facing="front"
                hideTranscript
                renderDebugPanel={
                  typeof __DEV__ !== 'undefined' && __DEV__ === true
                    ? renderDevPanel
                    : undefined
                }
              />
            </View>
          </View>

          {/* ─── Mục 2: Câu đang ghép & Ngữ điệu ─── */}
          <View style={styles.sectionBlock}>
            <AppText variant="caption" weight="600" color={theme.colors.textMuted} style={styles.sectionLabel}>
              2. CÂU ĐANG GHÉP & NGỮ ĐIỆU
            </AppText>
            <View
              style={[
                styles.composingPanel,
                {
                  backgroundColor: highContrast ? theme.colors.surface : '#FFFFFF',
                  borderColor: highContrast ? theme.colors.border : 'rgba(226, 232, 240, 0.8)',
                  borderRadius: theme.radii.card,
                  padding: theme.spacing.md,
                },
              ]}
            >
              <View style={styles.composingHeader}>
                <Ionicons name="text-outline" size={16} color={theme.colors.textMuted} />
                <AppText variant="label" bold color={theme.colors.textMuted}>
                  {VI_STRINGS.camera.composingLabel}
                </AppText>
              </View>

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
                      onPress={() => {
                        hapticLight();
                        setSnapshot(flow.removeWordAt(idx));
                      }}
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
                <View style={styles.noticeRow}>
                  <Ionicons name="information-circle" size={16} color={theme.colors.warning} />
                  <AppText variant="body" bold color={theme.colors.warning} style={{ flex: 1 }}>
                    {snapshot.notice}
                  </AppText>
                </View>
              ) : null}

              {/* Ngữ điệu câu: 3 nút nằm đều trên 1 hàng ngang */}
              <View style={styles.modifierGroup}>
                <AppText variant="caption" weight="600" color={theme.colors.textMuted}>
                  Chọn ngữ điệu câu:
                </AppText>
                <View style={styles.modifierRow}>
                  {(['none', 'question', 'urgent'] as const).map((mod) => {
                    const active = modifier === mod;
                    const label = VI_STRINGS.camera.modifiers[mod];
                    return (
                      <Pressable
                        key={mod}
                        accessibilityRole="button"
                        accessibilityLabel={label}
                        testID={`modifier-${mod}`}
                        onPress={() => {
                          hapticLight();
                          setModifier(mod);
                        }}
                        style={[
                          styles.modifierPill,
                          {
                            minHeight: theme.dimensions.minTouchTarget,
                            borderRadius: theme.radii.chip,
                            backgroundColor: active
                              ? theme.colors.primary
                              : highContrast ? theme.colors.bg : '#F8FAFC',
                            borderWidth: 1,
                            borderColor: active ? theme.colors.primary : (highContrast ? theme.colors.border : '#E2E8F0'),
                          },
                        ]}
                      >
                        <Ionicons
                          name={MODIFIER_ICONS[mod]}
                          size={14}
                          color={active ? theme.colors.onPrimary : theme.colors.textMuted}
                        />
                        <AppText
                          variant="caption"
                          bold
                          numberOfLines={1}
                          color={active ? theme.colors.onPrimary : theme.colors.text}
                        >
                          {label}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Reviewing state */}
              {snapshot.phase === 'reviewing' && snapshot.pendingSentence ? (
                <View
                  style={[
                    styles.reviewingBox,
                    {
                      backgroundColor: highContrast ? theme.colors.bg : '#EFF6FF',
                      borderColor: highContrast ? theme.colors.primary : '#BFDBFE',
                      borderRadius: theme.radii.subCard,
                      padding: theme.spacing.sm,
                    },
                  ]}
                >
                  <View style={styles.reviewingRow}>
                    <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
                    <AppText variant="body" bold color={theme.colors.primary} style={{ flex: 1 }}>
                      {VI_STRINGS.camera.reviewingPrefix} {snapshot.pendingSentence}
                    </AppText>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={VI_STRINGS.camera.cancelReviewButton}
                    onPress={() => {
                      hapticWarning();
                      setSnapshot(flow.cancelReview());
                    }}
                    style={[
                      styles.cancelReviewBtn,
                      {
                        minHeight: theme.dimensions.minTouchTarget,
                        borderRadius: theme.radii.button,
                        backgroundColor: theme.colors.danger,
                      },
                    ]}
                  >
                    <Ionicons name="close-circle" size={16} color={theme.colors.onDanger} />
                    <AppText variant="label" bold color={theme.colors.onDanger}>
                      {VI_STRINGS.camera.cancelReviewButton}
                    </AppText>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </View>

          {/* ─── Mục 3: Điều khiển ─── */}
          <View style={styles.sectionBlock}>
            <AppText variant="caption" weight="600" color={theme.colors.textMuted} style={styles.sectionLabel}>
              3. ĐIỀU KHIỂN
            </AppText>
            <View style={styles.controlsStack}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  isCapturing
                    ? VI_STRINGS.camera.stopButton
                    : VI_STRINGS.camera.startButton
                }
                onPress={handleToggleCapture}
                style={({ pressed }) => [
                  styles.primaryActionFull,
                  {
                    minHeight: theme.dimensions.primaryActionMinHeight,
                    borderRadius: theme.radii.button,
                    backgroundColor: isCapturing ? theme.colors.danger : theme.colors.primary,
                    opacity: pressed ? 0.9 : 1,
                    shadowColor: isCapturing ? '#B91C1C' : '#1D4ED8',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 10,
                    elevation: 4,
                  },
                ]}
              >
                <Ionicons
                  name={isCapturing ? 'stop-circle' : 'play'}
                  size={20}
                  color={isCapturing ? theme.colors.onDanger : theme.colors.onPrimary}
                />
                <AppText
                  variant="body"
                  bold
                  color={isCapturing ? theme.colors.onDanger : theme.colors.onPrimary}
                >
                  {isCapturing
                    ? VI_STRINGS.camera.stopButton
                    : VI_STRINGS.camera.startButton}
                </AppText>
              </Pressable>

              <View style={styles.secondaryControlsRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={VI_STRINGS.camera.dropWordButton}
                  onPress={() => {
                    hapticLight();
                    setSnapshot(flow.dropLastWord());
                  }}
                  style={({ pressed }) => [
                    styles.secondaryActionBtn,
                    {
                      minHeight: theme.dimensions.minTouchTarget,
                      borderRadius: theme.radii.button,
                      backgroundColor: highContrast ? theme.colors.surface : '#FFFFFF',
                      borderWidth: 1,
                      borderColor: highContrast ? theme.colors.border : '#E2E8F0',
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <Ionicons name="backspace-outline" size={18} color={theme.colors.text} />
                  <AppText variant="label" bold>
                    {VI_STRINGS.camera.dropWordButton}
                  </AppText>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={VI_STRINGS.camera.correctButton}
                  disabled={!canCorrect}
                  onPress={() => {
                    hapticWarning();
                    flow.correctLastSentence(Date.now());
                    setSnapshot(flow.getSnapshot());
                  }}
                  style={({ pressed }) => [
                    styles.secondaryActionBtn,
                    {
                      minHeight: theme.dimensions.minTouchTarget,
                      borderRadius: theme.radii.button,
                      backgroundColor: canCorrect
                        ? theme.colors.warning
                        : highContrast ? theme.colors.surface : '#F8FAFC',
                      borderWidth: 1,
                      borderColor: canCorrect
                        ? theme.colors.warning
                        : highContrast ? theme.colors.border : '#E2E8F0',
                      opacity: !canCorrect ? 0.55 : pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name="arrow-undo"
                    size={18}
                    color={canCorrect ? theme.colors.onPrimary : theme.colors.textMuted}
                  />
                  <AppText
                    variant="label"
                    bold
                    color={canCorrect ? theme.colors.onPrimary : theme.colors.textMuted}
                  >
                    {VI_STRINGS.camera.correctButton}
                  </AppText>
                </Pressable>
              </View>
            </View>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otherSaidCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  sectionBlock: {
    gap: 8,
  },
  sectionLabel: {
    paddingHorizontal: 4,
    letterSpacing: 0.4,
  },
  cameraBox: {
    minHeight: 240,
    overflow: 'hidden',
  },
  composingPanel: {
    borderWidth: 1,
    gap: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  composingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  modifierGroup: {
    gap: 6,
    paddingTop: 4,
  },
  modifierRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modifierPill: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewingBox: {
    borderWidth: 1,
    gap: 8,
  },
  reviewingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cancelReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  controlsStack: {
    gap: 10,
  },
  primaryActionFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  secondaryControlsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
});

