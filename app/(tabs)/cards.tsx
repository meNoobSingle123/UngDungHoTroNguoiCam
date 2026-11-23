import React, { useCallback, useMemo, useState } from 'react';
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
import {
  hapticLight,
  hapticSuccess,
  hapticWarning,
} from '../../src/core/haptics/hapticFeedback.ts';
import { VI_STRINGS } from '../../src/core/i18n/vi.ts';
import { useSystemStore } from '../../src/core/store/systemStatus.ts';
import { AppText, useAppTheme } from '../../src/core/theme/ThemeProvider.tsx';
import { TopBar } from '../../src/core/theme/TopBar.tsx';
import { speakVietnamese } from '../../src/core/tts/speechService.ts';
import type { CardFilterScope } from '../../src/features/cards/cardStore.ts';

export default function CardsTab(): React.ReactElement {
  const theme = useAppTheme();
  const highContrast = theme.isHighContrast;
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

  const [presentingCard, setPresentingCard] = useState<(typeof visibleCards)[number] | null>(null);
  const [isPresenterFlipped180, setIsPresenterFlipped180] = useState(false);

  const visibleCards = useMemo(
    () => listCards({ scope, topic: selectedTopic, query }),
    [listCards, scope, selectedTopic, query, revision]
  );
  const showUndo = undoUntil !== null && Date.now() <= undoUntil;

  const openCreate = () => {
    hapticLight();
    setEditingId(null);
    setDraftContent('');
    setDraftTopic(VI_STRINGS.cards.topics[0]);
    setEditorOpen(true);
  };

  const openEdit = (id: string, content: string, topic?: string) => {
    hapticLight();
    setEditingId(id);
    setDraftContent(content);
    setDraftTopic(topic ?? VI_STRINGS.cards.topics[0]);
    setEditorOpen(true);
  };

  const handleSave = () => {
    hapticSuccess();
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

  const renderCardItem = useCallback(
    ({ item }: { item: (typeof visibleCards)[number] }) => {
      const topicColors = getTopicColor(item.topic);
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={item.content}
          testID={`card-item-${item.id}`}
          onPress={() => {
            hapticLight();
            setIsPresenterFlipped180(false);
            setPresentingCard(item);
          }}
          style={({ pressed }) => [
            styles.cardTile,
            {
              backgroundColor: highContrast ? theme.colors.surface : '#FFFFFF',
              borderColor: item.pinned
                ? theme.colors.primary
                : highContrast
                  ? theme.colors.border
                  : 'rgba(226, 232, 240, 0.7)',
              opacity: pressed ? 0.92 : 1,
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
                  <AppText variant="caption" weight="600" color={topicColors.text}>
                    {item.topic}
                  </AppText>
                </View>
              ) : null}
              {item.isDefault ? (
                <AppText variant="caption" color={theme.colors.textMuted}>
                  · {VI_STRINGS.cards.defaultTag}
                </AppText>
              ) : null}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.cards.previewSpeak}
              onPress={(e) => {
                e.stopPropagation();
                hapticLight();
                speakVietnamese(item.content, { rate: speechRate });
              }}
              style={[
                styles.speakIconCircle,
                { backgroundColor: highContrast ? theme.colors.bg : '#EEF2FF' },
              ]}
            >
              <Ionicons
                name="volume-medium"
                size={16}
                color={theme.colors.primary}
              />
            </Pressable>
          </View>

          <AppText variant="subhead" weight="600" style={styles.cardContentText}>
            {item.content}
          </AppText>

          {!item.isDefault ? (
            <View style={[styles.cardActionsRow, { borderTopColor: highContrast ? theme.colors.border : '#F1F5F9' }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  item.pinned ? VI_STRINGS.cards.unpinButton : VI_STRINGS.cards.pinButton
                }
                onPress={() => {
                  hapticLight();
                  togglePin(item.id);
                }}
                style={[
                  styles.actionPill,
                  {
                    borderColor: item.pinned ? theme.colors.primary : 'transparent',
                    backgroundColor: item.pinned
                      ? highContrast
                        ? theme.colors.surface
                        : '#EEF2FF'
                      : highContrast
                        ? theme.colors.surface
                        : '#F8FAFC',
                  },
                ]}
              >
                <Ionicons
                  name={item.pinned ? 'bookmark' : 'bookmark-outline'}
                  size={13}
                  color={item.pinned ? theme.colors.primary : theme.colors.textMuted}
                />
                <AppText
                  variant="caption"
                  weight="600"
                  color={item.pinned ? theme.colors.primary : theme.colors.textMuted}
                >
                  {item.pinned ? VI_STRINGS.cards.unpinButton : VI_STRINGS.cards.pinButton}
                </AppText>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={VI_STRINGS.cards.editButton}
                onPress={() => {
                  hapticLight();
                  openEdit(item.id, item.content, item.topic);
                }}
                style={[
                  styles.actionPill,
                  {
                    backgroundColor: highContrast ? theme.colors.surface : '#F8FAFC',
                    borderColor: 'transparent',
                  },
                ]}
              >
                <Ionicons name="create-outline" size={13} color={theme.colors.textMuted} />
                <AppText variant="caption" weight="600" color={theme.colors.textMuted}>
                  {VI_STRINGS.cards.editButton}
                </AppText>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={VI_STRINGS.cards.deleteButton}
                onPress={() => {
                  hapticWarning();
                  deleteCard(item.id);
                }}
                style={[
                  styles.actionPill,
                  {
                    backgroundColor: highContrast ? theme.colors.surface : '#F8FAFC',
                    borderColor: 'transparent',
                  },
                ]}
              >
                <Ionicons name="trash-outline" size={13} color={theme.colors.danger} />
                <AppText variant="caption" weight="600" color={theme.colors.danger}>
                  {VI_STRINGS.cards.deleteButton}
                </AppText>
              </Pressable>
            </View>
          ) : null}
        </Pressable>
      );
    },
    [highContrast, theme, speechRate, togglePin, openEdit, deleteCard]
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: highContrast ? theme.colors.bg : '#F8FAFC' }]}>
      <TopBar title={VI_STRINGS.tabs.cards} />

      <View style={styles.body}>
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
            placeholder={VI_STRINGS.cards.searchPlaceholder}
            placeholderTextColor={theme.colors.textMuted}
            style={[
              styles.searchInput,
              {
                fontSize: 14,
                color: theme.colors.text,
              },
            ]}
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {/* Hàng bộ lọc danh mục capsule */}
        <View style={styles.filterWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
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
                          : 'rgba(226, 232, 240, 0.8)',
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

            {VI_STRINGS.cards.topics.map((topic) => {
              const active = selectedTopic === topic;
              return (
                <Pressable
                  key={topic}
                  accessibilityRole="button"
                  accessibilityLabel={topic}
                  onPress={() => setSelectedTopic(active ? undefined : topic)}
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
                          : 'rgba(226, 232, 240, 0.8)',
                    },
                  ]}
                >
                  <AppText
                    variant="caption"
                    weight="600"
                    color={active ? theme.colors.onPrimary : theme.colors.text}
                  >
                    {topic}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {lastError ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={lastError}
            onPress={clearError}
            style={styles.errorBanner}
          >
            <Ionicons name="alert-circle-outline" size={16} color={theme.colors.danger} />
            <AppText variant="caption" weight="600" color={theme.colors.danger}>
              {lastError}
            </AppText>
          </Pressable>
        ) : null}

        {/* Banner Hoàn tác nổi */}
        {showUndo ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={VI_STRINGS.cards.deletedUndo}
            onPress={() => {
              hapticSuccess();
              undoDelete();
            }}
            style={[
              styles.undoBar,
              {
                backgroundColor: theme.colors.primary,
              },
            ]}
          >
            <Ionicons name="arrow-undo-outline" size={18} color={theme.colors.onPrimary} />
            <AppText variant="subhead" weight="600" color={theme.colors.onPrimary}>
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
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Ionicons name="add" size={20} color={theme.colors.onPrimary} />
          <AppText variant="subhead" weight="600" color={theme.colors.onPrimary}>
            {VI_STRINGS.cards.createButton}
          </AppText>
        </Pressable>

        {/* Danh sách thẻ giao tiếp Soft Card Tiles */}
        <FlatList
          data={visibleCards}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews={true}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="albums-outline" size={32} color={theme.colors.textMuted} />
              </View>
              <AppText variant="caption" weight="500" color={theme.colors.textMuted}>
                {VI_STRINGS.cards.emptyState}
              </AppText>
            </View>
          }
          contentContainerStyle={styles.listContent}
          renderItem={renderCardItem}
        />
      </View>

      {/* Sheet Sửa / Tạo thẻ */}
      {editorOpen && (
        <Modal
          visible={editorOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setEditorOpen(false)}
        >
        <View style={styles.sheetBackdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={VI_STRINGS.communicate.closeButton}
            style={StyleSheet.absoluteFill}
            onPress={() => setEditorOpen(false)}
          />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: theme.colors.bg,
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                padding: theme.spacing.lg,
                gap: 12,
              },
            ]}
          >
            <View style={styles.sheetHandleBar} />
            <AppText variant="title" weight="700">
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
                  borderRadius: 16,
                },
              ]}
            />

            <AppText variant="caption" weight="600" color={theme.colors.textMuted}>
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
                      styles.filterPill,
                      {
                        backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                        borderColor: active ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                  >
                    <AppText
                      variant="caption"
                      weight="600"
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
                  borderRadius: 16,
                  backgroundColor: theme.colors.surface,
                },
              ]}
            >
              <Ionicons name="volume-high" size={18} color={theme.colors.primary} />
              <AppText variant="subhead" weight="600" color={theme.colors.primary}>
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
                <AppText variant="body" weight="600">
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
                <AppText variant="body" weight="600" color={theme.colors.onPrimary}>
                  {VI_STRINGS.cards.saveButton}
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      )}

      {/* Modal Trình Chiếu Thẻ Toàn Màn Hình (Chữ lớn cho người đối diện đọc) */}
      {presentingCard && (
        <Modal
          visible={!!presentingCard}
          transparent
          animationType="fade"
          onRequestClose={() => {
            hapticLight();
            setPresentingCard(null);
          }}
        >
          <View style={styles.presenterBackdrop}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.communicate.closeButton}
              style={StyleSheet.absoluteFill}
              onPress={() => {
                hapticLight();
                setPresentingCard(null);
              }}
            />
            <View
              style={[
                styles.presenterCard,
                {
                  backgroundColor: highContrast ? theme.colors.surface : '#FFFFFF',
                  borderColor: highContrast ? theme.colors.border : '#E2E8F0',
                },
              ]}
            >
              <View style={styles.presenterHeader}>
                {presentingCard.topic ? (
                  <View
                    style={[
                      styles.topicBadge,
                      { backgroundColor: getTopicColor(presentingCard.topic).bg },
                    ]}
                  >
                    <AppText
                      variant="subhead"
                      weight="700"
                      color={getTopicColor(presentingCard.topic).text}
                    >
                      {presentingCard.topic}
                    </AppText>
                  </View>
                ) : (
                  <View />
                )}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={VI_STRINGS.communicate.closeButton}
                  testID="presenter-close-btn"
                  onPress={() => {
                    hapticLight();
                    setPresentingCard(null);
                  }}
                  style={styles.presenterCloseBtn}
                >
                  <Ionicons name="close" size={24} color={theme.colors.textMuted} />
                </Pressable>
              </View>

              <View
                style={[
                  styles.presenterBody,
                  isPresenterFlipped180 && styles.presenterFlipped,
                ]}
              >
                <AppText
                  testID="presenter-text"
                  variant="display"
                  weight="700"
                  style={[styles.presenterText, { color: theme.colors.text }]}
                >
                  {presentingCard.content}
                </AppText>
              </View>

              <View style={styles.presenterActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Đọc câu này"
                  testID="presenter-speak-btn"
                  onPress={() => {
                    hapticLight();
                    speakVietnamese(presentingCard.content, { rate: speechRate });
                  }}
                  style={[
                    styles.presenterActionBtn,
                    {
                      backgroundColor: theme.colors.primary,
                    },
                  ]}
                >
                  <Ionicons name="volume-high" size={20} color={theme.colors.onPrimary} />
                  <AppText variant="subhead" weight="700" color={theme.colors.onPrimary}>
                    Đọc câu này
                  </AppText>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Lật 180°"
                  testID="presenter-flip-btn"
                  onPress={() => {
                    hapticLight();
                    setIsPresenterFlipped180((prev) => !prev);
                  }}
                  style={[
                    styles.presenterActionBtn,
                    {
                      backgroundColor: highContrast ? theme.colors.bg : '#F1F5F9',
                      borderColor: theme.colors.border,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Ionicons name="sync-outline" size={18} color={theme.colors.text} />
                  <AppText variant="subhead" weight="600" color={theme.colors.text}>
                    {isPresenterFlipped180 ? 'Lật về' : 'Lật 180°'}
                  </AppText>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    height: 44,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
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
    height: 44,
    borderRadius: 14,
    paddingHorizontal: 16,
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 18,
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  listContent: {
    gap: 10,
    paddingBottom: 96,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTile: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
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
    borderRadius: 8,
  },
  speakIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContentText: {
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  sheet: {
    minHeight: 380,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 24,
  },
  sheetHandleBar: {
    width: 36,
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
    height: 46,
    borderWidth: 1,
  },
  sheetActionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 16,
  },
  presenterBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  presenterCard: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 28,
    elevation: 24,
  },
  presenterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  presenterCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
  },
  presenterBody: {
    minHeight: 180,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  presenterFlipped: {
    transform: [{ rotate: '180deg' }],
  },
  presenterText: {
    fontSize: 34,
    lineHeight: 46,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  presenterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  presenterActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
  },
});
