import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useCardsStore } from '../src/core/db/cardsStorage.ts';
import { useSystemStore } from '../src/core/store/systemStatus.ts';
import { ThemeProvider, useAppTheme } from '../src/core/theme/ThemeProvider.tsx';
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

  return (
    <>
      <StatusBar style={theme.isHighContrast ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
      <OnboardingModal
        visible={hydrated && onboardingStatus === 'pending'}
        onClose={() => {}}
      />
      <SosOverlay />
    </>
  );
}

export default function RootLayout(): React.ReactElement {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootShell />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
