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
import { ConversationHistoryCard } from '../../src/features/communicate/ConversationHistoryCard.tsx';
import { QuickRepliesBar } from '../../src/features/communicate/QuickRepliesBar.tsx';
import {
  OtherSpeechSheet,
  TypeSpeechSheet,
} from '../../src/features/communicate/CommunicateSheets.tsx';
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
  NotificationFeedbackType: { Warning: 'Warning', Success: 'Success' },
  impactAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
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
    const onClose = jest.fn();

    await render(
      <ThemeProvider>
        <CameraModal visible onClose={onClose} />
      </ThemeProvider>
    );

    expect(screen.getByTestId('camera-other-pinned')).toHaveTextContent(
      `${VI_STRINGS.camera.otherSaidPrefix} Bạn cần mua gì?`
    );
    expect(screen.getByTestId('modifier-question')).toBeTruthy();
    expect(screen.getByTestId('modifier-urgent')).toBeTruthy();

    // Close button triggers onClose callback
    await fireEvent.press(screen.getByLabelText(VI_STRINGS.camera.closeButton));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('ConversationHistoryCard and QuickRepliesBar handle user interaction', async () => {
    const onSelectReply = jest.fn();
    const { unmount } = await render(
      <ThemeProvider>
        <ConversationHistoryCard />
        <QuickRepliesBar onSelectReply={onSelectReply} />
      </ThemeProvider>
    );

    expect(screen.getByTestId('conversation-history-card')).toBeTruthy();
    expect(screen.getByTestId('quick-replies-bar')).toBeTruthy();

    // Toggle 180 flip
    await fireEvent.press(screen.getByTestId('flip-180-btn'));
    expect(screen.getByTestId('flip-180-badge')).toBeTruthy();

    // Quick replies trigger callback
    await fireEvent.press(screen.getByTestId('quick-reply-chip-0'));
    expect(onSelectReply).toHaveBeenCalledTimes(1);
    await unmount();

    // With conversation entries: bubble is pressable to speak & replay button works
    useSystemStore.getState().addHistoryEntry('other', 'Xin chào bác sĩ');
    useSystemStore.getState().addHistoryEntry('me', 'Tôi bị đau họng');

    const speech = require('expo-speech');
    speech.speak.mockClear();

    const { unmount: unmountWithHistory } = await render(
      <ThemeProvider>
        <ConversationHistoryCard />
      </ThemeProvider>
    );

    // Tap bubble directly to speak
    await fireEvent.press(screen.getByTestId('history-bubble-0'));
    expect(speech.speak).toHaveBeenCalledWith(
      'Xin chào bác sĩ',
      expect.objectContaining({ language: 'vi-VN' })
    );

    speech.speak.mockClear();
    // Tap replay button to replay latest entry
    await fireEvent.press(screen.getByTestId('replay-btn'));
    expect(speech.speak).toHaveBeenCalledWith(
      'Tôi bị đau họng',
      expect.objectContaining({ language: 'vi-VN' })
    );

    // Clear history button
    await fireEvent.press(screen.getByTestId('clear-history-btn'));
    expect(useSystemStore.getState().history).toHaveLength(0);

    await unmountWithHistory();
  });

  test('TypeSpeechSheet and OtherSpeechSheet handle text inputs and submit', async () => {
    const onTypeSubmit = jest.fn();
    const onOtherSubmit = jest.fn();

    const { unmount } = await render(
      <ThemeProvider>
        <TypeSpeechSheet visible onClose={() => {}} onSubmit={onTypeSubmit} />
        <OtherSpeechSheet visible onClose={() => {}} onSubmit={onOtherSubmit} />
      </ThemeProvider>
    );

    expect(screen.getByTestId('type-speech-sheet')).toBeTruthy();
    expect(screen.getByTestId('other-speech-sheet')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('type-speech-input'), 'Xin chào bạn');
    await fireEvent.press(screen.getByTestId('type-sheet-submit-btn'));
    expect(onTypeSubmit).toHaveBeenCalledWith('Xin chào bạn');

    await fireEvent.changeText(screen.getByTestId('other-speech-input'), 'Tôi là bác sĩ');
    await fireEvent.press(screen.getByTestId('other-sheet-submit-btn'));
    expect(onOtherSubmit).toHaveBeenCalledWith('Tôi là bác sĩ');

    await unmount();
  });

  test('CardsTab opens Big Card Presenter modal, supports 180 flip and speech playback', async () => {
    const { unmount } = await render(
      <ThemeProvider>
        <CardsTab />
      </ThemeProvider>
    );

    const firstCard = screen.getAllByRole('button').find((el) => {
      return el.props.accessibilityLabel && el.props.testID?.startsWith('card-item-');
    });
    expect(firstCard).toBeTruthy();

    if (firstCard) {
      await fireEvent.press(firstCard);
      expect(screen.getByTestId('presenter-text')).toBeTruthy();
      expect(screen.getByTestId('presenter-speak-btn')).toBeTruthy();
      expect(screen.getByTestId('presenter-flip-btn')).toBeTruthy();

      await fireEvent.press(screen.getByTestId('presenter-flip-btn'));
      expect(screen.getByText('Lật về')).toBeTruthy();

      await fireEvent.press(screen.getByTestId('presenter-speak-btn'));
      const speech = require('expo-speech');
      expect(speech.speak).toHaveBeenCalled();

      await fireEvent.press(screen.getByTestId('presenter-close-btn'));
      expect(screen.queryByTestId('presenter-text')).toBeNull();
    }

    await unmount();
  });
});
