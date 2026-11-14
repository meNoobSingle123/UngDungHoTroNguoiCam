import React, { useState } from 'react';
import { Linking, Modal, PermissionsAndroid, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VI_STRINGS } from '../../core/i18n/vi.ts';
import { useSystemStore, type PermissionCheckState } from '../../core/store/systemStatus.ts';
import { AppText, useAppTheme } from '../../core/theme/ThemeProvider.tsx';
import { hasVietnameseVoice } from '../../core/tts/speechService.ts';

export interface OnboardingModalProps {
  visible: boolean;
  onClose: () => void;
}

export function OnboardingModal({
  visible,
  onClose,
}: OnboardingModalProps): React.ReactElement {
  const theme = useAppTheme();
  const permissionState = useSystemStore((s) => s.permissionState);
  const setPermissionState = useSystemStore((s) => s.setPermissionState);
  const setOnboardingStatus = useSystemStore((s) => s.setOnboardingStatus);
  const setStatusLight = useSystemStore((s) => s.setStatusLight);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [voiceReady, setVoiceReady] = useState<boolean | null>(null);

  const handleRequestPermissions = async () => {
    if (Platform.OS !== 'android') {
      setPermissionState('granted');
      return;
    }
    try {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ]);
      const values = Object.values(results);
      let nextState: PermissionCheckState = 'granted';
      if (values.includes(PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN)) {
        nextState = 'never_ask_again';
        setStatusLight('attention');
      } else if (values.includes(PermissionsAndroid.RESULTS.DENIED)) {
        nextState = 'denied';
        setStatusLight('attention');
      }
      setPermissionState(nextState);
    } catch {
      setPermissionState('denied');
    }
  };

  const handleCheckVoice = async () => {
    const ok = await hasVietnameseVoice();
    setVoiceReady(ok);
    if (!ok) {
      setStatusLight('attention');
    }
  };

  const handleSkip = () => {
    setOnboardingStatus('skipped');
    setStep(1);
    onClose();
  };

  const handleFinish = () => {
    setOnboardingStatus('completed');
    setStep(1);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleSkip}>
      <SafeAreaView
        testID="onboarding-modal"
        style={[
          styles.root,
          {
            backgroundColor: theme.colors.bg,
            padding: theme.spacing.lg,
          },
        ]}
      >
        <View style={styles.topRow}>
          <AppText variant="label" bold color={theme.colors.textMuted}>
            {VI_STRINGS.onboarding.stepLabel} {step}/3
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={VI_STRINGS.onboarding.skip}
            testID="onboarding-skip-btn"
            onPress={handleSkip}
            style={[
              styles.skipBtn,
              {
                minHeight: theme.dimensions.minTouchTarget,
                borderRadius: theme.radii.button,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <AppText variant="label" bold>
              {VI_STRINGS.onboarding.skip}
            </AppText>
          </Pressable>
        </View>

        <View
          style={[
            styles.contentCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.card,
              padding: theme.spacing.lg,
            },
          ]}
        >
          {step === 1 ? (
            <>
              <AppText variant="display" bold>
                {VI_STRINGS.onboarding.step1Title}
              </AppText>
              <AppText variant="body" color={theme.colors.textMuted}>
                {VI_STRINGS.onboarding.step1Body}
              </AppText>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <AppText variant="display" bold>
                {VI_STRINGS.onboarding.step2Title}
              </AppText>
              <AppText variant="body" color={theme.colors.textMuted}>
                {VI_STRINGS.onboarding.step2Body}
              </AppText>
              <AppText
                variant="body"
                bold
                testID="onboarding-permission-status"
                color={
                  permissionState === 'granted'
                    ? theme.colors.success
                    : permissionState === 'unknown'
                      ? theme.colors.text
                      : theme.colors.warning
                }
              >
                {VI_STRINGS.onboarding.permissionLabels[permissionState]}
              </AppText>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={VI_STRINGS.onboarding.requestPermissions}
                testID="onboarding-request-perm-btn"
                onPress={handleRequestPermissions}
                style={[
                  styles.primaryBtn,
                  {
                    minHeight: theme.dimensions.primaryActionMinHeight,
                    borderRadius: theme.radii.button,
                    backgroundColor: theme.colors.primary,
                  },
                ]}
              >
                <AppText variant="body" bold color={theme.colors.onPrimary}>
                  {VI_STRINGS.onboarding.requestPermissions}
                </AppText>
              </Pressable>

              {permissionState === 'never_ask_again' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={VI_STRINGS.onboarding.openSystemSettings}
                  onPress={() => Linking.openSettings().catch(() => {})}
                  style={[
                    styles.secondaryBtn,
                    {
                      minHeight: theme.dimensions.minTouchTarget,
                      borderRadius: theme.radii.button,
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.bg,
                    },
                  ]}
                >
                  <AppText variant="label" bold>
                    {VI_STRINGS.onboarding.openSystemSettings}
                  </AppText>
                </Pressable>
              ) : null}
            </>
          ) : null}

          {step === 3 ? (
            <>
              <AppText variant="display" bold>
                {VI_STRINGS.onboarding.step3Title}
              </AppText>
              <AppText variant="body" color={theme.colors.textMuted}>
                {VI_STRINGS.onboarding.step3Body}
              </AppText>
              {voiceReady !== null ? (
                <AppText
                  variant="body"
                  bold
                  color={voiceReady ? theme.colors.success : theme.colors.warning}
                >
                  {voiceReady
                    ? VI_STRINGS.onboarding.voiceReady
                    : VI_STRINGS.onboarding.voiceMissing}
                </AppText>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={VI_STRINGS.onboarding.checkVoice}
                testID="onboarding-check-voice-btn"
                onPress={handleCheckVoice}
                style={[
                  styles.secondaryBtn,
                  {
                    minHeight: theme.dimensions.primaryActionMinHeight,
                    borderRadius: theme.radii.button,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.bg,
                  },
                ]}
              >
                <AppText variant="body" bold>
                  {VI_STRINGS.onboarding.checkVoice}
                </AppText>
              </Pressable>
            </>
          ) : null}
        </View>

        <View style={styles.footerRow}>
          {step > 1 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VI_STRINGS.onboarding.back}
              onPress={() => setStep((s) => (s === 3 ? 2 : 1))}
              style={[
                styles.secondaryBtn,
                {
                  flex: 1,
                  minHeight: theme.dimensions.primaryActionMinHeight,
                  borderRadius: theme.radii.button,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                },
              ]}
            >
              <AppText variant="body" bold>
                {VI_STRINGS.onboarding.back}
              </AppText>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              step === 3 ? VI_STRINGS.onboarding.finish : VI_STRINGS.onboarding.next
            }
            testID="onboarding-next-btn"
            onPress={() => {
              if (step < 3) {
                setStep((s) => (s === 1 ? 2 : 3));
              } else {
                handleFinish();
              }
            }}
            style={[
              styles.primaryBtn,
              {
                flex: 1.5,
                minHeight: theme.dimensions.primaryActionMinHeight,
                borderRadius: theme.radii.button,
                backgroundColor: theme.colors.primary,
              },
            ]}
          >
            <AppText variant="body" bold color={theme.colors.onPrimary}>
              {step === 3 ? VI_STRINGS.onboarding.finish : VI_STRINGS.onboarding.next}
            </AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipBtn: {
    borderWidth: 1,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentCard: {
    borderWidth: 1,
    gap: 14,
  },
  primaryBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  secondaryBtn: {
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
  },
});

