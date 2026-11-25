import React, { useState } from 'react';
import {
  Modal,
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
  const userAccount = useSystemStore((s) => s.userAccount);
  const accountEnabled = useSystemStore((s) => s.accountEnabled);

  const setFontLevel = useSystemStore((s) => s.setFontLevel);
  const setHighContrast = useSystemStore((s) => s.setHighContrast);
  const setSpeechRate = useSystemStore((s) => s.setSpeechRate);
  const setVoiceGender = useSystemStore((s) => s.setVoiceGender);
  const setEmergencyInfo = useSystemStore((s) => s.setEmergencyInfo);
  const setStatusLight = useSystemStore((s) => s.setStatusLight);
  const clearHistory = useSystemStore((s) => s.clearHistory);
  const loginWithGoogle = useSystemStore((s) => s.loginWithGoogle);
  const loginWithEmail = useSystemStore((s) => s.loginWithEmail);
  const registerUser = useSystemStore((s) => s.registerUser);
  const logoutUser = useSystemStore((s) => s.logoutUser);

  const [voiceStatus, setVoiceStatus] = useState<string>('');
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const runSystemCheck = async () => {
    const ok = await hasVietnameseVoice();
    setStatusLight(ok ? 'ready' : 'attention');
    setVoiceStatus(ok ? 'Giọng đọc hoạt động tốt' : 'Cần cài giọng tiếng Việt');
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

        {/* Nhóm 0: Tài khoản & Đồng bộ */}
        <View style={styles.groupWrapper}>
          <AppText variant="caption" weight="600" color={theme.colors.textMuted} style={styles.groupLabel}>
            {VI_STRINGS.settings.accountTitle.toUpperCase()}
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
            <View style={styles.accountRow}>
              <View
                style={[
                  styles.avatarBox,
                  {
                    backgroundColor: userAccount.isLoggedIn
                      ? userAccount.provider === 'google'
                        ? '#FEF2F2'
                        : highContrast ? theme.colors.bg : '#EFF6FF'
                      : highContrast ? theme.colors.bg : '#F1F5F9',
                  },
                ]}
              >
                <Ionicons
                  name={
                    userAccount.isLoggedIn
                      ? userAccount.provider === 'google'
                        ? 'logo-google'
                        : 'person'
                      : 'person-outline'
                  }
                  size={20}
                  color={
                    userAccount.isLoggedIn
                      ? userAccount.provider === 'google'
                        ? '#EA4335'
                        : theme.colors.primary
                      : theme.colors.textMuted
                  }
                />
              </View>

              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <AppText variant="subhead" weight="700">
                    {userAccount.isLoggedIn
                      ? userAccount.displayName || userAccount.email || VI_STRINGS.settings.accountLoggedInTitle
                      : VI_STRINGS.settings.accountGuestTitle}
                  </AppText>
                  {userAccount.isLoggedIn ? (
                    <View
                      style={[
                        styles.providerPill,
                        {
                          backgroundColor:
                            userAccount.provider === 'google' ? '#FEE2E2' : '#DBEAFE',
                        },
                      ]}
                    >
                      <AppText
                        variant="caption"
                        weight="700"
                        color={userAccount.provider === 'google' ? '#DC2626' : '#2563EB'}
                        style={{ fontSize: 9 }}
                      >
                        {userAccount.provider === 'google' ? 'GOOGLE' : 'EMAIL'}
                      </AppText>
                    </View>
                  ) : null}
                </View>

                <AppText variant="caption" weight="500" color={theme.colors.textMuted}>
                  {userAccount.isLoggedIn
                    ? `${userAccount.email ?? 'nguoidung@example.com'} · Đã đồng bộ mây`
                    : VI_STRINGS.settings.accountGuestDesc}
                </AppText>
              </View>

              {accountEnabled ? (
                userAccount.isLoggedIn ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={VI_STRINGS.settings.accountLogoutButton}
                    onPress={() => setLogoutModalOpen(true)}
                    style={({ pressed }) => [
                      styles.logoutSmallBtn,
                      {
                        borderColor: highContrast ? theme.colors.danger : '#FECACA',
                        backgroundColor: highContrast ? theme.colors.bg : '#FEF2F2',
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Ionicons name="log-out-outline" size={14} color={theme.colors.danger} />
                    <AppText variant="caption" weight="600" color={theme.colors.danger}>
                      {VI_STRINGS.settings.accountLogoutButton}
                    </AppText>
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={VI_STRINGS.settings.accountLoginButton}
                    onPress={() => {
                      setAuthError(null);
                      setAuthMode('login');
                      setLoginModalOpen(true);
                    }}
                    style={({ pressed }) => [
                      styles.loginSmallBtn,
                      {
                        backgroundColor: theme.colors.primary,
                        opacity: pressed ? 0.88 : 1,
                      },
                    ]}
                  >
                    <Ionicons name="log-in-outline" size={14} color={theme.colors.onPrimary} />
                    <AppText variant="caption" weight="600" color={theme.colors.onPrimary}>
                      {VI_STRINGS.settings.accountLoginButton}
                    </AppText>
                  </Pressable>
                )
              ) : (
                <View
                  style={[
                    styles.offlinePill,
                    {
                      backgroundColor: highContrast ? theme.colors.bg : '#F1F5F9',
                      borderColor: highContrast ? theme.colors.border : '#E2E8F0',
                    },
                  ]}
                >
                  <Ionicons name="cloud-offline-outline" size={14} color={theme.colors.textMuted} />
                  <AppText variant="caption" weight="600" color={theme.colors.textMuted}>
                    {VI_STRINGS.settings.accountOfflineBadge}
                  </AppText>
                </View>
              )}
            </View>

            {!accountEnabled ? (
              <View
                style={[
                  styles.accountNoticeRow,
                  { borderTopColor: highContrast ? theme.colors.border : '#F1F5F9' },
                ]}
              >
                <Ionicons name="information-circle-outline" size={14} color={theme.colors.textMuted} />
                <AppText variant="caption" weight="500" color={theme.colors.textMuted} style={{ flex: 1 }}>
                  {VI_STRINGS.settings.accountComingSoonNotice}
                </AppText>
              </View>
            ) : null}
          </View>
        </View>

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
                styles.fontGridRow,
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
                  fontSize: theme.fonts.label,
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
                {voiceStatus || (statusLight === 'ready' ? 'Hệ thống giọng đọc hoạt động tốt' : 'Cần kiểm tra giọng đọc')}
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
              {VI_STRINGS.settings.batteryOptimizationTip}
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

      {/* Modal Đăng nhập / Đăng ký (chỉ bật khi accountEnabled = true) */}
      {accountEnabled ? (
        <Modal
          visible={loginModalOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setLoginModalOpen(false)}
        >
        <View style={styles.sheetBackdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={VI_STRINGS.settings.accountCancel}
            style={StyleSheet.absoluteFill}
            onPress={() => setLoginModalOpen(false)}
          />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: highContrast ? theme.colors.surface : '#FFFFFF',
                borderColor: highContrast ? theme.colors.border : '#E2E8F0',
              },
            ]}
          >
            <View style={styles.sheetHandleBar} />

            {/* Header & Tabs */}
            <View style={{ gap: 8 }}>
              <AppText variant="title" weight="700">
                {VI_STRINGS.settings.accountLoginModalTitle}
              </AppText>
              <AppText variant="caption" weight="500" color={theme.colors.textMuted}>
                {VI_STRINGS.settings.accountLoginModalDesc}
              </AppText>

              {/* Segmented Switch: Đăng nhập / Đăng ký */}
              <View
                style={[
                  styles.authTabRow,
                  { backgroundColor: highContrast ? theme.colors.bg : '#F1F5F9' },
                ]}
              >
                {(['login', 'register'] as const).map((mode) => {
                  const active = authMode === mode;
                  const label =
                    mode === 'login'
                      ? VI_STRINGS.settings.accountTabLogin
                      : VI_STRINGS.settings.accountTabRegister;
                  return (
                    <Pressable
                      key={mode}
                      accessibilityRole="button"
                      accessibilityLabel={label}
                      onPress={() => {
                        setAuthError(null);
                        setAuthMode(mode);
                      }}
                      style={[
                        styles.authTabBtn,
                        active
                          ? highContrast
                            ? { backgroundColor: theme.colors.primary }
                            : styles.segmentBtnActiveLight
                          : undefined,
                      ]}
                    >
                      <AppText
                        variant="caption"
                        weight={active ? '700' : '600'}
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

            {/* Nút Tiếp tục với Google (Google Sign-In Chuẩn) */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.settings.accountGoogleButton}
              onPress={() => {
                loginWithGoogle('nguoidung.google@gmail.com', 'Người dùng Google');
                setLoginModalOpen(false);
              }}
              style={({ pressed }) => [
                styles.googleBtn,
                {
                  backgroundColor: highContrast ? theme.colors.bg : '#FFFFFF',
                  borderColor: highContrast ? theme.colors.border : '#CBD5E1',
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
            >
              <Ionicons name="logo-google" size={18} color="#EA4335" />
              <AppText variant="subhead" weight="700" color={theme.colors.text}>
                {VI_STRINGS.settings.accountGoogleButton}
              </AppText>
            </Pressable>

            {/* Divider Phân cách */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: highContrast ? theme.colors.border : '#E2E8F0' }]} />
              <AppText variant="caption" weight="600" color={theme.colors.textMuted} style={styles.dividerText}>
                {VI_STRINGS.settings.accountDividerOr}
              </AppText>
              <View style={[styles.dividerLine, { backgroundColor: highContrast ? theme.colors.border : '#E2E8F0' }]} />
            </View>

            {/* Thông báo lỗi nếu có */}
            {authError ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={16} color={theme.colors.danger} />
                <AppText variant="caption" weight="600" color={theme.colors.danger} style={{ flex: 1 }}>
                  {authError}
                </AppText>
              </View>
            ) : null}

            {/* Form Fields */}
            <View style={{ gap: 10 }}>
              {authMode === 'register' ? (
                <View style={{ gap: 4 }}>
                  <AppText variant="caption" weight="600" color={theme.colors.textMuted}>
                    {VI_STRINGS.settings.accountFullNameLabel}
                  </AppText>
                  <TextInput
                    allowFontScaling={false}
                    value={regName}
                    onChangeText={setRegName}
                    placeholder={VI_STRINGS.settings.accountFullNamePlaceholder}
                    placeholderTextColor={theme.colors.textMuted}
                    style={[
                      styles.compactInput,
                      {
                        color: theme.colors.text,
                        backgroundColor: highContrast ? theme.colors.bg : '#F8FAFC',
                        borderColor: highContrast ? theme.colors.border : '#E2E8F0',
                      },
                    ]}
                  />
                </View>
              ) : null}

              <View style={{ gap: 4 }}>
                <AppText variant="caption" weight="600" color={theme.colors.textMuted}>
                  {VI_STRINGS.settings.accountEmailLabel}
                </AppText>
                <TextInput
                  allowFontScaling={false}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                  placeholder={VI_STRINGS.settings.accountEmailPlaceholder}
                  placeholderTextColor={theme.colors.textMuted}
                  style={[
                    styles.compactInput,
                    {
                      color: theme.colors.text,
                      backgroundColor: highContrast ? theme.colors.bg : '#F8FAFC',
                      borderColor: highContrast ? theme.colors.border : '#E2E8F0',
                    },
                  ]}
                />
              </View>

              <View style={{ gap: 4 }}>
                <AppText variant="caption" weight="600" color={theme.colors.textMuted}>
                  {VI_STRINGS.settings.accountPasswordLabel}
                </AppText>
                <TextInput
                  allowFontScaling={false}
                  secureTextEntry
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                  placeholder={VI_STRINGS.settings.accountPasswordPlaceholder}
                  placeholderTextColor={theme.colors.textMuted}
                  style={[
                    styles.compactInput,
                    {
                      color: theme.colors.text,
                      backgroundColor: highContrast ? theme.colors.bg : '#F8FAFC',
                      borderColor: highContrast ? theme.colors.border : '#E2E8F0',
                    },
                  ]}
                />
              </View>

              {authMode === 'register' ? (
                <View style={{ gap: 4 }}>
                  <AppText variant="caption" weight="600" color={theme.colors.textMuted}>
                    {VI_STRINGS.settings.accountConfirmPasswordLabel}
                  </AppText>
                  <TextInput
                    allowFontScaling={false}
                    secureTextEntry
                    value={regConfirmPassword}
                    onChangeText={setRegConfirmPassword}
                    placeholder={VI_STRINGS.settings.accountConfirmPasswordPlaceholder}
                    placeholderTextColor={theme.colors.textMuted}
                    style={[
                      styles.compactInput,
                      {
                        color: theme.colors.text,
                        backgroundColor: highContrast ? theme.colors.bg : '#F8FAFC',
                        borderColor: highContrast ? theme.colors.border : '#E2E8F0',
                      },
                    ]}
                  />
                </View>
              ) : null}
            </View>

            {/* Action Buttons */}
            <View style={{ gap: 8, marginTop: 4 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  authMode === 'login'
                    ? VI_STRINGS.settings.accountSubmitLogin
                    : VI_STRINGS.settings.accountSubmitRegister
                }
                onPress={() => {
                  if (authMode === 'register') {
                    if (!loginEmail.trim() || !loginPassword.trim()) {
                      setAuthError(VI_STRINGS.settings.accountErrorEmpty);
                      return;
                    }
                    if (loginPassword.length < 6) {
                      setAuthError(VI_STRINGS.settings.accountErrorPasswordShort);
                      return;
                    }
                    if (loginPassword !== regConfirmPassword) {
                      setAuthError(VI_STRINGS.settings.accountErrorPasswordMismatch);
                      return;
                    }
                    registerUser(loginEmail, regName);
                    setLoginModalOpen(false);
                  } else {
                    if (!loginEmail.trim()) {
                      setAuthError(VI_STRINGS.settings.accountErrorEmpty);
                      return;
                    }
                    loginWithEmail(loginEmail);
                    setLoginModalOpen(false);
                  }
                }}
                style={({ pressed }) => [
                  styles.primaryModalBtn,
                  {
                    backgroundColor: theme.colors.primary,
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}
              >
                <Ionicons
                  name={authMode === 'login' ? 'log-in-outline' : 'person-add-outline'}
                  size={18}
                  color={theme.colors.onPrimary}
                />
                <AppText variant="subhead" weight="700" color={theme.colors.onPrimary}>
                  {authMode === 'login'
                    ? VI_STRINGS.settings.accountSubmitLogin
                    : VI_STRINGS.settings.accountSubmitRegister}
                </AppText>
              </Pressable>

              {authMode === 'login' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={VI_STRINGS.settings.accountQuickLogin}
                  onPress={() => {
                    loginWithEmail('nguoidung.demo@handtalk.vn', 'Người dùng Thử nghiệm');
                    setLoginModalOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.secondaryModalBtn,
                    {
                      backgroundColor: highContrast ? theme.colors.bg : '#EFF6FF',
                      borderColor: highContrast ? theme.colors.border : '#DBEAFE',
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <Ionicons name="flash-outline" size={16} color={theme.colors.primary} />
                  <AppText variant="caption" weight="600" color={theme.colors.primary}>
                    {VI_STRINGS.settings.accountQuickLogin}
                  </AppText>
                </Pressable>
              ) : null}

              {/* Chuyển đổi qua lại giữa Đăng nhập và Đăng ký */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  authMode === 'login'
                    ? VI_STRINGS.settings.accountSwitchToRegister
                    : VI_STRINGS.settings.accountSwitchToLogin
                }
                onPress={() => {
                  setAuthError(null);
                  setAuthMode(authMode === 'login' ? 'register' : 'login');
                }}
                style={styles.switchModeBtn}
              >
                <AppText variant="caption" weight="600" color={theme.colors.primary}>
                  {authMode === 'login'
                    ? VI_STRINGS.settings.accountSwitchToRegister
                    : VI_STRINGS.settings.accountSwitchToLogin}
                </AppText>
              </Pressable>

              {/* Tiếp tục Ngoại tuyến (Khách) */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={VI_STRINGS.settings.accountContinueOffline}
                onPress={() => setLoginModalOpen(false)}
                style={styles.cancelModalBtn}
              >
                <AppText variant="caption" weight="500" color={theme.colors.textMuted}>
                  {VI_STRINGS.settings.accountContinueOffline}
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      ) : null}

      {/* Modal Đăng xuất với 3 lựa chọn theo chuẩn B-06 */}
      {logoutModalOpen && (
        <Modal
          visible={logoutModalOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setLogoutModalOpen(false)}
        >
        <View style={styles.sheetBackdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={VI_STRINGS.settings.logoutChoiceCancel}
            style={StyleSheet.absoluteFill}
            onPress={() => setLogoutModalOpen(false)}
          />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: highContrast ? theme.colors.surface : '#FFFFFF',
                borderColor: highContrast ? theme.colors.border : '#E2E8F0',
              },
            ]}
          >
            <View style={styles.sheetHandleBar} />
            <View style={{ gap: 4 }}>
              <AppText variant="title" weight="700">
                {VI_STRINGS.settings.logoutDialogTitle}
              </AppText>
              <AppText variant="caption" weight="500" color={theme.colors.textMuted}>
                {VI_STRINGS.settings.logoutDialogMessage}
              </AppText>
            </View>

            <View style={{ gap: 8 }}>
              {/* Lựa chọn 1: Đồng bộ rồi đăng xuất */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={VI_STRINGS.settings.logoutOptionSyncThenLogout}
                onPress={() => {
                  logoutUser();
                  setLogoutModalOpen(false);
                }}
                style={({ pressed }) => [
                  styles.logoutChoiceCard,
                  {
                    backgroundColor: highContrast ? theme.colors.bg : '#F8FAFC',
                    borderColor: highContrast ? theme.colors.border : '#E2E8F0',
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}
              >
                <Ionicons name="cloud-upload-outline" size={20} color={theme.colors.primary} />
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="subhead" weight="700" color={theme.colors.primary}>
                    {VI_STRINGS.settings.logoutOptionSyncThenLogout}
                  </AppText>
                  <AppText variant="caption" weight="500" color={theme.colors.textMuted}>
                    Tải toàn bộ thẻ và cài đặt lên máy chủ trước khi thoát
                  </AppText>
                </View>
              </Pressable>

              {/* Lựa chọn 2: Giữ dữ liệu trên máy */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={VI_STRINGS.settings.logoutOptionKeepLocal}
                onPress={() => {
                  logoutUser();
                  setLogoutModalOpen(false);
                }}
                style={({ pressed }) => [
                  styles.logoutChoiceCard,
                  {
                    backgroundColor: highContrast ? theme.colors.bg : '#F8FAFC',
                    borderColor: highContrast ? theme.colors.border : '#E2E8F0',
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}
              >
                <Ionicons name="phone-portrait-outline" size={20} color={theme.colors.text} />
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="subhead" weight="700">
                    {VI_STRINGS.settings.logoutOptionKeepLocal}
                  </AppText>
                  <AppText variant="caption" weight="500" color={theme.colors.textMuted}>
                    Giữ thẻ cá nhân và lịch sử hoạt động trên thiết bị này
                  </AppText>
                </View>
              </Pressable>

              {/* Lựa chọn 3: Xóa dữ liệu cá nhân trên máy */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={VI_STRINGS.settings.logoutOptionDiscardUnsynced}
                onPress={() => {
                  logoutUser();
                  setLogoutModalOpen(false);
                }}
                style={({ pressed }) => [
                  styles.logoutChoiceCard,
                  {
                    backgroundColor: highContrast ? theme.colors.bg : '#FEF2F2',
                    borderColor: highContrast ? theme.colors.danger : '#FECACA',
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}
              >
                <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="subhead" weight="700" color={theme.colors.danger}>
                    {VI_STRINGS.settings.logoutOptionDiscardUnsynced}
                  </AppText>
                  <AppText variant="caption" weight="500" color={theme.colors.textMuted}>
                    Chỉ giữ lại bộ thẻ mặc định của hệ thống
                  </AppText>
                </View>
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.settings.logoutChoiceCancel}
              onPress={() => setLogoutModalOpen(false)}
              style={styles.cancelModalBtn}
            >
              <AppText variant="caption" weight="600" color={theme.colors.textMuted}>
                {VI_STRINGS.settings.logoutChoiceCancel}
              </AppText>
            </Pressable>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 11,
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
    minHeight: 48,
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
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  logoutSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    gap: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 24,
  },
  sheetHandleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 4,
  },
  primaryModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
  },
  secondaryModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  cancelModalBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  logoutChoiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  providerPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  authTabRow: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 12,
    gap: 4,
    marginTop: 4,
  },
  authTabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  switchModeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  accountNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    marginTop: 6,
  },
});
