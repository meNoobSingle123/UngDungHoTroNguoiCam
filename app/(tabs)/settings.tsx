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
  const highContrast = theme.isHighContrast;
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
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: highContrast ? theme.colors.bg : '#F8FAFC' }]}>
      <TopBar title={VI_STRINGS.tabs.settings} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {onboardingStatus === 'skipped' ? (
          <View
            testID="settings-onboarding-reminder"
            style={[
              styles.card,
              {
                backgroundColor: highContrast ? theme.colors.surface : '#FFFBEB',
                borderColor: highContrast ? theme.colors.border : '#FEF3C7',
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="information-circle" size={20} color={theme.colors.warning} />
              <AppText variant="subhead" weight="600" color={theme.colors.warning} style={{ flex: 1 }}>
                {VI_STRINGS.settings.onboardingReminder}
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.settings.openOnboardingButton}
              onPress={() => setOnboardingOpen(true)}
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  backgroundColor: theme.colors.primary,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
            >
              <AppText variant="label" weight="600" color={theme.colors.onPrimary}>
                {VI_STRINGS.settings.openOnboardingButton}
              </AppText>
            </Pressable>
          </View>
        ) : null}

        {/* Nhóm 1: Giao diện & Kích thước chữ */}
        <View style={styles.groupWrapper}>
          <AppText variant="caption" weight="600" color={theme.colors.textMuted} style={styles.groupLabel}>
            HIỂN THỊ & GIAO DIỆN
          </AppText>

          <View
            style={[
              styles.card,
              {
                backgroundColor: highContrast ? theme.colors.surface : '#FFFFFF',
                borderColor: highContrast ? theme.colors.border : 'rgba(241, 245, 249, 0.9)',
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconBadge, { backgroundColor: highContrast ? theme.colors.bg : '#EFF6FF' }]}>
                <Ionicons name="text-outline" size={18} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="subhead" weight="600">
                  {VI_STRINGS.settings.fontScaleTitle}
                </AppText>
                <AppText variant="caption" weight="500" color={theme.colors.textMuted}>
                  Tùy chỉnh độ lớn chữ trên toàn ứng dụng
                </AppText>
              </View>
            </View>

            {/* Bộ chọn phân đoạn cỡ chữ */}
            <View
              style={[
                styles.segmentedRow,
                {
                  backgroundColor: highContrast ? theme.colors.bg : '#F1F5F9',
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
                      active
                        ? highContrast
                          ? { backgroundColor: theme.colors.primary }
                          : styles.segmentBtnActiveLight
                        : undefined,
                    ]}
                  >
                    <AppText
                      variant="caption"
                      weight={active ? '700' : '500'}
                      color={
                        active
                          ? highContrast
                            ? theme.colors.onPrimary
                            : theme.colors.primary
                          : theme.colors.textMuted
                      }
                    >
                      {label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            {/* Khung xem trước trực tiếp cỡ chữ */}
            <View
              style={[
                styles.previewBox,
                {
                  backgroundColor: highContrast ? theme.colors.bg : '#F8FAFC',
                  borderColor: highContrast ? theme.colors.border : '#E2E8F0',
                },
              ]}
            >
              <AppText variant="caption" weight="600" color={theme.colors.textMuted}>
                Văn bản mẫu xem trước:
              </AppText>
              <AppText variant="body" weight="500" color={theme.colors.text}>
                Chào bạn, tôi đang dùng ứng dụng giao tiếp hỗ trợ người khiếm thính.
              </AppText>
            </View>

            {/* Dòng chế độ tương phản cao */}
            <View style={[styles.switchRow, { borderTopColor: highContrast ? theme.colors.border : '#F1F5F9' }]}>
              <View style={styles.switchLabelCol}>
                <AppText variant="subhead" weight="600">
                  {VI_STRINGS.settings.contrastTitle}
                </AppText>
                <AppText variant="caption" weight="500" color={theme.colors.textMuted}>
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
          <AppText variant="caption" weight="600" color={theme.colors.textMuted} style={styles.groupLabel}>
            GIỌNG NÓI & ÂM THANH
          </AppText>

          <View
            style={[
              styles.card,
              {
                backgroundColor: highContrast ? theme.colors.surface : '#FFFFFF',
                borderColor: highContrast ? theme.colors.border : 'rgba(241, 245, 249, 0.9)',
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconBadge, { backgroundColor: highContrast ? theme.colors.bg : '#EFF6FF' }]}>
                <Ionicons name="speedometer-outline" size={18} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="subhead" weight="600">
                  {VI_STRINGS.settings.speechRateTitle}: {speechRate}x
                </AppText>
                <AppText variant="caption" weight="500" color={theme.colors.textMuted}>
                  Điều chỉnh tốc độ phát âm thanh tiếng Việt
                </AppText>
              </View>
            </View>

            <View
              style={[
                styles.segmentedRow,
                {
                  backgroundColor: highContrast ? theme.colors.bg : '#F1F5F9',
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
                      active
                        ? highContrast
                          ? { backgroundColor: theme.colors.primary }
                          : styles.segmentBtnActiveLight
                        : undefined,
                    ]}
                  >
                    <AppText
                      variant="caption"
                      weight={active ? '700' : '500'}
                      color={
                        active
                          ? highContrast
                            ? theme.colors.onPrimary
                            : theme.colors.primary
                          : theme.colors.textMuted
                      }
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
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  backgroundColor: highContrast ? theme.colors.bg : '#EFF6FF',
                  borderWidth: 1,
                  borderColor: highContrast ? theme.colors.border : '#DBEAFE',
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
            >
              <Ionicons name="volume-high-outline" size={18} color={theme.colors.primary} />
              <AppText variant="subhead" weight="600" color={theme.colors.primary}>
                {VI_STRINGS.settings.testSpeechButton}
              </AppText>
            </Pressable>
          </View>
        </View>

        {/* Nhóm 3: Thông tin khẩn cấp SOS */}
        <View style={styles.groupWrapper}>
          <AppText variant="caption" weight="600" color={theme.colors.textMuted} style={styles.groupLabel}>
            THÔNG TIN KHẨN CẤP
          </AppText>

          <View
            style={[
              styles.card,
              {
                backgroundColor: highContrast ? theme.colors.surface : '#FFFFFF',
                borderColor: highContrast ? theme.colors.border : 'rgba(241, 245, 249, 0.9)',
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconBadge, { backgroundColor: highContrast ? theme.colors.bg : '#FEE2E2' }]}>
                <Ionicons name="medkit-outline" size={18} color={theme.colors.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="subhead" weight="600">
                  {VI_STRINGS.settings.emergencyTitle}
                </AppText>
                <AppText variant="caption" weight="500" color={theme.colors.textMuted}>
                  Hiện trên toàn màn hình khi giữ nút SOS đỏ
                </AppText>
              </View>
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
                  backgroundColor: highContrast ? theme.colors.bg : '#F8FAFC',
                  borderColor: highContrast ? theme.colors.border : '#E2E8F0',
                },
              ]}
            />
          </View>
        </View>

        {/* Nhóm 4: Kiểm tra hệ thống & Giới thiệu */}
        <View style={styles.groupWrapper}>
          <AppText variant="caption" weight="600" color={theme.colors.textMuted} style={styles.groupLabel}>
            HỆ THỐNG & GIỚI THIỆU
          </AppText>

          <View
            style={[
              styles.card,
              {
                backgroundColor: highContrast ? theme.colors.surface : '#FFFFFF',
                borderColor: highContrast ? theme.colors.border : 'rgba(241, 245, 249, 0.9)',
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconBadge, { backgroundColor: highContrast ? theme.colors.bg : '#EFF6FF' }]}>
                <Ionicons name="hardware-chip-outline" size={18} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="subhead" weight="600">
                  {VI_STRINGS.settings.systemCheckTitle}
                </AppText>
              </View>
            </View>

            {/* Trạng thái hệ thống */}
            <View style={styles.systemStatusPill}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      statusLight === 'ready'
                        ? '#16A34A'
                        : statusLight === 'attention'
                          ? '#EAB308'
                          : '#DC2626',
                  },
                ]}
              />
              <AppText variant="caption" weight="600" color={theme.colors.text}>
                {VI_STRINGS.statusLight[statusLight]} {voiceStatus ? `· ${voiceStatus}` : ''}
              </AppText>
            </View>

            <AppText variant="caption" weight="500" color={theme.colors.textMuted}>
              {VI_STRINGS.settings.oppoBatteryTip}
            </AppText>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.settings.systemCheckTitle}
              onPress={runSystemCheck}
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  backgroundColor: highContrast ? theme.colors.bg : '#F8FAFC',
                  borderColor: highContrast ? theme.colors.border : '#E2E8F0',
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
            >
              <Ionicons name="refresh-outline" size={18} color={theme.colors.text} />
              <AppText variant="subhead" weight="600">
                {VI_STRINGS.settings.systemCheckTitle}
              </AppText>
            </Pressable>
          </View>

          {/* Thẻ miễn trừ trách nhiệm & Onboarding */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: highContrast ? theme.colors.surface : '#FFFFFF',
                borderColor: highContrast ? theme.colors.border : 'rgba(241, 245, 249, 0.9)',
                marginTop: 4,
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconBadge, { backgroundColor: highContrast ? theme.colors.bg : '#EFF6FF' }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={theme.colors.primary} />
              </View>
              <AppText variant="subhead" weight="600">
                {VI_STRINGS.settings.aboutTitle}
              </AppText>
            </View>

            <View style={styles.disclaimerBox}>
              <Ionicons name="warning-outline" size={16} color={theme.colors.danger} />
              <AppText variant="caption" weight="600" color={theme.colors.danger} style={{ flex: 1 }}>
                {VI_STRINGS.settings.emergencyDisclaimer}
              </AppText>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.settings.openOnboardingButton}
              onPress={() => setOnboardingOpen(true)}
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  backgroundColor: highContrast ? theme.colors.bg : '#F8FAFC',
                  borderColor: highContrast ? theme.colors.border : '#E2E8F0',
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
            >
              <Ionicons name="repeat-outline" size={18} color={theme.colors.text} />
              <AppText variant="subhead" weight="600">
                {VI_STRINGS.settings.openOnboardingButton}
              </AppText>
            </Pressable>
          </View>
        </View>

        {/* Nhóm 5: Lịch sử giao tiếp */}
        <View style={styles.groupWrapper}>
          <AppText variant="caption" weight="600" color={theme.colors.textMuted} style={styles.groupLabel}>
            LỊCH SỬ GIAO TIẾP
          </AppText>

          <View
            style={[
              styles.card,
              {
                backgroundColor: highContrast ? theme.colors.surface : '#FFFFFF',
                borderColor: highContrast ? theme.colors.border : 'rgba(241, 245, 249, 0.9)',
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconBadge, { backgroundColor: highContrast ? theme.colors.bg : '#EFF6FF' }]}>
                <Ionicons name="time-outline" size={18} color={theme.colors.primary} />
              </View>
              <AppText variant="subhead" weight="600">
                {VI_STRINGS.settings.historyTitle}
              </AppText>
            </View>

            {history.length === 0 ? (
              <AppText variant="caption" weight="500" color={theme.colors.textMuted}>
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
                  <AppText variant="caption" weight="500" style={{ flex: 1 }}>
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
                style={({ pressed }) => [
                  styles.primaryBtn,
                  {
                    backgroundColor: highContrast ? theme.colors.bg : '#FEF2F2',
                    borderColor: highContrast ? theme.colors.danger : '#FECACA',
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}
              >
                <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                <AppText variant="subhead" weight="600" color={theme.colors.danger}>
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
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 104, // accommodate Floating Island Dock
  },
  groupWrapper: {
    gap: 8,
  },
  groupLabel: {
    paddingHorizontal: 4,
    letterSpacing: 0.5,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedRow: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 16,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  segmentBtnActiveLight: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  previewBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
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
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    minHeight: 88,
    textAlignVertical: 'top',
  },
  systemStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 12,
  },
  historyItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
});
