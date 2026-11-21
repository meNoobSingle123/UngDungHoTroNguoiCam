import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCardsStore } from '../../src/core/db/cardsStorage.ts';
import { VI_STRINGS } from '../../src/core/i18n/vi.ts';
import { useSystemStore } from '../../src/core/store/systemStatus.ts';
import { AppText, useAppTheme } from '../../src/core/theme/ThemeProvider.tsx';
import { TopBar } from '../../src/core/theme/TopBar.tsx';
import { speakVietnamese } from '../../src/core/tts/speechService.ts';
import { CameraModal } from '../../src/features/camera/CameraModal.tsx';

export default function CommunicateTab(): React.ReactElement {
  useKeepAwake();
  const theme = useAppTheme();
  const highContrast = theme.isHighContrast;
  const history = useSystemStore((s) => s.history);
  const speechRate = useSystemStore((s) => s.speechRate);
  const isFlipped180 = useSystemStore((s) => s.isFlipped180);
  const toggleFlip180 = useSystemStore((s) => s.toggleFlip180);
  const addHistoryEntry = useSystemStore((s) => s.addHistoryEntry);
  const clearHistory = useSystemStore((s) => s.clearHistory);
  const setStatusLight = useSystemStore((s) => s.setStatusLight);

  const pinnedCards = useCardsStore((s) => s.pinnedCards);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [typeSheetOpen, setTypeSheetOpen] = useState(false);
  const [otherSheetOpen, setOtherSheetOpen] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [otherText, setOtherText] = useState('');

  const recentEntries = history.slice(-3);
  const latestMe = [...history].reverse().find((h) => h.speaker === 'me');

  const quickReplies = useMemo(
    () => [...VI_STRINGS.communicate.quickReplies, ...pinnedCards.map((c) => c.content)],
    [pinnedCards]
  );

  const speakAndRecord = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    addHistoryEntry('me', trimmed);
    speakVietnamese(trimmed, {
      rate: speechRate,
      onError: () => setStatusLight('attention'),
    });
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: highContrast ? theme.colors.bg : '#F8FAFC' }]}>
      <TopBar title={VI_STRINGS.tabs.communicate} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Thẻ Hội thoại Tương tác (Dialogue Card) */}
        <View
          style={[
            styles.conversationCard,
            {
              backgroundColor: highContrast ? theme.colors.surface : '#FFFFFF',
              borderColor: highContrast ? theme.colors.border : 'rgba(226, 232, 240, 0.7)',
            },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.headerTitleLeft}>
              <Ionicons name="chatbubbles-outline" size={16} color={theme.colors.primary} />
              <AppText variant="caption" weight="600" color={theme.colors.textMuted}>
                HỘI THOẠI TRỰC TIẾP
              </AppText>
            </View>
            {isFlipped180 ? (
              <View style={styles.flipBadge}>
                <Ionicons name="sync" size={11} color={theme.colors.primary} />
                <AppText variant="caption" weight="600" color={theme.colors.primary}>
                  Đang lật 180°
                </AppText>
              </View>
            ) : null}
          </View>

          <View style={styles.dialogueBody}>
            {recentEntries.length === 0 ? (
              <View style={styles.emptyDialogue}>
                <View
                  style={[
                    styles.emptyIconCircle,
                    { backgroundColor: highContrast ? theme.colors.surface : '#EFF6FF' },
                  ]}
                >
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={24}
                    color={theme.colors.primary}
                  />
                </View>
                <AppText
                  variant="caption"
                  weight="500"
                  color={theme.colors.textMuted}
                  style={styles.emptyText}
                >
                  {VI_STRINGS.communicate.emptyHistory}
                </AppText>
              </View>
            ) : (
              recentEntries.map((item, idx) => {
                const isNewest = idx === recentEntries.length - 1;
                const isMe = item.speaker === 'me';
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.bubbleRow,
                      isMe ? styles.bubbleRowMe : styles.bubbleRowOther,
                      isFlipped180 ? { transform: [{ rotate: '180deg' }] } : undefined,
                    ]}
                  >
                    <View
                      style={[
                        styles.bubble,
                        {
                          backgroundColor: isMe
                            ? highContrast
                              ? theme.colors.surface
                              : '#EEF2FF'
                            : highContrast
                              ? theme.colors.surface
                              : '#F1F5F9',
                          borderColor: isMe ? theme.colors.primary : 'transparent',
                        },
                      ]}
                    >
                      <View style={styles.speakerTag}>
                        <AppText
                          variant="caption"
                          weight="600"
                          color={isMe ? theme.colors.primary : theme.colors.textMuted}
                        >
                          {isMe ? 'Tôi' : 'Người đối diện'}
                        </AppText>
                      </View>
                      <AppText
                        variant={isNewest ? 'subhead' : 'body'}
                        weight={isNewest ? '600' : '500'}
                        color={isMe ? theme.colors.text : theme.colors.primary}
                      >
                        {item.text}
                      </AppText>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* Thanh công cụ hội thoại */}
          <View style={[styles.dialogueToolbar, { borderTopColor: highContrast ? theme.colors.border : '#F1F5F9' }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.communicate.flip180}
              onPress={toggleFlip180}
              style={({ pressed }) => [
                styles.toolPill,
                {
                  backgroundColor: isFlipped180
                    ? highContrast
                      ? theme.colors.surface
                      : '#EEF2FF'
                    : highContrast
                      ? theme.colors.surface
                      : '#F8FAFC',
                  borderColor: isFlipped180 ? theme.colors.primary : 'transparent',
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Ionicons
                name="sync-outline"
                size={14}
                color={isFlipped180 ? theme.colors.primary : theme.colors.text}
              />
              <AppText
                variant="caption"
                weight="600"
                color={isFlipped180 ? theme.colors.primary : theme.colors.text}
              >
                {VI_STRINGS.communicate.flip180}
              </AppText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.communicate.replay}
              disabled={!latestMe}
              onPress={() => latestMe && speakVietnamese(latestMe.text, { rate: speechRate })}
              style={({ pressed }) => [
                styles.toolPill,
                {
                  backgroundColor: highContrast ? theme.colors.surface : '#F8FAFC',
                  opacity: !latestMe ? 0.35 : pressed ? 0.8 : 1,
                },
              ]}
            >
              <Ionicons name="volume-medium-outline" size={14} color={theme.colors.text} />
              <AppText variant="caption" weight="600">
                {VI_STRINGS.communicate.replay}
              </AppText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.communicate.clear}
              onPress={clearHistory}
              style={({ pressed }) => [
                styles.toolPill,
                {
                  backgroundColor: highContrast ? theme.colors.surface : '#F8FAFC',
                  opacity: recentEntries.length === 0 ? 0.35 : pressed ? 0.8 : 1,
                },
              ]}
            >
              <Ionicons name="trash-outline" size={14} color={theme.colors.danger} />
              <AppText variant="caption" weight="600" color={theme.colors.danger}>
                {VI_STRINGS.communicate.clear}
              </AppText>
            </Pressable>
          </View>
        </View>

        {/* Section: Phản hồi nhanh */}
        <View style={styles.sectionWrapper}>
          <AppText variant="caption" weight="600" color={theme.colors.textMuted} style={styles.sectionLabel}>
            CÂU PHẢN HỒI NHANH
          </AppText>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickChipsScroll}
          >
            {quickReplies.map((phrase, idx) => (
              <Pressable
                key={`${phrase}-${idx}`}
                accessibilityRole="button"
                accessibilityLabel={phrase}
                onPress={() => speakAndRecord(phrase)}
                style={({ pressed }) => [
                  styles.quickPill,
                  {
                    backgroundColor: highContrast ? theme.colors.surface : '#FFFFFF',
                    borderColor: highContrast ? theme.colors.border : 'rgba(226, 232, 240, 0.8)',
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                  <Ionicons name="flash" size={12} color={theme.colors.primary} />
                  <AppText variant="caption" weight="600" color={theme.colors.text}>
                    {phrase}
                  </AppText>
                </Pressable>
              )
            )}
          </ScrollView>
        </View>

        {/* Section: Chọn cách giao tiếp */}
        <View style={styles.sectionWrapper}>
          <AppText variant="caption" weight="600" color={theme.colors.textMuted} style={styles.sectionLabel}>
            CÁCH GIAO TIẾP
          </AppText>

          {/* Hero Card: Cử chỉ của tôi */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={VI_STRINGS.communicate.actions.mySign}
            testID="open-camera-btn"
            onPress={() => setCameraOpen(true)}
            style={({ pressed }) => [
              styles.heroCard,
              {
                backgroundColor: theme.colors.primary,
                opacity: pressed ? 0.92 : 1,
              },
            ]}
          >
            <View style={styles.heroLeft}>
              <View style={styles.heroIconBadge}>
                <Ionicons
                  name="hand-right"
                  size={24}
                  color={theme.colors.onPrimary}
                />
              </View>
              <View style={styles.heroTextCol}>
                <AppText variant="subhead" weight="700" color={theme.colors.onPrimary}>
                  {VI_STRINGS.communicate.actions.mySign}
                </AppText>
                <AppText
                  variant="caption"
                  weight="400"
                  color={highContrast ? theme.colors.onPrimary : 'rgba(255,255,255,0.85)'}
                >
                  Mở camera nhận diện ký hiệu
                </AppText>
              </View>
            </View>
            <View style={styles.heroChevronCircle}>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.onPrimary} />
            </View>
          </Pressable>

          {/* 2 Companion Action Tiles */}
          <View style={styles.twoActionRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.communicate.actions.typeText}
              testID="open-type-sheet-btn"
              onPress={() => setTypeSheetOpen(true)}
              style={({ pressed }) => [
                styles.actionTile,
                {
                  backgroundColor: highContrast ? theme.colors.surface : '#FFFFFF',
                  borderColor: highContrast ? theme.colors.border : 'rgba(226, 232, 240, 0.8)',
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.tileIconCircle,
                  { backgroundColor: highContrast ? theme.colors.bg : '#EEF2FF' },
                ]}
              >
                <Ionicons name="keypad" size={20} color={theme.colors.primary} />
              </View>
              <AppText variant="subhead" weight="600" style={styles.centerText}>
                {VI_STRINGS.communicate.actions.typeText}
              </AppText>
              <AppText variant="caption" weight="400" color={theme.colors.textMuted} style={styles.centerText}>
                Gõ chữ phát giọng
              </AppText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.communicate.actions.otherSpeaks}
              testID="open-other-sheet-btn"
              onPress={() => setOtherSheetOpen(true)}
              style={({ pressed }) => [
                styles.actionTile,
                {
                  backgroundColor: highContrast ? theme.colors.surface : '#FFFFFF',
                  borderColor: highContrast ? theme.colors.border : 'rgba(226, 232, 240, 0.8)',
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.tileIconCircle,
                  { backgroundColor: highContrast ? theme.colors.bg : '#FEF3C7' },
                ]}
              >
                <Ionicons name="mic" size={20} color={theme.colors.warning} />
              </View>
              <AppText variant="subhead" weight="600" style={styles.centerText}>
                {VI_STRINGS.communicate.actions.otherSpeaks}
              </AppText>
              <AppText variant="caption" weight="400" color={theme.colors.textMuted} style={styles.centerText}>
                Người đối diện nói
              </AppText>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {cameraOpen ? (
        <CameraModal visible={cameraOpen} onClose={() => setCameraOpen(false)} />
      ) : null}

      {/* Sheet Gõ phím */}
      {typeSheetOpen && (
        <Modal
          visible={typeSheetOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setTypeSheetOpen(false)}
        >
        <View style={styles.sheetBackdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={VI_STRINGS.communicate.closeButton}
            style={StyleSheet.absoluteFill}
            onPress={() => setTypeSheetOpen(false)}
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
              {VI_STRINGS.communicate.typeSheetTitle}
            </AppText>
            <TextInput
              allowFontScaling={false}
              maxLength={200}
              multiline
              value={typedText}
              onChangeText={setTypedText}
              placeholder={VI_STRINGS.communicate.typePlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              style={[
                styles.input,
                {
                  fontSize: theme.fonts.body,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                  borderRadius: 16,
                },
              ]}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={VI_STRINGS.communicate.closeButton}
                onPress={() => setTypeSheetOpen(false)}
                style={[
                  styles.sheetBtn,
                  {
                    flex: 1,
                    minHeight: 48,
                    borderRadius: 16,
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
                accessibilityLabel={VI_STRINGS.communicate.speakButton}
                onPress={() => {
                  speakAndRecord(typedText);
                  setTypedText('');
                  setTypeSheetOpen(false);
                }}
                style={[
                  styles.sheetBtn,
                  {
                    flex: 1,
                    minHeight: 48,
                    borderRadius: 16,
                    backgroundColor: theme.colors.primary,
                  },
                ]}
              >
                <Ionicons name="volume-high" size={18} color={theme.colors.onPrimary} />
                <AppText variant="body" weight="600" color={theme.colors.onPrimary}>
                  {VI_STRINGS.communicate.speakButton}
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      )}

      {/* Sheet Người kia nói */}
      {otherSheetOpen && (
        <Modal
          visible={otherSheetOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setOtherSheetOpen(false)}
        >
        <View style={styles.sheetBackdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={VI_STRINGS.communicate.closeButton}
            style={StyleSheet.absoluteFill}
            onPress={() => setOtherSheetOpen(false)}
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
              {VI_STRINGS.communicate.otherSpeakTitle}
            </AppText>
            <AppText variant="caption" color={theme.colors.textMuted}>
              {VI_STRINGS.communicate.noisyPlaceHint}
            </AppText>
            <AppText variant="caption" weight="600" color={theme.colors.warning}>
              {VI_STRINGS.communicate.otherSpeakOfflineHint}
            </AppText>
            <TextInput
              allowFontScaling={false}
              maxLength={200}
              multiline
              value={otherText}
              onChangeText={setOtherText}
              placeholder={VI_STRINGS.communicate.otherReplyPlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              style={[
                styles.input,
                {
                  fontSize: theme.fonts.body,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                  borderRadius: 16,
                },
              ]}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={VI_STRINGS.communicate.closeButton}
                onPress={() => setOtherSheetOpen(false)}
                style={[
                  styles.sheetBtn,
                  {
                    flex: 1,
                    minHeight: 48,
                    borderRadius: 16,
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
                accessibilityLabel={VI_STRINGS.communicate.otherReplySubmit}
                onPress={() => {
                  if (otherText.trim()) {
                    addHistoryEntry('other', otherText.trim());
                    setOtherText('');
                  }
                  setOtherSheetOpen(false);
                }}
                style={[
                  styles.sheetBtn,
                  {
                    flex: 1,
                    minHeight: 48,
                    borderRadius: 16,
                    backgroundColor: theme.colors.primary,
                  },
                ]}
              >
                <AppText variant="body" weight="600" color={theme.colors.onPrimary}>
                  {VI_STRINGS.communicate.otherReplySubmit}
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
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 96,
  },
  conversationCard: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  headerTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  dialogueBody: {
    minHeight: 120,
    maxHeight: 200,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  emptyDialogue: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 18,
  },
  bubbleRow: {
    width: '100%',
    marginVertical: 3,
  },
  bubbleRowMe: {
    alignItems: 'flex-start',
  },
  bubbleRowOther: {
    alignItems: 'flex-start',
  },
  bubble: {
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 2,
    maxWidth: '92%',
  },
  speakerTag: {
    marginBottom: 1,
  },
  dialogueToolbar: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    backgroundColor: 'rgba(248, 250, 252, 0.7)',
  },
  toolPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sectionWrapper: {
    gap: 6,
  },
  sectionLabel: {
    paddingHorizontal: 4,
    letterSpacing: 0.6,
  },
  quickChipsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  quickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  heroCard: {
    height: 72,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 4,
  },
  heroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextCol: {
    gap: 1,
  },
  heroChevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  twoActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  actionTile: {
    flex: 1,
    height: 104,
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  tileIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  centerText: {
    textAlign: 'center',
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  sheet: {
    minHeight: 320,
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
  input: {
    borderWidth: 1,
    padding: 14,
    minHeight: 110,
    textAlignVertical: 'top',
  },
  sheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
