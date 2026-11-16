import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { RecognizerEngine, WordId } from '@sign/recognizer-contract';
import { SignCameraScreen } from '@sign/sign-ui/camera-screen';
import wordsSpec from '../../docs/spec/words.json';
import { VI_STRINGS } from '../../src/core/i18n/vi.ts';
import { useSystemStore } from '../../src/core/store/systemStatus.ts';
import { AppText, useAppTheme } from '../../src/core/theme/ThemeProvider.tsx';
import { TopBar } from '../../src/core/theme/TopBar.tsx';
import { speakVietnamese } from '../../src/core/tts/speechService.ts';
import { createAppEngine } from '../../src/features/camera/createAppEngine.ts';

declare const __DEV__: boolean | undefined;

interface SpecWord {
  id: WordId;
  vi: string;
  group: string;
}

const SPEC_WORDS = wordsSpec as SpecWord[];

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

export default function DictionaryTab(): React.ReactElement {
  const theme = useAppTheme();
  const highContrast = theme.isHighContrast;
  const speechRate = useSystemStore((s) => s.speechRate);

  const [query, setQuery] = useState('');
  const [selectedWord, setSelectedWord] = useState<SpecWord | null>(null);
  const [practicing, setPracticing] = useState(false);
  const [matched, setMatched] = useState(false);

  const engine = useMemo(
    () =>
      createAppEngine({
        useDevEngine: true,
        createProductionEngine: createFallbackProductionEngine,
      }),
    []
  );

  useEffect(() => {
    if (!practicing || !selectedWord) return;
    setMatched(false);
    const unsub = engine.subscribe((evt) => {
      if (evt.type === 'locked' && evt.word === selectedWord.id) {
        setMatched(true);
      }
    });
    return unsub;
  }, [engine, practicing, selectedWord]);

  const filtered = SPEC_WORDS.filter((w) =>
    w.vi.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: highContrast ? theme.colors.bg : '#F8FAFC' }]}>
      <TopBar title={VI_STRINGS.tabs.dictionary} />

      <View style={styles.body}>
        {/* Banner thông báo nguyên mẫu */}
        <View
          style={[
            styles.noticeBox,
            {
              backgroundColor: highContrast ? theme.colors.surface : '#FFFBEB',
              borderColor: highContrast ? theme.colors.border : '#FEF3C7',
            },
          ]}
        >
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={theme.colors.warning}
          />
          <AppText
            variant="caption"
            weight="500"
            color={theme.colors.warning}
            style={{ flex: 1 }}
          >
            {VI_STRINGS.dictionary.prototypeNotice}
          </AppText>
        </View>

        {/* Thanh tìm kiếm phong cách Soft-UI */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: highContrast ? theme.colors.surface : '#FFFFFF',
              borderColor: highContrast ? theme.colors.border : 'rgba(226, 232, 240, 0.8)',
            },
          ]}
        >
          <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
          <TextInput
            allowFontScaling={false}
            value={query}
            onChangeText={setQuery}
            placeholder={VI_STRINGS.dictionary.searchPlaceholder}
            placeholderTextColor={theme.colors.textMuted}
            style={[
              styles.searchInput,
              {
                fontSize: theme.fonts.subhead,
                color: theme.colors.text,
              },
            ]}
          />
          {query.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xóa tìm kiếm"
              onPress={() => setQuery('')}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {/* Tiêu đề danh mục */}
        <View style={styles.sectionHeaderRow}>
          <AppText variant="caption" weight="600" color={theme.colors.textMuted}>
            KÝ HIỆU TP.HCM ({filtered.length})
          </AppText>
        </View>

        {/* Danh sách thẻ từ ký hiệu */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.vi}
              onPress={() => {
                setSelectedWord(item);
                setPracticing(false);
                setMatched(false);
              }}
              style={({ pressed }) => [
                styles.wordTile,
                {
                  backgroundColor: highContrast ? theme.colors.surface : '#FFFFFF',
                  borderColor: highContrast ? theme.colors.border : 'rgba(241, 245, 249, 0.9)',
                  opacity: pressed ? 0.88 : 1,
                  transform: [{ scale: pressed ? 0.985 : 1 }],
                },
              ]}
            >
              <View style={styles.wordTileLeft}>
                <View
                  style={[
                    styles.wordIconBadge,
                    { backgroundColor: highContrast ? theme.colors.bg : '#EFF6FF' },
                  ]}
                >
                  <Ionicons name="hand-left-outline" size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.wordTitleCol}>
                  <AppText variant="subhead" weight="600" color={theme.colors.text}>
                    {item.vi}
                  </AppText>
                  <View style={styles.groupBadge}>
                    <AppText variant="caption" weight="500" color={theme.colors.textMuted}>
                      {item.id} · {item.group}
                    </AppText>
                  </View>
                </View>
              </View>

              <View style={styles.tileRightAction}>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </View>
            </Pressable>
          )}
        />
      </View>

      {/* Sheet chi tiết từ & Tập thử */}
      <Modal
        visible={selectedWord !== null}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setPracticing(false);
          setSelectedWord(null);
        }}
      >
        <View style={styles.sheetBackdrop}>
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: highContrast ? theme.colors.surface : '#FFFFFF',
              },
            ]}
          >
            <View style={styles.sheetHandleBar} />
            {selectedWord ? (
              <>
                <View style={styles.detailHeader}>
                  <View style={styles.detailTitleRow}>
                    <AppText variant="title" weight="700">
                      {selectedWord.vi}
                    </AppText>
                    <View style={styles.modalGroupPill}>
                      <AppText variant="caption" weight="600" color={theme.colors.primary}>
                        {selectedWord.group}
                      </AppText>
                    </View>
                  </View>
                  <AppText variant="caption" weight="500" color={theme.colors.textMuted}>
                    {VI_STRINGS.dictionary.handPoseFallback}
                  </AppText>
                </View>

                {practicing ? (
                  <View style={styles.practiceStage}>
                    <View style={styles.practiceStatusBox}>
                      <Ionicons
                        name="videocam-outline"
                        size={16}
                        color={theme.colors.primary}
                      />
                      <AppText variant="caption" weight="600" color={theme.colors.primary}>
                        {VI_STRINGS.dictionary.practiceTargetPrefix} {selectedWord.vi}
                      </AppText>
                    </View>
                    {matched ? (
                      <View
                        style={[
                          styles.matchedBanner,
                          {
                            backgroundColor: highContrast ? theme.colors.surface : '#DCFCE7',
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
                ) : null}

                <View style={styles.modalBtnRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={VI_STRINGS.dictionary.speakWordButton}
                    onPress={() => speakVietnamese(selectedWord.vi, { rate: speechRate })}
                    style={({ pressed }) => [
                      styles.btn,
                      {
                        flex: 1,
                        backgroundColor: highContrast ? theme.colors.bg : '#F8FAFC',
                        borderColor: highContrast ? theme.colors.border : '#E2E8F0',
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Ionicons
                      name="volume-high-outline"
                      size={18}
                      color={theme.colors.text}
                    />
                    <AppText variant="subhead" weight="600">
                      {VI_STRINGS.dictionary.speakWordButton}
                    </AppText>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={VI_STRINGS.dictionary.practiceButton}
                    onPress={() => setPracticing((p) => !p)}
                    style={({ pressed }) => [
                      styles.btn,
                      {
                        flex: 1,
                        backgroundColor: practicing ? theme.colors.danger : theme.colors.primary,
                        borderColor: practicing ? theme.colors.danger : theme.colors.primary,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Ionicons
                      name={practicing ? 'stop-circle-outline' : 'videocam-outline'}
                      size={18}
                      color={theme.colors.onPrimary}
                    />
                    <AppText variant="subhead" weight="600" color={theme.colors.onPrimary}>
                      {practicing
                        ? VI_STRINGS.dictionary.stopPracticeButton
                        : VI_STRINGS.dictionary.practiceButton}
                    </AppText>
                  </Pressable>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={VI_STRINGS.communicate.closeButton}
                  onPress={() => {
                    setPracticing(false);
                    setSelectedWord(null);
                  }}
                  style={({ pressed }) => [
                    styles.btn,
                    {
                      backgroundColor: highContrast ? theme.colors.bg : '#F1F5F9',
                      borderColor: 'transparent',
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <AppText variant="subhead" weight="600" color={theme.colors.textMuted}>
                    {VI_STRINGS.communicate.closeButton}
                  </AppText>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    height: 48,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
  },
  sectionHeaderRow: {
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  listContent: {
    gap: 10,
    paddingBottom: 100, // accommodate Floating Island Dock
  },
  wordTile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  wordTileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  wordIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordTitleCol: {
    gap: 2,
    flex: 1,
  },
  groupBadge: {
    alignSelf: 'flex-start',
  },
  tileRightAction: {
    paddingLeft: 8,
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  sheet: {
    maxHeight: '90%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    gap: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 12,
  },
  sheetHandleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 4,
  },
  detailHeader: {
    gap: 6,
  },
  detailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalGroupPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  practiceStage: {
    gap: 10,
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
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
});
