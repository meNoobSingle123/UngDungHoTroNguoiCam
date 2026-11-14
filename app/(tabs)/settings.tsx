import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { VI_STRINGS } from '../../src/core/i18n/vi.ts';
import { useSystemStore } from '../../src/core/store/systemStatus.ts';
import { AppText, useAppTheme } from '../../src/core/theme/ThemeProvider.tsx';
import { TopBar } from '../../src/core/theme/TopBar.tsx';
import type { FontScaleLevel } from '../../src/core/theme/tokens.ts';
import { hasVietnameseVoice, speakVietnamese } from '../../src/core/tts/speechService.ts';
import { OnboardingModal } from '../../src/features/onboarding/OnboardingModal.tsx';

const FONT_LEVEL_ORDER: FontScaleLevel[] = ['small', 'medium', 'large', 'max'];
const SPEECH_RATES = [0.75, 1.0, 1.25, 1.5] as const;

export default function SettingsTab(): React.ReactElement {
  const theme = useAppTheme();
  const highContrast = useSystemStore((s) => s.highContrast);
  const fontLevel = useSystemStore((s) => s.fontLevel);
  const speechRate = useSystemStore((s) => s.speechRate);
  const emergencyInfo = useSystemStore((s) => s.emergencyInfo);
  const statusLight = useSystemStore((s) => s.statusLight);
  const onboardingStatus = useSystemStore((s) => s.onboardingStatus);
  const history = useSystemStore((s) => s.history);

  const setFontLevel = useSystemStore((s) => s.setFontLevel);
  const setHighContrast = useSystemStore((s) => s.setHighContrast);
  const setSpeechRate = useSystemStore((s) => s.setSpeechRate);
  const setEmergencyInfo = useSystemStore((s) => s.setEmergencyInfo);
  const setStatusLight = useSystemStore((s) => s.setStatusLight);
  const clearHistory = useSystemStore((s) => s.clearHistory);

  const [voiceStatus, setVoiceStatus] = useState<string>('');
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  const runSystemCheck = async () => {
    const ok = await hasVietnameseVoice();
    setStatusLight(ok ? 'ready' : 'attention');
    setVoiceStatus(ok ? VI_STRINGS.statusLight.ready : VI_STRINGS.statusLight.attention);
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: theme.colors.bg }]}>
      <TopBar title={VI_STRINGS.tabs.settings} />

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.md, gap: 14, paddingBottom: 36 }}
        showsVerticalScrollIndicator={false}
      >
        {onboardingStatus === 'skipped' ? (
          <View
            testID="settings-onboarding-reminder"
            style={[
              styles.card,
              {
                backgroundColor: highContrast ? theme.colors.surface : '#FFFBEB',
                borderColor: highContrast ? theme.colors.border : '#FDE68A',
                borderRadius: 16,
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="information-circle" size={20} color={theme.colors.warning} />
              <AppText variant="body" bold color={theme.colors.warning} style={{ flex: 1 }}>
                {VI_STRINGS.settings.onboardingReminder}
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.settings.openOnboardingButton}
              onPress={() => setOnboardingOpen(true)}
              style={[
                styles.primaryBtn,
                {
                  borderRadius: 14,
                  backgroundColor: theme.colors.primary,
                },
              ]}
            >
              <AppText variant="label" bold color={theme.colors.onPrimary}>
                {VI_STRINGS.settings.openOnboardingButton}
              </AppText>
            </Pressable>
          </View>
        ) : null}

        {/* Nhóm 1: Giao diện & Kích thước chữ */}
        <View style={styles.groupWrapper}>
          <AppText variant="label" bold color={theme.colors.textMuted} style={styles.groupLabel}>
            HIỂN THỊ & GIAO DIỆN
          </AppText>

          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: 16,
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="text-outline" size={20} color={theme.colors.primary} />
              <AppText variant="title" bold>
                {VI_STRINGS.settings.fontScaleTitle}
              </AppText>
            </View>

            {/* Bộ chọn phân đoạn cỡ chữ */}
            <View
              style={[
                styles.segmentedRow,
                {
                  backgroundColor: highContrast ? theme.colors.bg : '#E2E8F0',
                },
              ]}
            >
              {FONT_LEVEL_ORDER.map((lvl) => {
                const active = fontLevel === lvl;
                const label = VI_STRINGS.settings.fontLabels[lvl];
                return (
                  <Pressable
                    key={lvl}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    onPress={() => setFontLevel(lvl)}
                    style={[
                      styles.segmentBtn,
                      {
                        backgroundColor: active
                          ? theme.colors.primary
                          : 'transparent',
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
            </View>

            <View style={[styles.switchRow, { borderTopColor: theme.colors.border }]}>
              <View style={styles.switchLabelCol}>
                <AppText variant="body" bold>
                  {VI_STRINGS.settings.contrastTitle}
                </AppText>
                <AppText variant="label" color={theme.colors.textMuted}>
                  Nền đen tương phản cao ngoài trời
                </AppText>
              </View>
              <Switch
                accessibilityLabel={VI_STRINGS.settings.contrastTitle}
                value={highContrast}
                onValueChange={setHighContrast}
                thumbColor={highContrast ? theme.colors.primary : '#FFFFFF'}
                trackColor={{ false: '#CBD5E1', true: theme.colors.primary }}
              />
            </View>
          </View>
        </View>

        {/* Nhóm 2: Giọng nói & Âm thanh */}
        <View style={styles.groupWrapper}>
          <AppText variant="label" bold color={theme.colors.textMuted} style={styles.groupLabel}>
            GIỌNG NÓI & ÂM THANH
          </AppText>

          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: 16,
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="speedometer-outline" size={20} color={theme.colors.primary} />
              <AppText variant="title" bold>
                {VI_STRINGS.settings.speechRateTitle}: {speechRate}x
              </AppText>
            </View>

            <View
              style={[
                styles.segmentedRow,
                {
                  backgroundColor: highContrast ? theme.colors.bg : '#E2E8F0',
                },
              ]}
            >
              {SPEECH_RATES.map((rate) => {
                const active = speechRate === rate;
                return (
                  <Pressable
                    key={rate}
                    accessibilityRole="button"
                    accessibilityLabel={`${rate}x`}
                    onPress={() => setSpeechRate(rate)}
                    style={[
                      styles.segmentBtn,
                      {
                        backgroundColor: active
                          ? theme.colors.primary
                          : 'transparent',
                      },
                    ]}
                  >
                    <AppText
                      variant="label"
                      bold
                      color={active ? theme.colors.onPrimary : theme.colors.text}
                    >
                      {rate}x
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.settings.testSpeechButton}
              onPress={() =>
                speakVietnamese(VI_STRINGS.settings.testSpeechSample, {
                  rate: speechRate,
                })
              }
              style={[
                styles.primaryBtn,
                {
                  borderRadius: 14,
                  backgroundColor: theme.colors.primary,
                },
              ]}
            >
              <Ionicons name="volume-high-outline" size={18} color={theme.colors.onPrimary} />
              <AppText variant="body" bold color={theme.colors.onPrimary}>
                {VI_STRINGS.settings.testSpeechButton}
              </AppText>
            </Pressable>
          </View>
        </View>

        {/* Nhóm 3: Thông tin khẩn cấp SOS */}
        <View style={styles.groupWrapper}>
          <AppText variant="label" bold color={theme.colors.textMuted} style={styles.groupLabel}>
            THÔNG TIN KHẨN CẤP
          </AppText>

          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: 16,
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="medkit-outline" size={20} color={theme.colors.danger} />
              <AppText variant="title" bold>
                {VI_STRINGS.settings.emergencyTitle}
              </AppText>
            </View>
            <TextInput
              allowFontScaling={false}
              multiline
              value={emergencyInfo}
              onChangeText={setEmergencyInfo}
              placeholder={VI_STRINGS.settings.emergencyPlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              style={[
                styles.input,
                {
                  fontSize: theme.fonts.body,
                  color: theme.colors.text,
                  backgroundColor: theme.colors.bg,
                  borderColor: theme.colors.border,
                  borderRadius: 14,
                },
              ]}
            />
          </View>
        </View>

        {/* Nhóm 4: Kiểm tra hệ thống & Giới thiệu */}
        <View style={styles.groupWrapper}>
          <AppText variant="label" bold color={theme.colors.textMuted} style={styles.groupLabel}>
            HỆ THỐNG & GIỚI THIỆU
          </AppText>

          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: 16,
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="hardware-chip-outline" size={20} color={theme.colors.primary} />
              <AppText variant="title" bold>
                {VI_STRINGS.settings.systemCheckTitle}
              </AppText>
            </View>

            <AppText variant="body" color={theme.colors.textMuted}>
              {VI_STRINGS.statusLight[statusLight]} {voiceStatus ? `· ${voiceStatus}` : ''}
            </AppText>

            <AppText variant="label" color={theme.colors.textMuted}>
              {VI_STRINGS.settings.oppoBatteryTip}
            </AppText>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.settings.systemCheckTitle}
              onPress={runSystemCheck}
              style={[
                styles.primaryBtn,
                {
                  borderRadius: 14,
                  backgroundColor: theme.colors.bg,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Ionicons name="refresh-outline" size={18} color={theme.colors.text} />
              <AppText variant="body" bold>
                {VI_STRINGS.settings.systemCheckTitle}
              </AppText>
            </Pressable>
          </View>

          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: 16,
                marginTop: 10,
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.primary} />
              <AppText variant="title" bold>
                {VI_STRINGS.settings.aboutTitle}
              </AppText>
            </View>

            <AppText variant="body" color={theme.colors.danger} bold>
              {VI_STRINGS.settings.emergencyDisclaimer}
            </AppText>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.settings.openOnboardingButton}
              onPress={() => setOnboardingOpen(true)}
              style={[
                styles.primaryBtn,
                {
                  borderRadius: 14,
                  backgroundColor: theme.colors.bg,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Ionicons name="repeat-outline" size={18} color={theme.colors.text} />
              <AppText variant="label" bold>
                {VI_STRINGS.settings.openOnboardingButton}
              </AppText>
            </Pressable>
          </View>
        </View>

        {/* Nhóm 5: Lịch sử giao tiếp */}
        <View style={styles.groupWrapper}>
          <AppText variant="label" bold color={theme.colors.textMuted} style={styles.groupLabel}>
            LỊCH SỬ GIAO TIẾP
          </AppText>

          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: 16,
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
              <AppText variant="title" bold>
                {VI_STRINGS.settings.historyTitle}
              </AppText>
            </View>

            {history.length === 0 ? (
              <AppText variant="body" color={theme.colors.textMuted}>
                {VI_STRINGS.settings.historyEmpty}
              </AppText>
            ) : (
              history.slice(-10).reverse().map((item) => (
                <View key={item.id} style={styles.historyItemRow}>
                  <Ionicons
                    name={item.speaker === 'other' ? 'chatbubble-outline' : 'person-circle-outline'}
                    size={16}
                    color={item.speaker === 'other' ? theme.colors.primary : theme.colors.textMuted}
                  />
                  <AppText variant="body" style={{ flex: 1 }}>
                    {item.text}
                  </AppText>
                </View>
              ))
            )}

            {history.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={VI_STRINGS.settings.clearHistoryButton}
                onPress={clearHistory}
                style={[
                  styles.primaryBtn,
                  {
                    borderRadius: 14,
                    backgroundColor: theme.colors.bg,
                    borderWidth: 1,
                    borderColor: theme.colors.danger,
                  },
                ]}
              >
                <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                <AppText variant="label" bold color={theme.colors.danger}>
                  {VI_STRINGS.settings.clearHistoryButton}
                </AppText>
              </Pressable>
            ) : null}
          </View>
        </View>
      </ScrollView>

      <OnboardingModal
        visible={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  groupWrapper: {
    gap: 6,
  },
  groupLabel: {
    paddingHorizontal: 4,
    letterSpacing: 0.5,
  },
  card: {
    borderWidth: 1,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  segmentedRow: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  switchLabelCol: {
    flex: 1,
    gap: 2,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 16,
  },
  input: {
    borderWidth: 1,
    padding: 14,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  historyItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
});
