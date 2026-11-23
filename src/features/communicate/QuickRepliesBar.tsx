import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCardsStore } from '../../core/db/cardsStorage.ts';
import { VI_STRINGS } from '../../core/i18n/vi.ts';
import { AppText, useAppTheme } from '../../core/theme/ThemeProvider.tsx';

interface QuickRepliesBarProps {
  onSelectReply: (text: string) => void;
}

export function QuickRepliesBar({ onSelectReply }: QuickRepliesBarProps): React.ReactElement {
  const theme = useAppTheme();
  const highContrast = theme.isHighContrast;
  const pinnedCards = useCardsStore((s) => s.pinnedCards);

  const quickReplies = useMemo(
    () => [...VI_STRINGS.communicate.quickReplies, ...pinnedCards.map((c) => c.content)],
    [pinnedCards]
  );

  return (
    <View style={styles.sectionWrapper} testID="quick-replies-bar">
      <AppText
        variant="caption"
        weight="600"
        color={theme.colors.textMuted}
        style={styles.sectionLabel}
      >
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
            testID={`quick-reply-chip-${idx}`}
            onPress={() => onSelectReply(phrase)}
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
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionWrapper: {
    gap: 8,
  },
  sectionLabel: {
    paddingHorizontal: 4,
    letterSpacing: 0.5,
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
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
});
