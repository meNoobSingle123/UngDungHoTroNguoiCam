import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCardsStore } from '../../src/core/db/cardsStorage.ts';
import { VI_STRINGS } from '../../src/core/i18n/vi.ts';
import { useSystemStore } from '../../src/core/store/systemStatus.ts';
import { AppText, useAppTheme } from '../../src/core/theme/ThemeProvider.tsx';
import { TopBar } from '../../src/core/theme/TopBar.tsx';
import { speakVietnamese } from '../../src/core/tts/speechService.ts';
import type { CardFilterScope } from '../../src/features/cards/cardStore.ts';

export default function CardsTab(): React.ReactElement {
  const theme = useAppTheme();
  const highContrast = useSystemStore((s) => s.highContrast);
  const speechRate = useSystemStore((s) => s.speechRate);

  const revision = useCardsStore((s) => s.revision);
  const lastError = useCardsStore((s) => s.lastError);
  const undoUntil = useCardsStore((s) => s.undoAvailableUntilMs);
  const listCards = useCardsStore((s) => s.listCards);
  const createCard = useCardsStore((s) => s.createCard);
  const editCard = useCardsStore((s) => s.editCard);
  const deleteCard = useCardsStore((s) => s.deleteCard);
  const undoDelete = useCardsStore((s) => s.undoDelete);
  const togglePin = useCardsStore((s) => s.togglePin);
  const clearError = useCardsStore((s) => s.clearError);

  const [scope, setScope] = useState<CardFilterScope>('all');
  const [selectedTopic, setSelectedTopic] = useState<string | undefined>(undefined);
  const [query, setQuery] = useState('');

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState('');
  const [draftTopic, setDraftTopic] = useState<string>(VI_STRINGS.cards.topics[0]);

  void revision;
  const visibleCards = listCards({ scope, topic: selectedTopic, query });
  const showUndo = undoUntil !== null && Date.now() <= undoUntil;

  const openCreate = () => {
    setEditingId(null);
    setDraftContent('');
    setDraftTopic(VI_STRINGS.cards.topics[0]);
    setEditorOpen(true);
  };

  const openEdit = (id: string, content: string, topic?: string) => {
    setEditingId(id);
    setDraftContent(content);
    setDraftTopic(topic ?? VI_STRINGS.cards.topics[0]);
    setEditorOpen(true);
  };

  const handleSave = () => {
    if (editingId) {
      editCard(editingId, { content: draftContent, topic: draftTopic });
    } else {
      createCard({ content: draftContent, topic: draftTopic });
    }
    setEditorOpen(false);
  };

  const getTopicColor = (topic?: string) => {
    if (highContrast) return { bg: theme.colors.surface, text: theme.colors.text };
    switch (topic) {
      case 'Khẩn cấp':
        return { bg: '#FEE2E2', text: '#991B1B' };
      case 'Y tế':
        return { bg: '#FFEDD5', text: '#9A3412' };
      case 'Ăn uống':
        return { bg: '#DCFCE7', text: '#166534' };
      case 'Di chuyển':
        return { bg: '#E0E7FF', text: '#3730A3' };
      default:
        return { bg: '#F1F5F9', text: '#334155' };
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: theme.colors.bg }]}>
      <TopBar title={VI_STRINGS.tabs.cards} />

      <View style={[styles.body, { padding: theme.spacing.md, gap: theme.spacing.sm }]}>
        {/* Thanh tìm kiếm phong cách modern */}
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
            placeholder={VI_STRINGS.cards.searchPlaceholder}
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

        {/* Hàng bộ lọc danh mục */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={{ gap: 8, alignItems: 'center' }}
        >
          {(['all', 'mine'] as const).map((s) => {
            const active = scope === s && !selectedTopic;
            const label =
              s === 'all' ? VI_STRINGS.cards.allFilter : VI_STRINGS.cards.mineFilter;
            return (
              <Pressable
                key={s}
                accessibilityRole="button"
                accessibilityLabel={label}
                onPress={() => {
                  setScope(s);
                  setSelectedTopic(undefined);
                }}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                    borderColor: active ? theme.colors.primary : theme.colors.border,
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

          {VI_STRINGS.cards.topics.map((topic) => {
            const active = selectedTopic === topic;
            return (
              <Pressable
                key={topic}
                accessibilityRole="button"
                accessibilityLabel={topic}
                onPress={() => setSelectedTopic(active ? undefined : topic)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                    borderColor: active ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <AppText
                  variant="label"
                  bold
                  color={active ? theme.colors.onPrimary : theme.colors.text}
                >
                  {topic}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>

        {lastError ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={lastError}
            onPress={clearError}
            style={styles.errorBanner}
          >
            <Ionicons name="alert-circle-outline" size={18} color={theme.colors.danger} />
            <AppText variant="label" bold color={theme.colors.danger}>
              {lastError}
            </AppText>
          </Pressable>
        ) : null}

        {/* Banner Hoàn tác nổi */}
        {showUndo ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={VI_STRINGS.cards.deletedUndo}
            onPress={undoDelete}
            style={[
              styles.undoBar,
              {
                backgroundColor: theme.colors.primary,
                borderRadius: 14,
              },
            ]}
          >
            <Ionicons name="arrow-undo-outline" size={20} color={theme.colors.onPrimary} />
            <AppText variant="body" bold color={theme.colors.onPrimary}>
              {VI_STRINGS.cards.deletedUndo}
            </AppText>
          </Pressable>
        ) : null}

        {/* Nút Tạo thẻ mới */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={VI_STRINGS.cards.createButton}
          onPress={openCreate}
          style={({ pressed }) => [
            styles.createBtn,
            {
              backgroundColor: theme.colors.primary,
              borderRadius: 16,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Ionicons name="add-circle-outline" size={22} color={theme.colors.onPrimary} />
          <AppText variant="body" bold color={theme.colors.onPrimary}>
            {VI_STRINGS.cards.createButton}
          </AppText>
        </Pressable>

        {/* Danh sách thẻ giao tiếp dạng Cards */}
        <FlatList
          data={visibleCards}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="albums-outline" size={40} color={theme.colors.textMuted} />
              <AppText variant="body" color={theme.colors.textMuted}>
                {VI_STRINGS.cards.emptyState}
              </AppText>
            </View>
          }
          contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
          renderItem={({ item }) => {
            const topicColors = getTopicColor(item.topic);
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={item.content}
                onPress={() => speakVietnamese(item.content, { rate: speechRate })}
                style={({ pressed }) => [
                  styles.cardTile,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: item.pinned ? theme.colors.primary : theme.colors.border,
                    borderRadius: 16,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeaderLeft}>
                    {item.topic ? (
                      <View
                        style={[
                          styles.topicBadge,
                          {
                            backgroundColor: topicColors.bg,
                          },
                        ]}
                      >
                        <AppText variant="label" bold color={topicColors.text}>
                          {item.topic}
                        </AppText>
                      </View>
                    ) : null}
                    {item.isDefault ? (
                      <AppText variant="label" color={theme.colors.textMuted}>
                        · {VI_STRINGS.cards.defaultTag}
                      </AppText>
                    ) : null}
                  </View>

                  <View
                    style={[
                      styles.speakIconCircle,
                      { backgroundColor: highContrast ? theme.colors.bg : '#EEF2FF' },
                    ]}
                  >
                    <Ionicons
                      name="volume-medium-outline"
                      size={20}
                      color={theme.colors.primary}
                    />
                  </View>
                </View>

                <AppText variant="title" bold style={styles.cardContentText}>
                  {item.content}
                </AppText>

                {!item.isDefault ? (
                  <View style={[styles.cardActionsRow, { borderTopColor: theme.colors.border }]}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        item.pinned ? VI_STRINGS.cards.unpinButton : VI_STRINGS.cards.pinButton
                      }
                      onPress={() => togglePin(item.id)}
                      style={[
                        styles.actionPill,
                        {
                          borderColor: item.pinned ? theme.colors.primary : theme.colors.border,
                          backgroundColor: item.pinned
                            ? highContrast
                              ? theme.colors.surface
                              : '#EEF2FF'
                            : theme.colors.bg,
                        },
                      ]}
                    >
                      <Ionicons
                        name={item.pinned ? 'bookmark' : 'bookmark-outline'}
                        size={15}
                        color={item.pinned ? theme.colors.primary : theme.colors.text}
                      />
                      <AppText
                        variant="label"
                        bold
                        color={item.pinned ? theme.colors.primary : theme.colors.text}
                      >
                        {item.pinned ? VI_STRINGS.cards.unpinButton : VI_STRINGS.cards.pinButton}
                      </AppText>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={VI_STRINGS.cards.editButton}
                      onPress={() => openEdit(item.id, item.content, item.topic)}
                      style={[
                        styles.actionPill,
                        { borderColor: theme.colors.border, backgroundColor: theme.colors.bg },
                      ]}
                    >
                      <Ionicons name="create-outline" size={15} color={theme.colors.text} />
                      <AppText variant="label" bold>
                        {VI_STRINGS.cards.editButton}
                      </AppText>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={VI_STRINGS.cards.deleteButton}
                      onPress={() => deleteCard(item.id)}
                      style={[
                        styles.actionPill,
                        { borderColor: theme.colors.danger, backgroundColor: theme.colors.bg },
                      ]}
                    >
                      <Ionicons name="trash-outline" size={15} color={theme.colors.danger} />
                      <AppText variant="label" bold color={theme.colors.danger}>
                        {VI_STRINGS.cards.deleteButton}
                      </AppText>
                    </Pressable>
                  </View>
                ) : null}
              </Pressable>
            );
          }}
        />
      </View>

      {/* Sheet Sửa / Tạo thẻ */}
      <Modal
        visible={editorOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setEditorOpen(false)}
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
            <AppText variant="title" bold>
              {editingId ? VI_STRINGS.cards.editButton : VI_STRINGS.cards.createButton}
            </AppText>

            <TextInput
              allowFontScaling={false}
              maxLength={140}
              multiline
              value={draftContent}
              onChangeText={setDraftContent}
              placeholder={VI_STRINGS.cards.contentPlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              style={[
                styles.editorInput,
                {
                  fontSize: theme.fonts.body,
                  color: theme.colors.text,
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderRadius: 14,
                },
              ]}
            />

            <AppText variant="label" bold color={theme.colors.textMuted}>
              {VI_STRINGS.cards.topicLabel}
            </AppText>

            <View style={styles.topicSelectRow}>
              {VI_STRINGS.cards.topics.map((topic) => {
                const active = draftTopic === topic;
                return (
                  <Pressable
                    key={topic}
                    accessibilityRole="button"
                    accessibilityLabel={topic}
                    onPress={() => setDraftTopic(topic)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                        borderColor: active ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                  >
                    <AppText
                      variant="label"
                      bold
                      color={active ? theme.colors.onPrimary : theme.colors.text}
                    >
                      {topic}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.cards.previewSpeak}
              onPress={() => speakVietnamese(draftContent, { rate: speechRate })}
              style={[
                styles.previewBtn,
                {
                  borderColor: theme.colors.border,
                  borderRadius: 14,
                  backgroundColor: theme.colors.surface,
                },
              ]}
            >
              <Ionicons name="volume-high-outline" size={18} color={theme.colors.primary} />
              <AppText variant="body" bold color={theme.colors.primary}>
                {VI_STRINGS.cards.previewSpeak}
              </AppText>
            </Pressable>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={VI_STRINGS.communicate.closeButton}
                onPress={() => setEditorOpen(false)}
                style={[
                  styles.sheetActionBtn,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    borderWidth: 1,
                  },
                ]}
              >
                <AppText variant="body" bold>
                  {VI_STRINGS.communicate.closeButton}
                </AppText>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={VI_STRINGS.cards.saveButton}
                onPress={handleSave}
                style={[
                  styles.sheetActionBtn,
                  {
                    backgroundColor: theme.colors.primary,
                  },
                ]}
              >
                <AppText variant="body" bold color={theme.colors.onPrimary}>
                  {VI_STRINGS.cards.saveButton}
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1 },
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
  filterScroll: {
    maxHeight: 44,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  undoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  cardTile: {
    borderWidth: 1,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
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
    gap: 6,
  },
  topicBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  speakIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContentText: {
    lineHeight: 28,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    minHeight: 380,
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
  editorInput: {
    borderWidth: 1,
    padding: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  topicSelectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderWidth: 1,
  },
  sheetActionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 14,
  },
});
