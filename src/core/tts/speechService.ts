import * as Speech from 'expo-speech';
import { useSystemStore, type VoiceGender } from '../store/systemStatus.ts';

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  gender?: VoiceGender;
  onStart?: () => void;
  onDone?: () => void;
  onError?: (err: unknown) => void;
}

/**
 * Offline Vietnamese TTS helper using expo-speech (`vi-VN`).
 */
export function speakVietnamese(text: string, options: SpeakOptions = {}): void {
  const trimmed = text.trim();
  if (!trimmed) return;

  try {
    const gender = options.gender ?? useSystemStore.getState().voiceGender;
    const resolvedPitch = options.pitch ?? (gender === 'male' ? 0.82 : 1.15);

    Speech.stop();
    Speech.speak(trimmed, {
      language: 'vi-VN',
      rate: options.rate ?? 1.0,
      pitch: resolvedPitch,
      onStart: options.onStart,
      onDone: options.onDone,
      onError: options.onError,
    });
  } catch (error) {
    options.onError?.(error);
  }
}

export function stopSpeaking(): void {
  try {
    Speech.stop();
  } catch {
    // Ignore stop errors when speech engine is idle.
  }
}

export async function hasVietnameseVoice(): Promise<boolean> {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    if (!voices || voices.length === 0) return false;
    return voices.some((v) => v.language?.toLowerCase().startsWith('vi'));
  } catch {
    return false;
  }
}

