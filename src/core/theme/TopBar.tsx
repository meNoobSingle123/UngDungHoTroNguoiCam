import React from 'react';
import { StyleSheet, View } from 'react-native';
import { VI_STRINGS } from '../i18n/vi.ts';
import { useSystemStore } from '../store/systemStatus.ts';
import { SosButton } from '../../features/sos/SosButton.tsx';
import { useSosStore } from '../../features/sos/useSosStore.ts';
import { AppText, useAppTheme } from './ThemeProvider.tsx';

export interface TopBarProps {
  title: string;
}

export function TopBar({ title }: TopBarProps): React.ReactElement {
  const theme = useAppTheme();
  const statusLight = useSystemStore((s) => s.statusLight);
  const highContrast = useSystemStore((s) => s.highContrast);
  const sosHint = useSosStore((s) => s.hint);

  const dotColor =
    statusLight === 'ready'
      ? theme.colors.success
      : statusLight === 'attention'
        ? theme.colors.warning
        : theme.colors.danger;

  const statusBg = highContrast
    ? theme.colors.surface
    : statusLight === 'ready'
      ? '#DCFCE7'
      : statusLight === 'attention'
        ? '#FEF3C7'
        : '#FEE2E2';

  const statusBorder = highContrast
    ? theme.colors.border
    : statusLight === 'ready'
      ? '#86EFAC'
      : statusLight === 'attention'
        ? '#FDE68A'
        : '#FCA5A5';

  const statusText = VI_STRINGS.statusLight[statusLight];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.row,
          {
            minHeight: theme.dimensions.topBarHeight,
            paddingHorizontal: theme.spacing.md,
          },
        ]}
      >
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: statusBg,
              borderColor: statusBorder,
            },
          ]}
          accessible
          accessibilityLabel={statusText}
        >
          <View
            style={[
              styles.dot,
              {
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: dotColor,
              },
            ]}
          />
          <AppText
            variant="label"
            bold
            color={highContrast ? theme.colors.text : theme.colors.textMuted}
          >
            {statusText}
          </AppText>
        </View>

        <AppText variant="title" bold numberOfLines={1} style={styles.title}>
          {title}
        </AppText>

        <SosButton />
      </View>

      {sosHint ? (
        <View style={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.xs }}>
          <AppText variant="label" bold color={theme.colors.warning}>
            {sosHint}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  dot: {},
  title: {
    flex: 1,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
});
