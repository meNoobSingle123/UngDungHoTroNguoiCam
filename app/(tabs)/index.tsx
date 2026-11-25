import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight } from '../../src/core/haptics/hapticFeedback.ts';
import { VI_STRINGS } from '../../src/core/i18n/vi.ts';
import { useSystemStore } from '../../src/core/store/systemStatus.ts';
import { AppText, useAppTheme } from '../../src/core/theme/ThemeProvider.tsx';
import { TopBar } from '../../src/core/theme/TopBar.tsx';
import { speakVietnamese } from '../../src/core/tts/speechService.ts';
import { CameraModal } from '../../src/features/camera/CameraModal.tsx';
import {
  OtherSpeechSheet,
  TypeSpeechSheet,
} from '../../src/features/communicate/CommunicateSheets.tsx';
import { ConversationHistoryCard } from '../../src/features/communicate/ConversationHistoryCard.tsx';
import { QuickRepliesBar } from '../../src/features/communicate/QuickRepliesBar.tsx';

export default function CommunicateTab(): React.ReactElement {
  useKeepAwake();
  const theme = useAppTheme();
  const highContrast = theme.isHighContrast;

  const speechRate = useSystemStore((s) => s.speechRate);
  const addHistoryEntry = useSystemStore((s) => s.addHistoryEntry);
  const setStatusLight = useSystemStore((s) => s.setStatusLight);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [typeSheetOpen, setTypeSheetOpen] = useState(false);
  const [otherSheetOpen, setOtherSheetOpen] = useState(false);

  const speakAndRecord = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      addHistoryEntry('me', trimmed);
      speakVietnamese(trimmed, {
        rate: speechRate,
        onError: () => setStatusLight('attention'),
      });
    },
    [addHistoryEntry, setStatusLight, speechRate]
  );

  const handleOtherSubmit = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (trimmed) {
        addHistoryEntry('other', trimmed);
      }
    },
    [addHistoryEntry]
  );

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.root, { backgroundColor: highContrast ? theme.colors.bg : '#F8FAFC' }]}
    >
      <TopBar title={VI_STRINGS.tabs.communicate} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Mục 1: Khung Hội thoại Trực tiếp */}
        <ConversationHistoryCard />

        {/* Mục 2: Dải Câu Phản hồi Nhanh */}
        <QuickRepliesBar onSelectReply={speakAndRecord} />

        {/* Mục 3: Chọn cách giao tiếp */}
        <View style={styles.sectionWrapper}>
          <AppText
            variant="caption"
            weight="600"
            color={theme.colors.textMuted}
            style={styles.sectionLabel}
          >
            3. CHỌN CÁCH GIAO TIẾP
          </AppText>

          {/* Lựa chọn 1: Quay cử chỉ tay */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={VI_STRINGS.communicate.actions.mySign}
            testID="open-camera-btn"
            onPress={() => {
              hapticLight();
              setCameraOpen(true);
            }}
            style={({ pressed }) => [
              styles.heroCard,
              {
                minHeight: theme.dimensions.bigActionMinHeight,
                backgroundColor: theme.colors.primary,
                opacity: pressed ? 0.92 : 1,
              },
            ]}
          >
            <View style={styles.heroLeft}>
              <View style={styles.heroIconBadge}>
                <Ionicons name="hand-right" size={22} color={theme.colors.onPrimary} />
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

          {/* Lựa chọn 2 & 3: Nhập phím & Người kia nói */}
          <View style={styles.twoActionRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.communicate.actions.typeText}
              testID="open-type-sheet-btn"
              onPress={() => {
                hapticLight();
                setTypeSheetOpen(true);
              }}
              style={({ pressed }) => [
                styles.actionTile,
                {
                  minHeight: theme.dimensions.bigActionMinHeight,
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
              <AppText
                variant="caption"
                weight="400"
                color={theme.colors.textMuted}
                style={styles.centerText}
              >
                Gõ chữ phát giọng
              </AppText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.communicate.actions.otherSpeaks}
              testID="open-other-sheet-btn"
              onPress={() => {
                hapticLight();
                setOtherSheetOpen(true);
              }}
              style={({ pressed }) => [
                styles.actionTile,
                {
                  minHeight: theme.dimensions.bigActionMinHeight,
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
              <AppText
                variant="caption"
                weight="400"
                color={theme.colors.textMuted}
                style={styles.centerText}
              >
                Đưa máy người kia gõ
              </AppText>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Camera nhận diện ký hiệu chỉ mount khi mở */}
      {cameraOpen ? (
        <CameraModal visible={cameraOpen} onClose={() => setCameraOpen(false)} />
      ) : null}

      {/* Sheet Gõ phím độc lập */}
      <TypeSpeechSheet
        visible={typeSheetOpen}
        onClose={() => setTypeSheetOpen(false)}
        onSubmit={speakAndRecord}
      />

      {/* Sheet Người đối diện nói độc lập */}
      <OtherSpeechSheet
        visible={otherSheetOpen}
        onClose={() => setOtherSheetOpen(false)}
        onSubmit={handleOtherSubmit}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 112,
    gap: 14,
  },
  sectionWrapper: {
    gap: 10,
  },
  sectionLabel: {
    paddingHorizontal: 4,
    letterSpacing: 0.5,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderRadius: 22,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 5,
  },
  heroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  heroIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextCol: {
    gap: 3,
    flex: 1,
  },
  heroChevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  twoActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionTile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  tileIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  centerText: {
    textAlign: 'center',
  },
});
