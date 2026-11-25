import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { WordId } from '@sign/recognizer-contract';
import wordsSpec from '../../docs/spec/words.json';
import { VI_STRINGS } from '../../src/core/i18n/vi.ts';
import { AppText, useAppTheme } from '../../src/core/theme/ThemeProvider.tsx';
import { TopBar } from '../../src/core/theme/TopBar.tsx';

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

export default function DictionaryTab(): React.ReactElement {
  const theme = useAppTheme();
  const highContrast = theme.isHighContrast;

  const [query, setQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | undefined>(undefined);

  const filteredWords = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SPEC_WORDS.filter((w) => {
      if (selectedGroup && w.group !== selectedGroup) return false;
      if (!q) return true;
      return (
        w.vi.toLowerCase().includes(q) ||
        w.id.toLowerCase().includes(q) ||
        (GROUP_LABELS[w.group] || '').toLowerCase().includes(q)
      );
    });
  }, [query, selectedGroup]);

  const openWordDetail = useCallback((item: SpecWord) => {
    router.push({
      pathname: '/word-detail',
      params: { wordId: item.id },
    });
  }, []);

  const renderWordItem = useCallback(
    ({ item }: { item: SpecWord }) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.vi}, ${GROUP_LABELS[item.group] || item.group}`}
        onPress={() => openWordDetail(item)}
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
            <AppText variant="subhead" weight="700" color={theme.colors.text}>
              {item.vi}
            </AppText>
            <View
              style={[
                styles.groupBadge,
                { backgroundColor: highContrast ? theme.colors.bg : '#F1F5F9' },
              ]}
            >
              <AppText variant="caption" weight="500" color={theme.colors.textMuted}>
                {GROUP_LABELS[item.group] || item.group}
              </AppText>
            </View>
          </View>
        </View>

        <View style={styles.tileRightAction}>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </View>
      </Pressable>
    ),
    [highContrast, openWordDetail, theme]
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
            color={highContrast ? theme.colors.primary : '#D97706'}
          />
          <AppText
            variant="caption"
            color={highContrast ? theme.colors.text : '#92400E'}
            style={styles.noticeText}
          >
            {VI_STRINGS.dictionary.title} • {VI_STRINGS.dictionary.handPoseFallback}
          </AppText>
        </View>

        {/* Ô tìm kiếm từ vựng */}
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: highContrast ? theme.colors.surface : '#FFFFFF',
              borderColor: highContrast ? theme.colors.border : '#E2E8F0',
            },
          ]}
        >
          <Ionicons name="search" size={18} color={theme.colors.textMuted} />
          <TextInput
            allowFontScaling={false}
            value={query}
            onChangeText={setQuery}
            placeholder={VI_STRINGS.dictionary.searchPlaceholder}
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.searchInput, { color: theme.colors.text, fontSize: theme.fonts.subhead }]}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xóa tìm kiếm"
              onPress={() => setQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.clearBtn}
            >
              <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Bộ lọc theo nhóm từ */}
        <View style={styles.filterWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.cards.allFilter}
              testID="dict-group-all"
              onPress={() => setSelectedGroup(undefined)}
              style={[
                styles.filterPill,
                {
                  backgroundColor: !selectedGroup
                    ? theme.colors.primary
                    : highContrast
                      ? theme.colors.surface
                      : '#FFFFFF',
                  borderColor: !selectedGroup
                    ? theme.colors.primary
                    : highContrast
                      ? theme.colors.border
                      : '#E2E8F0',
                },
              ]}
            >
              <AppText
                variant="caption"
                weight="600"
                color={!selectedGroup ? theme.colors.onPrimary : theme.colors.text}
              >
                {VI_STRINGS.cards.allFilter}
              </AppText>
            </Pressable>

            {Object.entries(GROUP_LABELS).map(([key, label]) => {
              const active = selectedGroup === key;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  testID={`dict-group-${key}`}
                  onPress={() => setSelectedGroup(active ? undefined : key)}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: active
                        ? theme.colors.primary
                        : highContrast
                          ? theme.colors.surface
                          : '#FFFFFF',
                      borderColor: active
                        ? theme.colors.primary
                        : highContrast
                          ? theme.colors.border
                          : '#E2E8F0',
                    },
                  ]}
                >
                  <AppText
                    variant="caption"
                    weight="600"
                    color={active ? theme.colors.onPrimary : theme.colors.text}
                  >
                    {label}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Số lượng từ vựng hiển thị */}
        <View style={styles.summaryRow}>
          <AppText variant="caption" weight="600" color={theme.colors.textMuted}>
            {VI_STRINGS.dictionary.sectionTitle} ({filteredWords.length} TỪ)
          </AppText>
        </View>

        {/* Danh sách từ vựng mượt mà */}
        <FlatList
          data={filteredWords}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={true}
          contentContainerStyle={styles.listContent}
          renderItem={renderWordItem}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="search-outline" size={32} color={theme.colors.textMuted} />
              <AppText variant="body" color={theme.colors.textMuted}>
                Không tìm thấy ký hiệu phù hợp
              </AppText>
            </View>
          }
        />
      </View>
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
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
  },
  noticeText: {
    flex: 1,
    lineHeight: 18,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 48,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  filterWrapper: {
    marginVertical: 2,
  },
  filterScroll: {
    gap: 8,
    alignItems: 'center',
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  listContent: {
    paddingBottom: 112,
    gap: 10,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  wordTile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  wordTileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
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
    gap: 4,
    flex: 1,
  },
  groupBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tileRightAction: {
    paddingLeft: 8,
  },
});
