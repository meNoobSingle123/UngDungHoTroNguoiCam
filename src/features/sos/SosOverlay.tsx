import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { VI_STRINGS } from '../../core/i18n/vi.ts';
import { useSystemStore } from '../../core/store/systemStatus.ts';
import { AppText, useAppTheme } from '../../core/theme/ThemeProvider.tsx';
import { SOS_FLASH_INTERVAL_MS } from './sosMachine.ts';
import { useSosStore } from './useSosStore.ts';

export function SosOverlay(): React.ReactElement | null {
  const theme = useAppTheme();
  const state = useSosStore((s) => s.state);
  const stop = useSosStore((s) => s.stop);
  const emergencyInfo = useSystemStore((s) => s.emergencyInfo);
  const [invertPhase, setInvertPhase] = useState(false);

  const active = state === 'active';

  useEffect(() => {
    if (!active) {
      setInvertPhase(false);
      return;
    }
    const id = setInterval(() => {
      setInvertPhase((prev) => !prev);
    }, SOS_FLASH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [active]);

  if (!active) {
    return null;
  }

  const bgColor = invertPhase ? theme.sosColors.flashAltBg : theme.sosColors.bg;
  const fgColor = invertPhase ? theme.sosColors.flashAltText : theme.sosColors.text;

  return (
    <Modal visible animationType="none" transparent={false}>
      <View
        testID="sos-overlay"
        style={[
          styles.container,
          {
            backgroundColor: bgColor,
            padding: theme.spacing.xl,
            gap: theme.spacing.lg,
          },
        ]}
      >
        <AppText
          variant="display"
          bold
          color={fgColor}
          style={styles.headline}
        >
          {VI_STRINGS.sos.activeHeadline}
        </AppText>

        <View
          style={[
            styles.infoBox,
            {
              borderColor: fgColor,
              borderRadius: theme.radii.card,
              padding: theme.spacing.lg,
            },
          ]}
        >
          <AppText variant="body" bold color={fgColor}>
            {VI_STRINGS.sos.emergencyInfoPrefix}
          </AppText>
          <AppText variant="body" color={fgColor}>
            {emergencyInfo.trim() || VI_STRINGS.sos.noEmergencyInfo}
          </AppText>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={VI_STRINGS.sos.stopButtonA11y}
          testID="sos-stop-button"
          onPress={stop}
          style={[
            styles.stopButton,
            {
              minHeight: theme.dimensions.sosStopMinHeight,
              borderRadius: theme.radii.button,
              backgroundColor: fgColor,
            },
          ]}
        >
          <AppText variant="title" bold color={bgColor}>
            {VI_STRINGS.sos.stopButtonLabel}
          </AppText>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 48,
  },
  headline: {
    fontSize: 36,
    textAlign: 'center',
  },
  infoBox: {
    borderWidth: 2,
    gap: 8,
  },
  stopButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});

