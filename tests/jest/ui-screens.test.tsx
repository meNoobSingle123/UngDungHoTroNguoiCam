import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { MockEngine } from '@sign/recognizer-mock';
import { MockDebugPanel } from '@sign/recognizer-mock/debug-panel';
import { SignCameraScreen } from '@sign/sign-ui/camera-screen';
import { VI_STRINGS } from '../../src/core/i18n/vi.ts';
import { useSystemStore } from '../../src/core/store/systemStatus.ts';
import { ThemeProvider } from '../../src/core/theme/ThemeProvider.tsx';
import { CameraModal } from '../../src/features/camera/CameraModal.tsx';
import { OnboardingModal } from '../../src/features/onboarding/OnboardingModal.tsx';
import CommunicateTab from '../../app/(tabs)/index.tsx';
import CardsTab from '../../app/(tabs)/cards.tsx';
import DictionaryTab from '../../app/(tabs)/dictionary.tsx';
import SettingsTab from '../../app/(tabs)/settings.tsx';

jest.mock('expo-keep-awake', () => ({
  useKeepAwake: jest.fn(),
}));

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  getAvailableVoicesAsync: jest.fn(async () => [{ language: 'vi-VN', identifier: 'vi-VN-default' }]),
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(async () => {}),
  NotificationFeedbackType: { Warning: 'Warning' },
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: (props: any) => React.createElement(Text, { testID: props.testID || `icon-${props.name}` }, props.name),
  };
});

describe('UI Screens & MockEngine integration (Jest / RNTL)', () => {
  beforeEach(() => {
    useSystemStore.setState({
      onboardingStatus: 'pending',
      permissionState: 'unknown',
      history: [],
    });
  });

  test('renders 4 tabs with TopBar and SOS button placed in Settings tab', async () => {
    for (const TabComponent of [CommunicateTab, CardsTab, DictionaryTab, SettingsTab]) {
      const { unmount } = await render(
        <ThemeProvider>
          <TabComponent />
        </ThemeProvider>
      );
      if (TabComponent === SettingsTab) {
        expect(screen.getByTestId('sos-button')).toBeTruthy();
      }
      await unmount();
    }
  });

  test('SignCameraScreen renders MOCK badge, debug panel, and handles unclear/locked events', async () => {
    const engine = new MockEngine();
    await render(
      <ThemeProvider>
        <SignCameraScreen
          engine={engine}
          active={false}
          facing="front"
          renderDebugPanel={(eng) => <MockDebugPanel engine={eng as MockEngine} />}
        />
      </ThemeProvider>
    );

    expect(screen.getByTestId('mock-badge')).toBeTruthy();
    expect(screen.getByTestId('mock-debug-panel')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('mock-emit-candidate'));
    expect(screen.getByTestId('candidate-banner')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('mock-emit-unclear'));
    expect(screen.getByText(VI_STRINGS.camera.unclearPrompt)).toBeTruthy();

    await fireEvent.press(screen.getByTestId('mock-emit-locked'));
    expect(screen.getByTestId('locked-words-text')).toHaveTextContent('Xin chào');
  });

  test('OnboardingModal walks 3 steps, supports skipping, and triggers Settings reminder', async () => {
    const onClose = jest.fn();
    const { unmount } = await render(
      <ThemeProvider>
        <OnboardingModal visible onClose={onClose} />
      </ThemeProvider>
    );

    expect(screen.getByText(VI_STRINGS.onboarding.step1Title)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('onboarding-next-btn'));
    expect(screen.getByText(VI_STRINGS.onboarding.step2Title)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('onboarding-next-btn'));
    expect(screen.getByText(VI_STRINGS.onboarding.step3Title)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('onboarding-next-btn'));

    expect(useSystemStore.getState().onboardingStatus).toBe('completed');
    expect(onClose).toHaveBeenCalledTimes(1);
    await unmount();

    await render(
      <ThemeProvider>
        <OnboardingModal visible onClose={onClose} />
      </ThemeProvider>
    );
    await fireEvent.press(screen.getByTestId('onboarding-skip-btn'));
    expect(useSystemStore.getState().onboardingStatus).toBe('skipped');

    await render(
      <ThemeProvider>
        <SettingsTab />
      </ThemeProvider>
    );
    expect(screen.getByTestId('settings-onboarding-reminder')).toBeTruthy();
  });

  test('CameraModal displays latest hearing-person sentence and modifier selectors', async () => {
    useSystemStore.getState().addHistoryEntry('other', 'Bạn cần mua gì?');

    await render(
      <ThemeProvider>
        <CameraModal visible onClose={() => {}} />
      </ThemeProvider>
    );

    expect(screen.getByTestId('camera-other-pinned')).toHaveTextContent(
      `${VI_STRINGS.camera.otherSaidPrefix} Bạn cần mua gì?`
    );
    expect(screen.getByTestId('modifier-question')).toBeTruthy();
    expect(screen.getByTestId('modifier-urgent')).toBeTruthy();
  });
});
