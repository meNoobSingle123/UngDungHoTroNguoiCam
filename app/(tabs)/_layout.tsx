import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { VI_STRINGS } from '../../src/core/i18n/vi.ts';
import { useAppTheme } from '../../src/core/theme/ThemeProvider.tsx';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export default function TabsLayout(): React.ReactElement {
  const theme = useAppTheme();

  const renderIcon = (focusedIcon: IoniconsName, defaultIcon: IoniconsName) =>
    ({ focused, size }: { focused: boolean; color: unknown; size: number }) => (
      <Ionicons
        name={focused ? focusedIcon : defaultIcon}
        size={size || 24}
        color={focused ? theme.colors.primary : theme.colors.textMuted}
      />
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          height: theme.dimensions.bottomTabsHeight,
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: theme.fonts.label,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: VI_STRINGS.tabs.communicate,
          tabBarIcon: renderIcon('chatbubbles', 'chatbubbles-outline'),
        }}
      />
      <Tabs.Screen
        name="cards"
        options={{
          title: VI_STRINGS.tabs.cards,
          tabBarIcon: renderIcon('albums', 'albums-outline'),
        }}
      />
      <Tabs.Screen
        name="dictionary"
        options={{
          title: VI_STRINGS.tabs.dictionary,
          tabBarIcon: renderIcon('book', 'book-outline'),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: VI_STRINGS.tabs.settings,
          tabBarIcon: renderIcon('settings', 'settings-outline'),
        }}
      />
    </Tabs>
  );
}
