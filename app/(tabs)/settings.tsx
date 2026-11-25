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
import { hapticLight, hapticWarning } from '../../src/core/haptics/hapticFeedback.ts';
import { VI_STRINGS } from '../../src/core/i18n/vi.ts';
import { useSystemStore } from '../../src/core/store/systemStatus.ts';
import { AppText, useAppTheme } from '../../src/core/theme/ThemeProvider.tsx';
import { TopBar } from '../../src/core/theme/TopBar.tsx';
import type { FontScaleLevel } from '../../src/core/theme/tokens.ts';
import { hasVietnameseVoice, speakVietnamese } from '../../src/core/tts/speechService.ts';
import { OnboardingModal } from '../../src/features/onboarding/OnboardingModal.tsx';
import { SosButton } from '../../src/features/sos/SosButton.tsx';

const FONT_LEVEL_ORDER: FontScaleLevel[] = ['small', 'medium', 'large', 'max'];
const SPEECH_RATES = [0.75, 1.0, 1.25, 1.5] as const;

export default function SettingsTab(): React.ReactElement {
  const theme = useAppTheme();
  const highContrast = theme.isHighContrast;
  const fontLevel = useSystemStore((s) => s.fontLevel);
  const speechRate = useSystemStore((s) => s.speechRate);
  const voiceGender = useSystemStore((s) => s.voiceGender);
  const emergencyInfo = useSystemStore((s) => s.emergencyInfo);
  const statusLight = useSystemStore((s) => s.statusLight);
  const onboardingStatus = useSystemStore((s) => s.onboardingStatus);
  const history = useSystemStore((s) => s.history);

  const setFontLevel = useSystemStore((s) => s.setFontLevel);
  const setHighContrast = useSystemStore((s) => s.setHighContrast);
  const setSpeechRate = useSystemStore((s) => s.setSpeechRate);
  const setVoiceGender = useSystemStore((s) => s.setVoiceGender);
  const setEmergencyInfo = useSystemStore((s) => s.setEmergencyInfo);
  const setStatusLight = useSystemStore((s) => s.setStatusLight);
  const clearHistory = useSystemStore((s) => s.clearHistory);

  const [voiceStatus, setVoiceStatus] = useState<string>('');
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  const cardSurfaceStyle = {
    backgroundColor: highContrast ? theme.colors.surface : '#FFFFFF',
    borderColor: highContrast ? theme.colors.border : 'rgba(226, 232, 240, 0.85)',
  };

  const runSystemCheck = async () => {
    hapticLight();
    const ok = await hasVietnameseVoice();
    setStatusLight(ok ? 'ready' : 'attention');
    setVoiceStatus(ok ? 'Giọng tiếng Việt hoạt động tốt' : 'Chưa phát hiện giọng tiếng Việt (vi-VN)');
  };

  const handleTestSpeech = () => {
    hapticLight();
    speakVietnamese(
      voiceGender === 'male'
        ? 'Xin chào, đây là giọng đọc nam của bạn.'
        : 'Xin chào, đây là giọng đọc nữ của bạn.',
      { rate: speechRate, gender: voiceGender }
    );
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.root, { backgroundColor: highContrast ? theme.colors.bg : '#F8FAFC' }]}
    >
      <TopBar title={VI_STRINGS.tabs.settings} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Nhắc hướng dẫn ban đầu nếu người dùng đã bỏ qua */}
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
            <View style={styles.compactRow}>
              <Ionicons name="information-circle" size={18} color={theme.colors.warning} />
              <AppText variant="caption" weight="600" color={theme.colors.warning} style={{ flex: 1 }}>
                {VI_STRINGS.settings.onboardingReminder}
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.settings.openOnboardingButton}
              onPress={() => {
                hapticLight();
                setOnboardingOpen(true);
              }}
              style={({ pressed }) => [
                styles.compactBtn,
                {
                  backgroundColor: theme.colors.primary,
                  borderColor: theme.colors.primary,
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

        {/* Mục 1: Hiển thị & Dễ nhìn (Ưu tiên hàng đầu cho người khiếm thính đọc chữ) */}
        <View style={styles.groupWrapper}>
          <AppText variant="caption" weight="600" color={theme.colors.textMuted} style={styles.groupLabel}>
            1. HIỂN THỊ & DỄ NHÌN
          </AppText>

          <View style={[styles.card, cardSurfaceStyle]}>
            <View style={styles.rowHeader}>
              <Ionicons name="text-outline" size={16} color={theme.colors.primary} />
              <AppText variant="subhead" weight="600" style={{ flex: 1 }}>
                {VI_STRINGS.settings.fontScaleTitle}
              </AppText>
            </View>

            <View
              style={[
                styles.fontGridRow,
                { backgroundColor: highContrast ? theme.colors.bg : '#F1F5F9' },
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
                    onPress={() => {
                      hapticLight();
                      setFontLevel(lvl);
                    }}
                    style={[
                      styles.fontGridBtn,
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
                      numberOfLines={1}
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

            <View
              style={[
                styles.previewRow,
                {
                  backgroundColor: highContrast ? theme.colors.bg : '#F8FAFC',
                  borderColor: highContrast ? theme.colors.border : '#E2E8F0',
                },
              ]}
            >
              <Ionicons name="eye-outline" size={16} color={theme.colors.textMuted} />
              <AppText variant="body" weight="500" color={theme.colors.text} numberOfLines={1} style={{ flex: 1 }}>
                Chào bạn, tôi đang dùng ứng dụng giao tiếp.
              </AppText>
            </View>

            <View style={[styles.switchRow, { borderTopColor: highContrast ? theme.colors.border : '#F1F5F9' }]}>
              <View style={styles.switchLabelCol}>
                <AppText variant="subhead" weight="600">
                  {VI_STRINGS.settings.contrastTitle}
                </AppText>
                <AppText variant="caption" weight="500" color={theme.colors.textMuted}>
                  Chữ vàng nền đen dễ đọc ngoài nắng gắt
                </AppText>
              </View>
              <Switch
                accessibilityLabel={VI_STRINGS.settings.contrastTitle}
                value={highContrast}
                onValueChange={(val) => {
                  hapticLight();
                  setHighContrast(val);
                }}
                thumbColor={highContrast ? theme.colors.primary : '#FFFFFF'}
                trackColor={{ false: '#CBD5E1', true: theme.colors.primary }}
              />
            </View>
          </View>
        </View>

        {/* Mục 2: Giọng đọc tiếng Việt (Gom kiểm tra giọng, giới tính, tốc độ, nghe thử) */}
        <View style={styles.groupWrapper}>
          <AppText variant="caption" weight="600" color={theme.colors.textMuted} style={styles.groupLabel}>
            2. GIỌNG ĐỌC TIẾNG VIỆT (OFFLINE)
          </AppText>

          <View style={[styles.card, cardSurfaceStyle]}>
            {/* Kiểm tra trạng thái giọng đọc trên máy */}
            <View
              style={[
                styles.voiceStatusBox,
                {
                  backgroundColor: highContrast ? theme.colors.bg : '#F8FAFC',
                  borderColor: highContrast ? theme.colors.border : '#E2E8F0',
                },
              ]}
            >
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
              <AppText variant="caption" weight="600" color={theme.colors.text} style={{ flex: 1 }}>
                {voiceStatus ||
                  (statusLight === 'ready'
                    ? 'Giọng đọc tiếng Việt đã sẵn sàng'
                    : 'Cần kiểm tra gói giọng tiếng Việt')}
              </AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={VI_STRINGS.settings.systemCheckTitle}
                testID="settings-check-voice-btn"
                onPress={runSystemCheck}
                style={styles.textActionBtn}
              >
                <Ionicons name="refresh-outline" size={16} color={theme.colors.primary} />
                <AppText variant="caption" weight="600" color={theme.colors.primary}>
                  Kiểm tra
                </AppText>
              </Pressable>
            </View>

            {/* Chọn giọng Nữ / Nam */}
            <View style={styles.subSectionRow}>
              <View style={styles.rowHeader}>
                <Ionicons name="person-outline" size={16} color={theme.colors.primary} />
                <AppText variant="subhead" weight="600" style={{ flex: 1 }}>
                  {VI_STRINGS.settings.voiceGenderTitle}
                </AppText>
              </View>

              <View
                style={[
                  styles.genderSegmentedRow,
                  { backgroundColor: highContrast ? theme.colors.bg : '#F1F5F9' },
                ]}
              >
                {(['female', 'male'] as const).map((g) => {
                  const active = voiceGender === g;
                  const label =
                    g === 'female'
                      ? VI_STRINGS.settings.voiceGenderFemale
                      : VI_STRINGS.settings.voiceGenderMale;
                  const icon = g === 'female' ? 'woman-outline' : 'man-outline';
                  return (
                    <Pressable
                      key={g}
                      accessibilityRole="button"
                      accessibilityLabel={label}
                      onPress={() => {
                        hapticLight();
                        setVoiceGender(g);
                      }}
                      style={[
                        styles.genderBtn,
                        active
                          ? highContrast
                            ? { backgroundColor: theme.colors.primary }
                            : styles.segmentBtnActiveLight
                          : undefined,
                      ]}
                    >
                      <Ionicons
                        name={icon}
                        size={16}
                        color={
                          active
                            ? highContrast
                              ? theme.colors.onPrimary
                              : theme.colors.primary
                            : theme.colors.textMuted
                        }
                      />
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
            </View>

            {/* Tốc độ đọc */}
            <View style={styles.subSectionRow}>
              <View style={styles.rowHeader}>
                <Ionicons name="speedometer-outline" size={16} color={theme.colors.primary} />
                <AppText variant="subhead" weight="600" style={{ flex: 1 }}>
                  {VI_STRINGS.settings.speechRateTitle}: {speechRate}x
                </AppText>
              </View>

              <View
                style={[
                  styles.segmentedRow,
                  { backgroundColor: highContrast ? theme.colors.bg : '#F1F5F9' },
                ]}
              >
                {SPEECH_RATES.map((rate) => {
                  const active = speechRate === rate;
                  return (
                    <Pressable
                      key={rate}
                      accessibilityRole="button"
                      accessibilityLabel={`${rate}x`}
                      onPress={() => {
                        hapticLight();
                        setSpeechRate(rate);
                      }}
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
            </View>

            {/* Nghe thử giọng đọc */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.settings.testSpeechButton}
              onPress={handleTestSpeech}
              style={({ pressed }) => [
                styles.compactBtn,
                {
                  backgroundColor: highContrast ? theme.colors.bg : '#EFF6FF',
                  borderColor: highContrast ? theme.colors.border : '#DBEAFE',
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
            >
              <Ionicons name="volume-high-outline" size={18} color={theme.colors.primary} />
              <AppText variant="label" weight="600" color={theme.colors.primary}>
                {VI_STRINGS.settings.testSpeechButton} ({voiceGender === 'male' ? 'Nam' : 'Nữ'} · {speechRate}x)
              </AppText>
            </Pressable>
          </View>
        </View>

        {/* Mục 3: Khẩn cấp (SOS) — Gom nút SOS, Thông tin khẩn cấp và Miễn trừ 113/115 vào cùng chỗ */}
        <View style={styles.groupWrapper}>
          <AppText variant="caption" weight="600" color={theme.colors.textMuted} style={styles.groupLabel}>
            3. KHẨN CẤP (SOS)
          </AppText>

          <View style={[styles.card, cardSurfaceStyle]}>
            <View
              style={[
                styles.emergencyTriggerRow,
                {
                  backgroundColor: highContrast ? theme.colors.bg : '#FEF2F2',
                  borderColor: highContrast ? theme.colors.danger : '#FECACA',
                },
              ]}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="subhead" weight="700" color={theme.colors.danger}>
                  BÁO ĐỘNG SOS
                </AppText>
                <AppText variant="caption" weight="500" color={theme.colors.textMuted}>
                  Nhấn giữ nút đỏ 1,5 giây để phát tín hiệu màn hình
                </AppText>
              </View>
              <SosButton />
            </View>

            <View style={styles.subSectionRow}>
              <AppText variant="caption" weight="600" color={theme.colors.textMuted}>
                {VI_STRINGS.settings.emergencyTitle}
              </AppText>
              <TextInput
                allowFontScaling={false}
                multiline
                value={emergencyInfo}
                onChangeText={setEmergencyInfo}
                placeholder={VI_STRINGS.settings.emergencyPlaceholder}
                placeholderTextColor={theme.colors.textMuted}
                style={[
                  styles.compactInput,
                  {
                    fontSize: theme.fonts.label,
                    color: theme.colors.text,
                    backgroundColor: highContrast ? theme.colors.bg : '#F8FAFC',
                    borderColor: highContrast ? theme.colors.border : '#E2E8F0',
                  },
                ]}
              />
            </View>

            <View
              style={[
                styles.disclaimerBox,
                {
                  backgroundColor: highContrast ? theme.colors.bg : '#FEF2F2',
                  borderColor: highContrast ? theme.colors.danger : 'transparent',
                  borderWidth: highContrast ? 1 : 0,
                },
              ]}
            >
              <Ionicons name="warning-outline" size={16} color={theme.colors.danger} />
              <AppText variant="caption" weight="500" color={theme.colors.danger} style={{ flex: 1 }}>
                {VI_STRINGS.settings.emergencyDisclaimer}
              </AppText>
            </View>
          </View>
        </View>

        {/* Mục 4: Dữ liệu & Hướng dẫn trên máy */}
        <View style={styles.groupWrapper}>
          <AppText variant="caption" weight="600" color={theme.colors.textMuted} style={styles.groupLabel}>
            4. DỮ LIỆU & HƯỚNG DẪN
          </AppText>

          <View style={[styles.card, cardSurfaceStyle]}>
            {/* Lịch sử giao tiếp lưu trên máy */}
            <View style={styles.compactRow}>
              <Ionicons name="time-outline" size={18} color={theme.colors.primary} />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="subhead" weight="600">
                  {VI_STRINGS.settings.historyTitle}
                </AppText>
                <AppText variant="caption" color={theme.colors.textMuted}>
                  {history.length > 0
                    ? `Đang lưu ${history.length} câu hội thoại trên máy`
                    : VI_STRINGS.settings.historyEmpty}
                </AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={VI_STRINGS.settings.clearHistoryButton}
                testID="settings-clear-history-btn"
                disabled={history.length === 0}
                onPress={() => {
                  hapticWarning();
                  clearHistory();
                }}
                style={[
                  styles.textActionBtn,
                  { opacity: history.length === 0 ? 0.35 : 1 },
                ]}
              >
                <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
                <AppText variant="caption" weight="600" color={theme.colors.danger}>
                  Xóa
                </AppText>
              </Pressable>
            </View>

            {/* Hoạt động ngoại tuyến an toàn */}
            <View
              style={[
                styles.offlineBanner,
                { borderTopColor: highContrast ? theme.colors.border : '#F1F5F9' },
              ]}
            >
              <Ionicons name="shield-checkmark-outline" size={18} color={theme.colors.success} />
              <AppText variant="caption" weight="500" color={theme.colors.textMuted} style={{ flex: 1 }}>
                {VI_STRINGS.settings.accountGuestDesc}
              </AppText>
              <View
                style={[
                  styles.offlinePill,
                  {
                    backgroundColor: highContrast ? theme.colors.bg : '#F1F5F9',
                    borderColor: highContrast ? theme.colors.border : '#E2E8F0',
                  },
                ]}
              >
                <AppText variant="caption" weight="600" color={theme.colors.textMuted}>
                  {VI_STRINGS.settings.accountOfflineBadge}
                </AppText>
              </View>
            </View>

            {/* Mở lại hướng dẫn ban đầu */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.settings.openOnboardingButton}
              onPress={() => {
                hapticLight();
                setOnboardingOpen(true);
              }}
              style={({ pressed }) => [
                styles.compactBtn,
                {
                  backgroundColor: highContrast ? theme.colors.bg : '#F8FAFC',
                  borderColor: highContrast ? theme.colors.border : '#E2E8F0',
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
            >
              <Ionicons name="help-circle-outline" size={18} color={theme.colors.text} />
              <AppText variant="label" weight="600">
                {VI_STRINGS.settings.openOnboardingButton}
              </AppText>
            </Pressable>

            <AppText variant="caption" weight="500" color={theme.colors.textMuted} style={styles.tipText}>
              {VI_STRINGS.settings.batteryOptimizationTip}
            </AppText>
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
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 14,
    paddingBottom: 112,
  },
  groupWrapper: {
    gap: 8,
  },
  groupLabel: {
    paddingHorizontal: 4,
    letterSpacing: 0.4,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subSectionRow: {
    gap: 6,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  voiceStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  fontGridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 4,
    borderRadius: 14,
    gap: 4,
  },
  fontGridBtn: {
    flexBasis: '48.5%',
    flexGrow: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 11,
  },
  genderSegmentedRow: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 14,
    gap: 4,
  },
  genderBtn: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 11,
  },
  segmentedRow: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 14,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 11,
  },
  segmentBtnActiveLight: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  switchLabelCol: {
    flex: 1,
    gap: 2,
  },
  compactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  emergencyTriggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  compactInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  textActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    gap: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  offlinePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 18,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
});
