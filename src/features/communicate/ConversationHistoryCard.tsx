import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VI_STRINGS } from '../../core/i18n/vi.ts';
import { useSystemStore } from '../../core/store/systemStatus.ts';
import { AppText, useAppTheme } from '../../core/theme/ThemeProvider.tsx';
import { speakVietnamese } from '../../core/tts/speechService.ts';

export function ConversationHistoryCard(): React.ReactElement {
  const theme = useAppTheme();
  const highContrast = theme.isHighContrast;

  const history = useSystemStore((s) => s.history);
  const speechRate = useSystemStore((s) => s.speechRate);
  const isFlipped180 = useSystemStore((s) => s.isFlipped180);
  const toggleFlip180 = useSystemStore((s) => s.toggleFlip180);
  const clearHistory = useSystemStore((s) => s.clearHistory);

  const recentEntries = history.slice(-3);
  const latestMe = [...history].reverse().find((h) => h.speaker === 'me');

  return (
    <View
      testID="conversation-history-card"
      style={[
        styles.conversationCard,
        {
          backgroundColor: highContrast ? theme.colors.surface : '#FFFFFF',
          borderColor: highContrast ? theme.colors.border : 'rgba(226, 232, 240, 0.7)',
        },
      ]}
    >
      {/* Header Hội thoại */}
      <View style={styles.cardHeaderRow}>
        <View style={styles.headerTitleLeft}>
          <Ionicons name="chatbubbles-outline" size={16} color={theme.colors.primary} />
          <AppText variant="caption" weight="600" color={theme.colors.textMuted}>
            HỘI THOẠI TRỰC TIẾP
          </AppText>
        </View>
        {isFlipped180 ? (
          <View style={styles.flipBadge} testID="flip-180-badge">
            <Ionicons name="sync" size={11} color={theme.colors.primary} />
            <AppText variant="caption" weight="600" color={theme.colors.primary}>
              Đang lật 180°
            </AppText>
          </View>
        ) : null}
      </View>

      {/* Nội dung tin nhắn */}
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

      {/* Thanh công cụ hội thoại: Lật 180°, Phát lại, Xoá */}
      <View
        style={[
          styles.dialogueToolbar,
          { borderTopColor: highContrast ? theme.colors.border : '#F1F5F9' },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={VI_STRINGS.communicate.flip180}
          testID="flip-180-btn"
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
          testID="replay-btn"
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
          testID="clear-history-btn"
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
  );
}

const styles = StyleSheet.create({
  conversationCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    borderRadius: 8,
  },
  dialogueBody: {
    minHeight: 140,
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  emptyDialogue: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 10,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  bubbleRow: {
    flexDirection: 'row',
  },
  bubbleRowMe: {
    justifyContent: 'flex-end',
  },
  bubbleRowOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '84%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 3,
    borderWidth: 1,
  },
  speakerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dialogueToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  toolPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
});
