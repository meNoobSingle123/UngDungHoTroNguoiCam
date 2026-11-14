import React, { useState } from 'react';
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
  const highContrast = useSystemStore((s) => s.highContrast);
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
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: theme.colors.bg }]}>
      <TopBar title={VI_STRINGS.tabs.communicate} />

      <View style={[styles.body, { padding: theme.spacing.md, gap: theme.spacing.sm }]}>
        {/* Khung Hội thoại Tương tác */}
        <View
          style={[
            styles.conversationFrame,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: 16,
            },
          ]}
        >
          <ScrollView
            contentContainerStyle={styles.conversationScroll}
            showsVerticalScrollIndicator={false}
          >
            {recentEntries.length === 0 ? (
              <View style={styles.emptyState}>
                <View
                  style={[
                    styles.emptyIconCircle,
                    { backgroundColor: highContrast ? theme.colors.surface : '#E0E7FF' },
                  ]}
                >
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={28}
                    color={theme.colors.primary}
                  />
                </View>
                <AppText
                  variant="body"
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
                      styles.bubbleWrapper,
                      isMe ? styles.bubbleMeWrapper : styles.bubbleOtherWrapper,
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
                              : '#FFFFFF',
                          borderColor: isMe ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                    >
                      <View style={styles.speakerRow}>
                        <Ionicons
                          name={isMe ? 'person-circle-outline' : 'chatbubble-outline'}
                          size={14}
                          color={isMe ? theme.colors.primary : theme.colors.textMuted}
                        />
                        <AppText
                          variant="label"
                          bold
                          color={isMe ? theme.colors.primary : theme.colors.textMuted}
                        >
                          {isMe ? 'Tôi' : 'Người đối diện'}
                        </AppText>
                      </View>
                      <AppText
                        variant={isNewest ? 'conversation' : 'title'}
                        bold={isNewest}
                        color={isMe ? theme.colors.text : theme.colors.primary}
                      >
                        {item.text}
                      </AppText>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Thanh công cụ hội thoại nhanh */}
          <View style={[styles.frameActions, { borderTopColor: theme.colors.border }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.communicate.flip180}
              onPress={toggleFlip180}
              style={({ pressed }) => [
                styles.smallAction,
                {
                  borderRadius: 12,
                  borderColor: isFlipped180 ? theme.colors.primary : theme.colors.border,
                  backgroundColor: isFlipped180
                    ? highContrast
                      ? theme.colors.surface
                      : '#EEF2FF'
                    : theme.colors.bg,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Ionicons
                name="sync-outline"
                size={16}
                color={isFlipped180 ? theme.colors.primary : theme.colors.text}
              />
              <AppText
                variant="label"
                bold
                color={isFlipped180 ? theme.colors.primary : theme.colors.text}
                numberOfLines={1}
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
                styles.smallAction,
                {
                  borderRadius: 12,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.bg,
                  opacity: !latestMe ? 0.4 : pressed ? 0.75 : 1,
                },
              ]}
            >
              <Ionicons name="volume-medium-outline" size={16} color={theme.colors.text} />
              <AppText variant="label" bold numberOfLines={1}>
                {VI_STRINGS.communicate.replay}
              </AppText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.communicate.clear}
              onPress={clearHistory}
              style={({ pressed }) => [
                styles.smallAction,
                {
                  borderRadius: 12,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.bg,
                  opacity: recentEntries.length === 0 ? 0.4 : pressed ? 0.75 : 1,
                },
              ]}
            >
              <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
              <AppText variant="label" bold color={theme.colors.danger} numberOfLines={1}>
                {VI_STRINGS.communicate.clear}
              </AppText>
            </Pressable>
          </View>
        </View>

        {/* Dãy chip phản hồi nhanh */}
        <View style={styles.quickReplyContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickReplyScroll}
          >
            {[...VI_STRINGS.communicate.quickReplies, ...pinnedCards.map((c) => c.content)].map(
              (phrase, idx) => (
                <Pressable
                  key={`${phrase}-${idx}`}
                  accessibilityRole="button"
                  accessibilityLabel={phrase}
                  onPress={() => speakAndRecord(phrase)}
                  style={({ pressed }) => [
                    styles.quickChip,
                    {
                      minHeight: 48,
                      borderRadius: 24,
                      backgroundColor: highContrast ? theme.colors.surface : '#FFFFFF',
                      borderColor: theme.colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Ionicons name="flash-outline" size={15} color={theme.colors.primary} />
                  <AppText variant="body" bold numberOfLines={1}>
                    {phrase}
                  </AppText>
                </Pressable>
              )
            )}
          </ScrollView>
        </View>

        {/* Cụm 3 nút hành động chính */}
        <View style={[styles.bigActionsCol, { gap: 10 }]}>
          {/* Nút Hero: Cử chỉ của tôi */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={VI_STRINGS.communicate.actions.mySign}
            testID="open-camera-btn"
            onPress={() => setCameraOpen(true)}
            style={({ pressed }) => [
              styles.heroAction,
              {
                borderRadius: 18,
                backgroundColor: theme.colors.primary,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View style={styles.heroLeft}>
              <View
                style={[
                  styles.heroIconCircle,
                  { backgroundColor: highContrast ? '#000000' : 'rgba(255,255,255,0.2)' },
                ]}
              >
                <Ionicons
                  name="hand-right-outline"
                  size={26}
                  color={theme.colors.onPrimary}
                />
              </View>
              <View style={styles.heroTextCol}>
                <AppText variant="title" bold color={theme.colors.onPrimary}>
                  {VI_STRINGS.communicate.actions.mySign}
                </AppText>
                <AppText
                  variant="label"
                  color={highContrast ? theme.colors.onPrimary : 'rgba(255,255,255,0.85)'}
                >
                  Mở camera nhận diện ký hiệu
                </AppText>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={22} color={theme.colors.onPrimary} />
          </Pressable>

          {/* 2 nút phụ cột đôi */}
          <View style={styles.twoCols}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.communicate.actions.typeText}
              testID="open-type-sheet-btn"
              onPress={() => setTypeSheetOpen(true)}
              style={({ pressed }) => [
                styles.subAction,
                {
                  borderRadius: 16,
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.subIconBadge,
                  { backgroundColor: highContrast ? theme.colors.bg : '#E0E7FF' },
                ]}
              >
                <Ionicons name="keypad-outline" size={22} color={theme.colors.primary} />
              </View>
              <AppText variant="body" bold style={styles.centerText}>
                {VI_STRINGS.communicate.actions.typeText}
              </AppText>
              <AppText variant="label" color={theme.colors.textMuted} style={styles.centerText}>
                Gõ chữ phát giọng
              </AppText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.communicate.actions.otherSpeaks}
              testID="open-other-sheet-btn"
              onPress={() => setOtherSheetOpen(true)}
              style={({ pressed }) => [
                styles.subAction,
                {
                  borderRadius: 16,
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.subIconBadge,
                  { backgroundColor: highContrast ? theme.colors.bg : '#FEF3C7' },
                ]}
              >
                <Ionicons name="mic-outline" size={22} color={theme.colors.warning} />
              </View>
              <AppText variant="body" bold style={styles.centerText}>
                {VI_STRINGS.communicate.actions.otherSpeaks}
              </AppText>
              <AppText variant="label" color={theme.colors.textMuted} style={styles.centerText}>
                Người đối diện nói
              </AppText>
            </Pressable>
          </View>
        </View>
      </View>

      <CameraModal visible={cameraOpen} onClose={() => setCameraOpen(false)} />

      {/* Sheet: Gõ phím */}
      <Modal
        visible={typeSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setTypeSheetOpen(false)}
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
                gap: theme.spacing.md,
              },
            ]}
          >
            <View style={styles.sheetHandleBar} />
            <AppText variant="title" bold>
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
                  borderRadius: 14,
                },
              ]}
            />
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={VI_STRINGS.communicate.closeButton}
                onPress={() => setTypeSheetOpen(false)}
                style={[
                  styles.sheetBtn,
                  {
                    flex: 1,
                    minHeight: theme.dimensions.primaryActionMinHeight,
                    borderRadius: 14,
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
                    minHeight: theme.dimensions.primaryActionMinHeight,
                    borderRadius: 14,
                    backgroundColor: theme.colors.primary,
                  },
                ]}
              >
                <Ionicons name="volume-high-outline" size={18} color={theme.colors.onPrimary} />
                <AppText variant="body" bold color={theme.colors.onPrimary}>
                  {VI_STRINGS.communicate.speakButton}
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sheet: Người kia nói */}
      <Modal
        visible={otherSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setOtherSheetOpen(false)}
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
                gap: theme.spacing.md,
              },
            ]}
          >
            <View style={styles.sheetHandleBar} />
            <AppText variant="title" bold>
              {VI_STRINGS.communicate.otherSpeakTitle}
            </AppText>
            <AppText variant="body" color={theme.colors.textMuted}>
              {VI_STRINGS.communicate.noisyPlaceHint}
            </AppText>
            <AppText variant="label" color={theme.colors.warning}>
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
                  borderRadius: 14,
                },
              ]}
            />
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={VI_STRINGS.communicate.closeButton}
                onPress={() => setOtherSheetOpen(false)}
                style={[
                  styles.sheetBtn,
                  {
                    flex: 1,
                    minHeight: theme.dimensions.primaryActionMinHeight,
                    borderRadius: 14,
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
                    minHeight: theme.dimensions.primaryActionMinHeight,
                    borderRadius: 14,
                    backgroundColor: theme.colors.primary,
                  },
                ]}
              >
                <AppText variant="body" bold color={theme.colors.onPrimary}>
                  {VI_STRINGS.communicate.otherReplySubmit}
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
  conversationFrame: {
    flex: 1,
    borderWidth: 1,
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  conversationScroll: {
    padding: 14,
    gap: 10,
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 10,
  },
  emptyIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    maxWidth: 240,
  },
  bubbleWrapper: {
    width: '100%',
  },
  bubbleMeWrapper: {
    alignItems: 'flex-start',
  },
  bubbleOtherWrapper: {
    alignItems: 'flex-start',
  },
  bubble: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 4,
    maxWidth: '92%',
  },
  speakerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  frameActions: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.015)',
  },
  smallAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 44,
    borderWidth: 1,
    paddingHorizontal: 8,
  },
  quickReplyContainer: {
    marginVertical: 2,
  },
  quickReplyScroll: {
    gap: 8,
    alignItems: 'center',
    paddingVertical: 2,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  bigActionsCol: {
    marginTop: 2,
  },
  heroAction: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  heroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextCol: {
    gap: 2,
  },
  twoCols: {
    flexDirection: 'row',
    gap: 10,
  },
  subAction: {
    flex: 1,
    minHeight: 104,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  subIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  centerText: {
    textAlign: 'center',
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    minHeight: 320,
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
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    padding: 14,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  sheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
