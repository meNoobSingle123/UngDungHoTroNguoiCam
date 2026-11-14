import * as Speech from 'expo-speech';

export interface SpeakOptions {
  rate?: number;
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
    Speech.stop();
    Speech.speak(trimmed, {
      language: 'vi-VN',
      rate: options.rate ?? 1.0,
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

