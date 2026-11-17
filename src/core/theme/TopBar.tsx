import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SosButton } from '../../features/sos/SosButton.tsx';
import { useSosStore } from '../../features/sos/useSosStore.ts';
import { AppText, useAppTheme } from './ThemeProvider.tsx';

export interface TopBarProps {
  title: string;
  showSos?: boolean;
}

export function TopBar({ title, showSos = false }: TopBarProps): React.ReactElement {
  const theme = useAppTheme();
  const sosHint = useSosStore((s) => s.hint);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <View style={styles.row}>
        {showSos ? <View style={styles.spacer} /> : null}

        <AppText
          variant="title"
          weight="700"
          numberOfLines={1}
          style={styles.title}
        >
          {title}
        </AppText>

        {showSos ? <SosButton /> : null}
      </View>

      {showSos && sosHint ? (
        <View style={styles.hintContainer}>
          <AppText variant="caption" weight="600" color={theme.colors.warning}>
            {sosHint}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 4,
    paddingTop: 2,
  },
  spacer: {
    width: 44,
    height: 44,
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  hintContainer: {
    paddingHorizontal: 16,
    paddingBottom: 6,
    alignItems: 'center',
  },
});
