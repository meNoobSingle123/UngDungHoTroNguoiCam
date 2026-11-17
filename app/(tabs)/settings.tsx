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

  const runSystemCheck = async () => {
    const ok = await hasVietnameseVoice();
    setStatusLight(ok ? 'ready' : 'attention');
    setVoiceStatus(ok ? VI_STRINGS.statusLight.ready : VI_STRINGS.statusLight.attention);
  };

  const handleTestSpeech = () => {
    speakVietnamese(
      voiceGender === 'male'
        ? 'Xin chào, đây là giọng đọc nam của bạn.'
        : 'Xin chào, đây là giọng đọc nữ của bạn.',
      { rate: speechRate, gender: voiceGender }
    );
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
            <View style={styles.compactRow}>
              <Ionicons name="information-circle" size={18} color={theme.colors.warning} />
              <AppText variant="caption" weight="600" color={theme.colors.warning} style={{ flex: 1 }}>
                {VI_STRINGS.settings.onboardingReminder}
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.settings.openOnboardingButton}
              onPress={() => setOnboardingOpen(true)}
              style={({ pressed }) => [
                styles.compactBtn,
                {
                  backgroundColor: theme.colors.primary,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
            >
              <AppText variant="caption" weight="600" color={theme.colors.onPrimary}>
                {VI_STRINGS.settings.openOnboardingButton}
              </AppText>
            </Pressable>
          </View>
        ) : null}

        {/* Nhóm 1: Hiển thị & Giao diện */}
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
            {/* Cỡ chữ */}
            <View style={styles.rowHeader}>
              <Ionicons name="text-outline" size={16} color={theme.colors.primary} />
              <AppText variant="subhead" weight="600" style={{ flex: 1 }}>
                {VI_STRINGS.settings.fontScaleTitle}
              </AppText>
            </View>

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

            {/* Mẫu chữ xem trước nhỏ gọn */}
            <View
              style={[
                styles.previewRow,
                {
                  backgroundColor: highContrast ? theme.colors.bg : '#F8FAFC',
                  borderColor: highContrast ? theme.colors.border : '#E2E8F0',
                },
              ]}
            >
              <Ionicons name="eye-outline" size={14} color={theme.colors.textMuted} />
              <AppText variant="body" weight="500" color={theme.colors.text} numberOfLines={1} style={{ flex: 1 }}>
                Chào bạn, tôi đang dùng ứng dụng giao tiếp.
              </AppText>
            </View>

            {/* Chế độ tương phản cao */}
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
            {/* Điều chỉnh giọng Nam / Nữ */}
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
                  const label = g === 'female' ? VI_STRINGS.settings.voiceGenderFemale : VI_STRINGS.settings.voiceGenderMale;
                  const icon = g === 'female' ? 'woman-outline' : 'man-outline';
                  return (
                    <Pressable
                      key={g}
                      accessibilityRole="button"
                      accessibilityLabel={label}
                      onPress={() => setVoiceGender(g)}
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
                        size={15}
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
            </View>

            {/* Nút nghe thử giọng đọc gọn gàng */}
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
              <Ionicons name="volume-high-outline" size={16} color={theme.colors.primary} />
              <AppText variant="caption" weight="600" color={theme.colors.primary}>
                {VI_STRINGS.settings.testSpeechButton} ({voiceGender === 'male' ? 'Nam' : 'Nữ'} · {speechRate}x)
              </AppText>
            </Pressable>
          </View>
        </View>

        {/* Nhóm 3: Thông tin khẩn cấp & SOS */}
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
                <AppText variant="caption" weight="700" color={theme.colors.danger}>
                  BÁO ĐỘNG SOS
                </AppText>
                <AppText variant="caption" weight="500" color={theme.colors.textMuted}>
                  Giữ nút đỏ 1.5s để kích hoạt
                </AppText>
              </View>
              <SosButton />
            </View>

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
                  fontSize: 14,
                  color: theme.colors.text,
                  backgroundColor: highContrast ? theme.colors.bg : '#F8FAFC',
                  borderColor: highContrast ? theme.colors.border : '#E2E8F0',
                },
              ]}
            />
          </View>
        </View>

        {/* Nhóm 4: Hệ thống & Giới thiệu */}
        <View style={styles.groupWrapper}>
          <AppText variant="caption" weight="600" color={theme.colors.textMuted} style={styles.groupLabel}>
            HỆ THỐNG & TRỢ GIÚP
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
            {/* Trạng thái hệ thống */}
            <View style={styles.compactRow}>
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
                {VI_STRINGS.statusLight[statusLight]} {voiceStatus ? `· ${voiceStatus}` : ''}
              </AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={VI_STRINGS.settings.systemCheckTitle}
                onPress={runSystemCheck}
                style={styles.textActionBtn}
              >
                <Ionicons name="refresh-outline" size={14} color={theme.colors.primary} />
                <AppText variant="caption" weight="600" color={theme.colors.primary}>
                  Kiểm tra
                </AppText>
              </Pressable>
            </View>

            <AppText variant="caption" weight="500" color={theme.colors.textMuted} style={styles.tipText}>
              {VI_STRINGS.settings.oppoBatteryTip}
            </AppText>

            {/* Mở lại hướng dẫn ban đầu */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.settings.openOnboardingButton}
              onPress={() => setOnboardingOpen(true)}
              style={({ pressed }) => [
                styles.compactBtn,
                {
                  backgroundColor: highContrast ? theme.colors.bg : '#F8FAFC',
                  borderColor: highContrast ? theme.colors.border : '#E2E8F0',
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
            >
              <Ionicons name="repeat-outline" size={15} color={theme.colors.text} />
              <AppText variant="caption" weight="600">
                {VI_STRINGS.settings.openOnboardingButton}
              </AppText>
            </Pressable>

            {/* Lịch sử giao tiếp */}
            {history.length > 0 ? (
              <View style={[styles.historyBox, { borderTopColor: highContrast ? theme.colors.border : '#F1F5F9' }]}>
                <View style={styles.compactRow}>
                  <Ionicons name="time-outline" size={15} color={theme.colors.textMuted} />
                  <AppText variant="caption" weight="600" style={{ flex: 1 }}>
                    {VI_STRINGS.settings.historyTitle} ({history.length})
                  </AppText>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={VI_STRINGS.settings.clearHistoryButton}
                    onPress={clearHistory}
                    style={styles.textActionBtn}
                  >
                    <Ionicons name="trash-outline" size={14} color={theme.colors.danger} />
                    <AppText variant="caption" weight="600" color={theme.colors.danger}>
                      Xóa
                    </AppText>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {/* Cảnh báo miễn trừ 113/115 */}
            <View style={styles.disclaimerBox}>
              <Ionicons name="warning-outline" size={14} color={theme.colors.danger} />
              <AppText variant="caption" weight="500" color={theme.colors.danger} style={{ flex: 1 }}>
                {VI_STRINGS.settings.emergencyDisclaimer}
              </AppText>
            </View>
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
    gap: 12,
    paddingBottom: 104, // accommodate Floating Island Dock
  },
  groupWrapper: {
    gap: 6,
  },
  groupLabel: {
    paddingHorizontal: 4,
    letterSpacing: 0.4,
    fontSize: 11,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 10,
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
    gap: 8,
  },
  genderSegmentedRow: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 14,
    gap: 4,
  },
  genderBtn: {
    flex: 1,
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
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
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  switchLabelCol: {
    flex: 1,
    gap: 2,
  },
  compactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  emergencyTriggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
  },
  compactInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 56,
    textAlignVertical: 'top',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  textActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tipText: {
    fontSize: 11,
    lineHeight: 16,
  },
  historyBox: {
    paddingTop: 8,
    borderTopWidth: 1,
    gap: 6,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
});
