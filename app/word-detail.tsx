import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { RecognizerEngine, WordId } from '@sign/recognizer-contract';
import { SignCameraScreen } from '@sign/sign-ui/camera-screen';
import wordsSpec from '../docs/spec/words.json';
import { useCardsStore } from '../src/core/db/cardsStorage.ts';
import { VI_STRINGS } from '../src/core/i18n/vi.ts';
import { useSystemStore } from '../src/core/store/systemStatus.ts';
import { AppText, useAppTheme } from '../src/core/theme/ThemeProvider.tsx';
import { speakVietnamese } from '../src/core/tts/speechService.ts';
import { createAppEngine } from '../src/features/camera/createAppEngine.ts';
import {
  WORD_DETAILS_MAP,
  type WordDetailInfo,
} from '../src/features/dictionary/dictionaryDetails.ts';

declare const __DEV__: boolean | undefined;

interface SpecWord {
  id: WordId;
  vi: string;
  group: string;
}

const SPEC_WORDS = wordsSpec as SpecWord[];

const GROUP_LABELS: Record<string, string> = {
  chao_hoi: 'Chào hỏi',
  co_ban: 'Cơ bản',
  an_uong: 'Ăn uống',
  mua_ban: 'Mua bán',
  y_te: 'Y tế',
  di_lai: 'Đi lại',
};

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

export default function WordDetailScreen(): React.ReactElement {
  const theme = useAppTheme();
  const highContrast = theme.isHighContrast;
  const speechRate = useSystemStore((s) => s.speechRate);
  const createCard = useCardsStore((s) => s.createCard);

  const params = useLocalSearchParams<{ wordId?: string }>();
  const wordId = (params.wordId || 'xin_chao') as WordId;

  const currentWord = useMemo(
    () => SPEC_WORDS.find((w) => w.id === wordId) || { id: wordId, vi: 'Từ ký hiệu', group: 'co_ban' },
    [wordId]
  );

  const currentDetail: WordDetailInfo = useMemo(() => {
    return (
      WORD_DETAILS_MAP[wordId] ?? {
        id: wordId,
        vi: currentWord.vi,
        group: currentWord.group,
        handshape: 'Đang đối chiếu Sổ nguồn mô tả bàn tay...',
        location: 'Vị trí tự nhiên trước cơ thể.',
        movement: 'Chuyển động ký hiệu tự nhiên.',
        facial: 'Biểu cảm phù hợp với ý nghĩa.',
        exampleSentence: `${currentWord.vi}.`,
        notes: 'Nguyên mẫu tham chiếu, đang đối chiếu nguồn.',
      }
    );
  }, [wordId, currentWord]);

  const [isSlowMotion, setIsSlowMotion] = useState(false);
  const [isSimulatingAnim, setIsSimulatingAnim] = useState(true);
  const [saveToast, setSaveToast] = useState(false);
  const [practicing, setPracticing] = useState(false);
  const [matched, setMatched] = useState(false);

  // Hiệu ứng nhịp điệu cử chỉ trực quan
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const triggerVisualPulse = useCallback(() => {
    pulseAnim.setValue(0.95);
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.08,
        duration: isSlowMotion ? 400 : 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: isSlowMotion ? 350 : 200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsSimulatingAnim(false);
    });
  }, [isSlowMotion, pulseAnim]);

  useEffect(() => {
    triggerVisualPulse();
  }, [wordId, triggerVisualPulse]);

  const engine = useMemo(
    () =>
      createAppEngine({
        useDevEngine: true,
        createProductionEngine: createFallbackProductionEngine,
      }),
    []
  );

  useEffect(() => {
    if (!practicing) return;
    setMatched(false);
    const unsub = engine.subscribe((evt) => {
      if (evt.type === 'locked' && evt.word === wordId) {
        setMatched(true);
      }
    });
    return () => unsub();
  }, [engine, practicing, wordId]);

  const handleSaveToCards = useCallback(() => {
    const topic = GROUP_LABELS[currentWord.group] || 'Cơ bản';
    createCard({ content: currentWord.vi, topic });
    setSaveToast(true);
    setTimeout(() => {
      setSaveToast(false);
    }, 2500);
  }, [currentWord, createCard]);

  const handleReplayGesture = () => {
    setIsSimulatingAnim(true);
    triggerVisualPulse();
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.root, { backgroundColor: highContrast ? theme.colors.bg : '#F8FAFC' }]}>
      {/* Top Header thanh thoát, không che khuất Status Bar */}
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: highContrast ? theme.colors.surface : '#FFFFFF',
            borderBottomColor: highContrast ? theme.colors.border : '#E2E8F0',
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={VI_STRINGS.dictionary.backToList}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={({ pressed }) => [
            styles.backBtn,
            {
              backgroundColor: highContrast ? theme.colors.bg : '#F1F5F9',
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
          <AppText variant="caption" weight="600" color={theme.colors.text}>
            {VI_STRINGS.dictionary.backToList}
          </AppText>
        </Pressable>

        <AppText variant="title" weight="700" color={theme.colors.text} style={styles.topBarTitle}>
          {VI_STRINGS.dictionary.detailTitle}
        </AppText>

        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Banner Từ vựng: Tên từ + Loa phát âm nằm ngay cạnh chữ */}
        <View
          style={[
            styles.bannerCard,
            {
              backgroundColor: highContrast ? theme.colors.surface : '#FFFFFF',
              borderColor: highContrast ? theme.colors.border : 'rgba(226, 232, 240, 0.9)',
            },
          ]}
        >
          <View style={styles.bannerRow}>
            <View style={styles.bannerLeftCol}>
              {/* Tên từ vựng + Nút phát âm loa nằm ngay bên cạnh */}
              <View style={styles.wordTitleRow}>
                <AppText variant="display" weight="700" color={theme.colors.text}>
                  {currentWord.vi}
                </AppText>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={VI_STRINGS.dictionary.speakWordButton}
                  onPress={() => speakVietnamese(currentWord.vi, { rate: isSlowMotion ? 0.7 : speechRate })}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={({ pressed }) => [
                    styles.speakerBtn,
                    {
                      backgroundColor: highContrast ? theme.colors.bg : '#EFF6FF',
                      borderColor: highContrast ? theme.colors.border : '#BFDBFE',
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Ionicons name="volume-high" size={22} color={theme.colors.primary} />
                </Pressable>
              </View>

              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.tagPill,
                    { backgroundColor: highContrast ? theme.colors.bg : '#EFF6FF' },
                  ]}
                >
                  <AppText variant="caption" weight="600" color={theme.colors.primary}>
                    {GROUP_LABELS[currentWord.group] || currentWord.group}
                  </AppText>
                </View>
                <View
                  style={[
                    styles.tagPill,
                    { backgroundColor: highContrast ? theme.colors.bg : '#F1F5F9' },
                  ]}
                >
                  <AppText variant="caption" weight="500" color={theme.colors.textMuted}>
                    #{currentWord.id}
                  </AppText>
                </View>
              </View>
            </View>

            {/* Nút lưu vào thẻ câu cá nhân */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.dictionary.saveToCardsButton}
              onPress={handleSaveToCards}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={({ pressed }) => [
                styles.bookmarkBtn,
                {
                  backgroundColor: highContrast ? theme.colors.bg : '#F8FAFC',
                  borderColor: highContrast ? theme.colors.border : '#E2E8F0',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons name="bookmark-outline" size={18} color={theme.colors.primary} />
              <AppText variant="caption" weight="600" color={theme.colors.primary}>
                {VI_STRINGS.dictionary.saveToCardsButton}
              </AppText>
            </Pressable>
          </View>

          {saveToast ? (
            <View
              style={[
                styles.saveToastBox,
                { backgroundColor: highContrast ? theme.colors.bg : '#DCFCE7' },
              ]}
            >
              <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
              <AppText variant="caption" weight="600" color={theme.colors.success}>
                {VI_STRINGS.dictionary.saveToCardsSuccess}
              </AppText>
            </View>
          ) : null}
        </View>

        {/* Khối Minh họa cử chỉ thị giác */}
        <View
          style={[
            styles.visualCard,
            {
              backgroundColor: highContrast ? theme.colors.surface : '#FFFFFF',
              borderColor: highContrast ? theme.colors.border : 'rgba(226, 232, 240, 0.8)',
            },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <View
                style={[
                  styles.headerIconCircle,
                  { backgroundColor: highContrast ? theme.colors.bg : '#EFF6FF' },
                ]}
              >
                <Ionicons name="eye-outline" size={16} color={theme.colors.primary} />
              </View>
              <AppText variant="subhead" weight="700" color={theme.colors.text}>
                {VI_STRINGS.dictionary.videoSectionTitle}
              </AppText>
            </View>

            <View
              style={[
                styles.viewBadge,
                { backgroundColor: highContrast ? theme.colors.bg : '#F1F5F9' },
              ]}
            >
              <AppText variant="caption" weight="600" color={theme.colors.textMuted}>
                Góc nhìn chính diện
              </AppText>
            </View>
          </View>

          {/* Khung mô phỏng cử chỉ động */}
          <View style={styles.gestureDisplayArea}>
            <View
              style={[
                styles.gestureGraphicBox,
                {
                  backgroundColor: highContrast ? theme.colors.bg : '#F8FAFC',
                  borderColor: highContrast ? theme.colors.border : '#E2E8F0',
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.handIconRing,
                  {
                    transform: [{ scale: pulseAnim }],
                    borderColor: isSimulatingAnim ? theme.colors.primary : '#CBD5E1',
                    backgroundColor: highContrast ? theme.colors.surface : '#FFFFFF',
                  },
                ]}
              >
                <Ionicons
                  name="hand-left"
                  size={52}
                  color={isSimulatingAnim ? theme.colors.primary : '#64748B'}
                />
              </Animated.View>

              <View style={styles.gestureMetaBox}>
                <AppText variant="body" weight="700" color={theme.colors.text} style={{ textAlign: 'center' }}>
                  Ký hiệu: {currentWord.vi}
                </AppText>
                <AppText
                  variant="caption"
                  color={theme.colors.textMuted}
                  style={{ marginTop: 4, lineHeight: 18, textAlign: 'center' }}
                >
                  {currentDetail.handshape}
                </AppText>
              </View>
            </View>
          </View>

          {/* Điều khiển tốc độ và phát lại */}
          <View style={styles.playbackControlsRow}>
            <View style={styles.speedToggleGroup}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setIsSlowMotion(false)}
                style={[
                  styles.speedBtn,
                  !isSlowMotion && {
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.primary,
                  },
                ]}
              >
                <AppText
                  variant="caption"
                  weight="600"
                  color={!isSlowMotion ? theme.colors.onPrimary : theme.colors.text}
                >
                  1.0x Chuẩn
                </AppText>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => setIsSlowMotion(true)}
                style={[
                  styles.speedBtn,
                  isSlowMotion && {
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.primary,
                  },
                ]}
              >
                <AppText
                  variant="caption"
                  weight="600"
                  color={isSlowMotion ? theme.colors.onPrimary : theme.colors.text}
                >
                  0.5x Chậm
                </AppText>
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={handleReplayGesture}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={({ pressed }) => [
                styles.replayBtn,
                {
                  backgroundColor: highContrast ? theme.colors.bg : '#F1F5F9',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons name="refresh" size={16} color={theme.colors.text} />
              <AppText variant="caption" weight="600" color={theme.colors.text}>
                Phát lại
              </AppText>
            </Pressable>
          </View>
        </View>

        {/* 4 Thành phần ký hiệu phân tách trực quan */}
        <View style={styles.componentsSectionWrapper}>
          <View style={styles.componentsSectionHeader}>
            <Ionicons name="layers-outline" size={18} color={theme.colors.primary} />
            <AppText variant="subhead" weight="700" color={theme.colors.text}>
              {VI_STRINGS.dictionary.componentsTitle}
            </AppText>
          </View>

          <View style={styles.componentsCardGrid}>
            {/* 1. Hình dáng bàn tay */}
            <View
              style={[
                styles.componentBox,
                {
                  backgroundColor: highContrast ? theme.colors.surface : '#FFFFFF',
                  borderColor: highContrast ? theme.colors.border : 'rgba(226, 232, 240, 0.8)',
                },
              ]}
            >
              <View style={styles.componentBoxHeader}>
                <View style={styles.compHeaderLeft}>
                  <View
                    style={[
                      styles.compNumberBadge,
                      { backgroundColor: highContrast ? theme.colors.bg : '#EFF6FF' },
                    ]}
                  >
                    <AppText variant="caption" weight="700" color={theme.colors.primary}>
                      1
                    </AppText>
                  </View>
                  <AppText variant="body" weight="700" color={theme.colors.text}>
                    {VI_STRINGS.dictionary.handshapeLabel}
                  </AppText>
                </View>
                <View
                  style={[
                    styles.compMiniTag,
                    { backgroundColor: highContrast ? theme.colors.bg : '#F8FAFC' },
                  ]}
                >
                  <AppText variant="caption" weight="500" color={theme.colors.textMuted}>
                    Dạng bàn tay
                  </AppText>
                </View>
              </View>
              <AppText variant="body" color={theme.colors.text} style={styles.compDescText}>
                {currentDetail.handshape}
              </AppText>
            </View>

            {/* 2. Vị trí thực hiện */}
            <View
              style={[
                styles.componentBox,
                {
                  backgroundColor: highContrast ? theme.colors.surface : '#FFFFFF',
                  borderColor: highContrast ? theme.colors.border : 'rgba(226, 232, 240, 0.8)',
                },
              ]}
            >
              <View style={styles.componentBoxHeader}>
                <View style={styles.compHeaderLeft}>
                  <View
                    style={[
                      styles.compNumberBadge,
                      { backgroundColor: highContrast ? theme.colors.bg : '#F0FDF4' },
                    ]}
                  >
                    <AppText variant="caption" weight="700" color={theme.colors.success}>
                      2
                    </AppText>
                  </View>
                  <AppText variant="body" weight="700" color={theme.colors.text}>
                    {VI_STRINGS.dictionary.locationLabel}
                  </AppText>
                </View>
                <View
                  style={[
                    styles.compMiniTag,
                    { backgroundColor: highContrast ? theme.colors.bg : '#F8FAFC' },
                  ]}
                >
                  <AppText variant="caption" weight="500" color={theme.colors.textMuted}>
                    Không gian
                  </AppText>
                </View>
              </View>
              <AppText variant="body" color={theme.colors.text} style={styles.compDescText}>
                {currentDetail.location}
              </AppText>
            </View>

            {/* 3. Chuyển động & Hướng */}
            <View
              style={[
                styles.componentBox,
                {
                  backgroundColor: highContrast ? theme.colors.surface : '#FFFFFF',
                  borderColor: highContrast ? theme.colors.border : 'rgba(226, 232, 240, 0.8)',
                },
              ]}
            >
              <View style={styles.componentBoxHeader}>
                <View style={styles.compHeaderLeft}>
                  <View
                    style={[
                      styles.compNumberBadge,
                      { backgroundColor: highContrast ? theme.colors.bg : '#FFFBEB' },
                    ]}
                  >
                    <AppText variant="caption" weight="700" color="#D97706">
                      3
                    </AppText>
                  </View>
                  <AppText variant="body" weight="700" color={theme.colors.text}>
                    {VI_STRINGS.dictionary.movementLabel}
                  </AppText>
                </View>
                <View
                  style={[
                    styles.compMiniTag,
                    { backgroundColor: highContrast ? theme.colors.bg : '#F8FAFC' },
                  ]}
                >
                  <AppText variant="caption" weight="500" color={theme.colors.textMuted}>
                    Quỹ đạo
                  </AppText>
                </View>
              </View>
              <AppText variant="body" color={theme.colors.text} style={styles.compDescText}>
                {currentDetail.movement}
              </AppText>
            </View>

            {/* 4. Biểu cảm khuôn mặt */}
            <View
              style={[
                styles.componentBox,
                {
                  backgroundColor: highContrast ? theme.colors.surface : '#FFFFFF',
                  borderColor: highContrast ? theme.colors.border : 'rgba(226, 232, 240, 0.8)',
                },
              ]}
            >
              <View style={styles.componentBoxHeader}>
                <View style={styles.compHeaderLeft}>
                  <View
                    style={[
                      styles.compNumberBadge,
                      { backgroundColor: highContrast ? theme.colors.bg : '#FAF5FF' },
                    ]}
                  >
                    <AppText variant="caption" weight="700" color="#9333EA">
                      4
                    </AppText>
                  </View>
                  <AppText variant="body" weight="700" color={theme.colors.text}>
                    {VI_STRINGS.dictionary.facialLabel}
                  </AppText>
                </View>
                <View
                  style={[
                    styles.compMiniTag,
                    { backgroundColor: highContrast ? theme.colors.bg : '#F8FAFC' },
                  ]}
                >
                  <AppText variant="caption" weight="500" color={theme.colors.textMuted}>
                    Thái độ
                  </AppText>
                </View>
              </View>
              <AppText variant="body" color={theme.colors.text} style={styles.compDescText}>
                {currentDetail.facial}
              </AppText>
            </View>
          </View>
        </View>

        {/* Ngữ cảnh giao tiếp & Ghi chú thực tế */}
        <View
          style={[
            styles.exampleCard,
            {
              backgroundColor: highContrast ? theme.colors.surface : '#FFFFFF',
              borderColor: highContrast ? theme.colors.border : 'rgba(226, 232, 240, 0.8)',
            },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <View
                style={[
                  styles.headerIconCircle,
                  { backgroundColor: highContrast ? theme.colors.bg : '#EFF6FF' },
                ]}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={theme.colors.primary} />
              </View>
              <AppText variant="subhead" weight="700" color={theme.colors.text}>
                {VI_STRINGS.dictionary.exampleTitle}
              </AppText>
            </View>
          </View>

          <View
            style={[
              styles.exampleContentBox,
              {
                backgroundColor: highContrast ? theme.colors.bg : '#F8FAFC',
                borderColor: highContrast ? theme.colors.border : '#E2E8F0',
              },
            ]}
          >
            <AppText
              variant="body"
              weight="500"
              color={theme.colors.text}
              style={styles.exampleSentenceText}
            >
              "{currentDetail.exampleSentence}"
            </AppText>

            <Pressable
              accessibilityRole="button"
              onPress={() => speakVietnamese(currentDetail.exampleSentence, { rate: speechRate })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={({ pressed }) => [
                styles.listenExampleBtn,
                {
                  backgroundColor: highContrast ? theme.colors.surface : '#EFF6FF',
                  borderColor: highContrast ? theme.colors.border : '#BFDBFE',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons name="volume-medium-outline" size={16} color={theme.colors.primary} />
              <AppText variant="caption" weight="600" color={theme.colors.primary}>
                Nghe câu ví dụ
              </AppText>
            </Pressable>
          </View>
        </View>

        {/* Khối Ghi chú học viên */}
        <View
          style={[
            styles.notesCard,
            {
              backgroundColor: highContrast ? theme.colors.surface : '#FFFBEB',
              borderColor: highContrast ? theme.colors.border : '#FEF3C7',
            },
          ]}
        >
          <View style={styles.cardHeaderLeft}>
            <Ionicons name="bulb-outline" size={18} color="#D97706" />
            <AppText variant="caption" weight="700" color="#B45309">
              GHI CHÚ HỌC VIÊN
            </AppText>
          </View>
          <AppText variant="caption" color="#92400E" style={{ lineHeight: 20 }}>
            {currentDetail.notes}
          </AppText>
        </View>

        {/* Nút hành động chính: Bật Camera tập ký hiệu */}
        <Pressable
          accessibilityRole="button"
          onPress={() => setPracticing(!practicing)}
          style={({ pressed }) => [
            styles.practiceMainBtn,
            {
              backgroundColor: practicing ? theme.colors.danger : theme.colors.primary,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Ionicons
            name={practicing ? 'stop-circle-outline' : 'videocam-outline'}
            size={20}
            color={theme.colors.onPrimary}
          />
          <AppText variant="subhead" weight="700" color={theme.colors.onPrimary}>
            {practicing
              ? VI_STRINGS.dictionary.stopPracticeButton
              : VI_STRINGS.dictionary.practiceButton}
          </AppText>
        </Pressable>

        {/* Khung camera khi bật chế độ tập thử */}
        {practicing && (
          <View
            style={[
              styles.practiceContainer,
              {
                backgroundColor: highContrast ? theme.colors.surface : '#FFFFFF',
                borderColor: highContrast ? theme.colors.border : '#E2E8F0',
              },
            ]}
          >
            <View style={styles.practiceStatusBox}>
              <Ionicons name="videocam-outline" size={16} color={theme.colors.primary} />
              <AppText variant="caption" weight="600" color={theme.colors.primary}>
                {VI_STRINGS.dictionary.practiceTargetPrefix} {currentWord.vi}
              </AppText>
            </View>

            {matched ? (
              <View
                style={[
                  styles.matchedBanner,
                  {
                    backgroundColor: highContrast ? theme.colors.bg : '#DCFCE7',
                  },
                ]}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color={theme.colors.success}
                />
                <AppText variant="caption" weight="600" color={theme.colors.success}>
                  {VI_STRINGS.dictionary.practiceMatched}
                </AppText>
              </View>
            ) : null}

            <View style={styles.cameraBox}>
              <SignCameraScreen
                engine={engine}
                active={practicing}
                facing="front"
                renderDebugPanel={
                  typeof __DEV__ !== 'undefined' && __DEV__ === true
                    ? renderDevPanel
                    : undefined
                }
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
    borderBottomWidth: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 3,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  topBarTitle: {
    letterSpacing: -0.2,
  },
  topBarSpacer: {
    width: 60,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  bannerCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  bannerLeftCol: {
    gap: 10,
    flex: 1,
  },
  wordTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  speakerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bookmarkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  saveToastBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  visualCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  gestureDisplayArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gestureGraphicBox: {
    width: '100%',
    minHeight: 180,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  handIconRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gestureMetaBox: {
    alignItems: 'center',
    maxWidth: '92%',
  },
  playbackControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  speedToggleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  speedBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  replayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  componentsSectionWrapper: {
    gap: 10,
  },
  componentsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  componentsCardGrid: {
    gap: 10,
  },
  componentBox: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  componentBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  compNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compMiniTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  compDescText: {
    lineHeight: 22,
    paddingLeft: 30,
  },
  exampleCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  exampleContentBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  exampleSentenceText: {
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  listenExampleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  notesCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  practiceMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 50,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  practiceContainer: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  practiceStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  matchedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  cameraBox: {
    minHeight: 250,
    borderRadius: 16,
    overflow: 'hidden',
  },
});
