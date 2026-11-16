import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { VI_STRINGS } from '../../core/i18n/vi.ts';
import { AppText, useAppTheme } from '../../core/theme/ThemeProvider.tsx';
import { useSosStore } from './useSosStore.ts';

export function SosButton(): React.ReactElement {
  const theme = useAppTheme();
  const state = useSosStore((s) => s.state);
  const progress = useSosStore((s) => s.progress);
  const hint = useSosStore((s) => s.hint);
  const pressIn = useSosStore((s) => s.pressIn);
  const tick = useSosStore((s) => s.tick);
  const pressOut = useSosStore((s) => s.pressOut);

  useEffect(() => {
    if (state !== 'arming') return;
    const id = setInterval(() => {
      tick(Date.now());
    }, 50);
    return () => clearInterval(id);
  }, [state, tick]);

  useEffect(() => {
    if (state === 'active') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
  }, [state]);

  const pct = Math.round(progress * 100);

  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={VI_STRINGS.sos.buttonA11y}
        accessibilityHint={hint ?? VI_STRINGS.sos.holdHint}
        testID="sos-button"
        onPressIn={() => pressIn(Date.now())}
        onPressOut={() => pressOut()}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: theme.sosColors.bg,
            transform: [{ scale: pressed ? 0.95 : 1 }],
          },
        ]}
      >
        <AppText variant="caption" weight="700" color={theme.sosColors.text}>
          {state === 'arming' ? `${pct}%` : VI_STRINGS.sos.buttonLabel}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
