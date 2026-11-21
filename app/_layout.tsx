import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCardsStore } from '../src/core/db/cardsStorage.ts';
import { useSystemStore } from '../src/core/store/systemStatus.ts';
import { AppText, ThemeProvider, useAppTheme } from '../src/core/theme/ThemeProvider.tsx';
import { hasVietnameseVoice } from '../src/core/tts/speechService.ts';
import { OnboardingModal } from '../src/features/onboarding/OnboardingModal.tsx';
import { SosOverlay } from '../src/features/sos/SosOverlay.tsx';

declare const __DEV__: boolean | undefined;

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootShell(): React.ReactElement {
  const theme = useAppTheme();
  const hydrateSqlite = useCardsStore((s) => s.hydrateSqlite);
  const setStatusLight = useSystemStore((s) => s.setStatusLight);
  const onboardingStatus = useSystemStore((s) => s.onboardingStatus);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      try {
        const DevMenu = require('expo-dev-menu');
        DevMenu.setToolsButtonVisible?.(true);
      } catch {}
    }
  }, []);

  useEffect(() => {
    Promise.all([
      hydrateSqlite().catch(() => {}),
      hasVietnameseVoice()
        .then((ok) => {
          if (!ok) {
            setStatusLight('attention');
          }
        })
        .catch(() => {}),
    ]).finally(() => {
      setHydrated(true);
      SplashScreen.hideAsync().catch(() => {});
    });
  }, [hydrateSqlite, setStatusLight]);

  if (!hydrated) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.isHighContrast ? theme.colors.bg : '#F8FAFC' },
        ]}
      >
        <StatusBar style={theme.isHighContrast ? 'light' : 'dark'} />
        <View style={styles.loadingCard}>
          <View
            style={[
              styles.logoCircle,
              {
                backgroundColor: theme.isHighContrast ? theme.colors.surface : '#EFF6FF',
                borderColor: theme.isHighContrast ? theme.colors.border : '#BFDBFE',
              },
            ]}
          >
            <Ionicons name="hand-left" size={50} color={theme.colors.primary} />
          </View>
          <AppText variant="title" weight="700" color={theme.colors.text}>
            HandTalk
          </AppText>
          <AppText variant="caption" weight="500" color={theme.colors.textMuted}>
            Giao tiếp ký hiệu 2 chiều
          </AppText>
          <ActivityIndicator
            size="large"
            color={theme.colors.primary}
            style={{ marginTop: 24 }}
          />
          <AppText
            variant="caption"
            weight="600"
            color={theme.colors.primary}
            style={{ marginTop: 12 }}
          >
            Đang khởi tạo hệ thống...
          </AppText>
        </View>
      </View>
    );
  }

  return (
    <>
      <StatusBar style={theme.isHighContrast ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="word-detail"
          options={{
            animation: 'slide_from_right',
          }}
        />
      </Stack>
      <OnboardingModal
        visible={hydrated && onboardingStatus === 'pending'}
        onClose={() => {}}
      />
      <SosOverlay />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
});

export default function RootLayout(): React.ReactElement {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootShell />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
