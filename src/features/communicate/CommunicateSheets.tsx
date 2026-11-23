import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VI_STRINGS } from '../../core/i18n/vi.ts';
import { AppText, useAppTheme } from '../../core/theme/ThemeProvider.tsx';

export interface TypeSpeechSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
}

export function TypeSpeechSheet({
  visible,
  onClose,
  onSubmit,
}: TypeSpeechSheetProps): React.ReactElement | null {
  const theme = useAppTheme();
  const [typedText, setTypedText] = useState('');

  if (!visible) return null;

  const handleSpeak = () => {
    const trimmed = typedText.trim();
    if (trimmed) {
      onSubmit(trimmed);
      setTypedText('');
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.sheetBackdrop} testID="type-speech-sheet">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={VI_STRINGS.communicate.closeButton}
          testID="type-sheet-backdrop"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
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
            testID="type-speech-input"
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
              },
            ]}
          />
          <View style={styles.sheetBtnRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.communicate.closeButton}
              testID="type-sheet-cancel-btn"
              onPress={onClose}
              style={[
                styles.sheetBtn,
                {
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                  backgroundColor: theme.colors.surface,
                },
              ]}
            >
              <AppText variant="body" weight="600" color={theme.colors.text}>
                {VI_STRINGS.communicate.closeButton}
              </AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.communicate.speakButton}
              testID="type-sheet-submit-btn"
              onPress={handleSpeak}
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
  );
}

export interface OtherSpeechSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
}

export function OtherSpeechSheet({
  visible,
  onClose,
  onSubmit,
}: OtherSpeechSheetProps): React.ReactElement | null {
  const theme = useAppTheme();
  const [otherText, setOtherText] = useState('');

  if (!visible) return null;

  const handleSubmit = () => {
    const trimmed = otherText.trim();
    if (trimmed) {
      onSubmit(trimmed);
      setOtherText('');
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.sheetBackdrop} testID="other-speech-sheet">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={VI_STRINGS.communicate.closeButton}
          testID="other-sheet-backdrop"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
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
            testID="other-speech-input"
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
              },
            ]}
          />
          <View style={styles.sheetBtnRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.communicate.closeButton}
              testID="other-sheet-cancel-btn"
              onPress={onClose}
              style={[
                styles.sheetBtn,
                {
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                  backgroundColor: theme.colors.surface,
                },
              ]}
            >
              <AppText variant="body" weight="600" color={theme.colors.text}>
                {VI_STRINGS.communicate.closeButton}
              </AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.communicate.otherReplySubmit}
              testID="other-sheet-submit-btn"
              onPress={handleSubmit}
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
  );
}

const styles = StyleSheet.create({
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
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
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    textAlignVertical: 'top',
  },
  sheetBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sheetBtn: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 20,
  },
});
