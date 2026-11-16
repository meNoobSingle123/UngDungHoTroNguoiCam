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
      ? '#10B981'
      : statusLight === 'attention'
        ? '#F59E0B'
        : '#EF4444';

  const statusBg = highContrast
    ? theme.colors.surface
    : statusLight === 'ready'
      ? '#ECFDF5'
      : statusLight === 'attention'
        ? '#FFFBEB'
        : '#FEF2F2';

  const statusBorder = highContrast
    ? theme.colors.border
    : statusLight === 'ready'
      ? '#A7F3D0'
      : statusLight === 'attention'
        ? '#FDE68A'
        : '#FECACA';

  const statusTextColor = highContrast
    ? theme.colors.text
    : statusLight === 'ready'
      ? '#065F46'
      : statusLight === 'attention'
        ? '#92400E'
        : '#991B1B';

  const statusText = VI_STRINGS.statusLight[statusLight];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.bg,
        },
      ]}
    >
      <View
        style={[
          styles.row,
          {
            minHeight: 52,
            paddingHorizontal: 16,
            paddingVertical: 4,
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
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: dotColor,
              },
            ]}
          />
          <AppText
            variant="caption"
            weight="600"
            color={statusTextColor}
          >
            {statusText}
          </AppText>
        </View>

        <AppText
          variant="title"
          weight="700"
          numberOfLines={1}
          style={styles.title}
        >
          {title}
        </AppText>

        <SosButton />
      </View>

      {sosHint ? (
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
    paddingBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
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
    letterSpacing: -0.3,
  },
  hintContainer: {
    paddingHorizontal: 16,
    paddingBottom: 6,
    alignItems: 'center',
  },
});
