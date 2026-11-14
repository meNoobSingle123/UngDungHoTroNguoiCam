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
  const highContrast = useSystemStore((s) => s.highContrast);
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
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: theme.colors.bg }]}>
      <TopBar title={VI_STRINGS.tabs.dictionary} />

      <View style={[styles.body, { padding: theme.spacing.md, gap: theme.spacing.sm }]}>
        {/* Banner thông báo nguyên mẫu */}
        <View
          style={[
            styles.noticeBox,
            {
              backgroundColor: highContrast ? theme.colors.surface : '#FFFBEB',
              borderColor: highContrast ? theme.colors.border : '#FDE68A',
              borderRadius: 14,
            },
          ]}
        >
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={theme.colors.warning}
          />
          <AppText
            variant="label"
            bold
            color={theme.colors.warning}
            style={{ flex: 1 }}
          >
            {VI_STRINGS.dictionary.prototypeNotice}
          </AppText>
        </View>

        {/* Thanh tìm kiếm */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Ionicons name="search-outline" size={20} color={theme.colors.textMuted} />
          <TextInput
            allowFontScaling={false}
            value={query}
            onChangeText={setQuery}
            placeholder={VI_STRINGS.dictionary.searchPlaceholder}
            placeholderTextColor={theme.colors.textMuted}
            style={[
              styles.searchInput,
              {
                fontSize: theme.fonts.body,
                color: theme.colors.text,
              },
            ]}
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {/* Danh sách từ ký hiệu */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 24 }}
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
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderRadius: 14,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={styles.wordTileLeft}>
                <View
                  style={[
                    styles.wordIconBadge,
                    { backgroundColor: highContrast ? theme.colors.bg : '#EEF2FF' },
                  ]}
                >
                  <Ionicons name="hand-left-outline" size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.wordTitleCol}>
                  <AppText variant="title" bold>
                    {item.vi}
                  </AppText>
                  <View style={styles.groupBadge}>
                    <AppText variant="label" color={theme.colors.textMuted}>
                      {item.id} · {item.group}
                    </AppText>
                  </View>
                </View>
              </View>

              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
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
                backgroundColor: theme.colors.bg,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: theme.spacing.lg,
                gap: 12,
              },
            ]}
          >
            <View style={styles.sheetHandleBar} />
            {selectedWord ? (
              <>
                <View style={styles.detailHeader}>
                  <AppText variant="display" bold>
                    {selectedWord.vi}
                  </AppText>
                  <AppText variant="body" color={theme.colors.textMuted}>
                    {VI_STRINGS.dictionary.handPoseFallback}
                  </AppText>
                </View>

                {practicing ? (
                  <View style={styles.practiceStage}>
                    <View style={styles.practiceStatusBox}>
                      <Ionicons
                        name="videocam-outline"
                        size={18}
                        color={theme.colors.primary}
                      />
                      <AppText variant="body" bold color={theme.colors.primary}>
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
                          size={20}
                          color={theme.colors.success}
                        />
                        <AppText variant="body" bold color={theme.colors.success}>
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

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={VI_STRINGS.dictionary.speakWordButton}
                    onPress={() => speakVietnamese(selectedWord.vi, { rate: speechRate })}
                    style={[
                      styles.btn,
                      {
                        flex: 1,
                        minHeight: 48,
                        borderRadius: 14,
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="volume-high-outline"
                      size={18}
                      color={theme.colors.text}
                    />
                    <AppText variant="body" bold>
                      {VI_STRINGS.dictionary.speakWordButton}
                    </AppText>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={VI_STRINGS.dictionary.practiceButton}
                    onPress={() => setPracticing((p) => !p)}
                    style={[
                      styles.btn,
                      {
                        flex: 1,
                        minHeight: 48,
                        borderRadius: 14,
                        backgroundColor: theme.colors.primary,
                        borderColor: theme.colors.primary,
                      },
                    ]}
                  >
                    <Ionicons
                      name={practicing ? 'stop-circle-outline' : 'videocam-outline'}
                      size={18}
                      color={theme.colors.onPrimary}
                    />
                    <AppText variant="body" bold color={theme.colors.onPrimary}>
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
                  style={[
                    styles.btn,
                    {
                      minHeight: 48,
                      borderRadius: 14,
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <AppText variant="body" bold>
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
  body: { flex: 1 },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    padding: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
  },
  wordTile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  wordTileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  wordIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordTitleCol: {
    gap: 2,
  },
  groupBadge: {
    alignSelf: 'flex-start',
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  sheetHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 4,
  },
  detailHeader: {
    gap: 4,
  },
  practiceStage: {
    gap: 8,
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
    padding: 8,
    borderRadius: 10,
  },
  cameraBox: {
    minHeight: 250,
    borderRadius: 16,
    overflow: 'hidden',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
});
