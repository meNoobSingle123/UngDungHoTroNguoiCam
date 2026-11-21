import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { VI_STRINGS } from '../../src/core/i18n/vi.ts';
import { useAppTheme } from '../../src/core/theme/ThemeProvider.tsx';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export default function TabsLayout(): React.ReactElement {
  const theme = useAppTheme();
  const highContrast = theme.isHighContrast;

  const renderIcon = (focusedIcon: IoniconsName, defaultIcon: IoniconsName) =>
    ({ focused, size }: { focused: boolean; size: number }) => {
      const iconColor = focused
        ? highContrast
          ? '#000000'
          : theme.colors.primary
        : theme.colors.textMuted;

      return (
        <View
          style={[
            styles.iconWrapper,
            focused && {
              backgroundColor: highContrast ? theme.colors.primary : '#EFF6FF',
            },
          ]}
        >
          <Ionicons
            name={focused ? focusedIcon : defaultIcon}
            size={size ? Math.min(size, 20) : 20}
            color={iconColor}
          />
        </View>
      );
    };

  return (
    <Tabs
      detachInactiveScreens={false}
      screenOptions={{
        headerShown: false,
        animation: 'none',
        lazy: false,
        sceneStyle: {
          backgroundColor: highContrast ? theme.colors.bg : '#F8FAFC',
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: [
          styles.floatingBar,
          {
            backgroundColor: highContrast ? theme.colors.surface : '#FFFFFF',
            borderColor: highContrast ? theme.colors.border : 'rgba(226, 232, 240, 0.8)',
          },
        ],
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.tabLabel,
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

const styles = StyleSheet.create({
  floatingBar: {
    position: 'absolute',
    bottom: 14,
    left: 16,
    right: 16,
    height: 68,
    borderRadius: 30,
    borderWidth: 1,
    paddingTop: 8,
    paddingBottom: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  tabItem: {
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 38,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});
