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
        style={[
          styles.button,
          {
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: theme.sosColors.bg,
            borderWidth: 2,
            borderColor: '#FFFFFF',
          },
        ]}
      >
        <AppText variant="label" bold color={theme.sosColors.text}>
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
    shadowColor: '#B91C1C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
