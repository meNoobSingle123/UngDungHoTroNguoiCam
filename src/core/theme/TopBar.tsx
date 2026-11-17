import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, useAppTheme } from './ThemeProvider.tsx';

export interface TopBarProps {
  title: string;
}

export function TopBar({ title }: TopBarProps): React.ReactElement {
  const theme = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <View style={styles.row}>
        <AppText
          variant="title"
          weight="700"
          numberOfLines={1}
          style={styles.title}
        >
          {title}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 4,
    paddingTop: 2,
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
});
