import * as Speech from 'expo-speech';
import { hapticLight, hapticSuccess } from '../haptics/hapticFeedback.ts';
import { useSystemStore, type VoiceGender } from '../store/systemStatus.ts';

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  gender?: VoiceGender;
  onStart?: () => void;
  onDone?: () => void;
  onError?: (err: unknown) => void;
}

let cachedVoices: Speech.Voice[] | null = null;

async function getVoicesSafe(): Promise<Speech.Voice[]> {
  if (cachedVoices) return cachedVoices;
  try {
    cachedVoices = await Speech.getAvailableVoicesAsync();
    return cachedVoices ?? [];
  } catch {
    return [];
  }
}

function findVoiceByGender(voices: Speech.Voice[], gender: VoiceGender): string | undefined {
  const viVoices = voices.filter((v) => v.language?.toLowerCase().startsWith('vi'));
  if (viVoices.length === 0) return undefined;

  if (gender === 'male') {
    const male = viVoices.find((v) => {
      const id = `${v.identifier} ${v.name}`.toLowerCase();
      return (
        id.includes('male') ||
        id.includes('nam') ||
        id.includes('vic') ||
        id.includes('vid') ||
        id.includes('vif') ||
        id.includes('voice-2') ||
        id.includes('voice_2') ||
        id.includes('voice-b') ||
        id.includes('voice_b')
      );
    });
    if (male) return male.identifier;
  } else {
    const female = viVoices.find((v) => {
      const id = `${v.identifier} ${v.name}`.toLowerCase();
      return (
        id.includes('female') ||
        id.includes('nu') ||
        id.includes('vie') ||
        id.includes('gft') ||
        id.includes('linh') ||
        id.includes('voice-1') ||
        id.includes('voice_1') ||
        id.includes('voice-a')
      );
    });
    if (female) return female.identifier;
  }
  return undefined;
}

/**
 * Offline Vietnamese TTS helper using expo-speech (`vi-VN`).
 * Uses native male/female voice models when available, or gentle natural pitch
 * modulation without robotic formant distortion.
 */
export function speakVietnamese(text: string, options: SpeakOptions = {}): void {
  const trimmed = text.trim();
  if (!trimmed) return;

  try {
    const gender = options.gender ?? useSystemStore.getState().voiceGender;
    const baseRate = options.rate ?? 1.0;

    // Use authentic male baritone tone (pitch: 0.93, rate: 0.96)
    // Avoid severe pitch drop (e.g. 0.82) which causes robotic distortion
    const resolvedPitch = options.pitch ?? (gender === 'male' ? 0.93 : 1.0);
    const resolvedRate = gender === 'male' ? baseRate * 0.96 : baseRate;

    Speech.stop();

    const doSpeak = (voiceId?: string) => {
      Speech.speak(trimmed, {
        language: 'vi-VN',
        ...(voiceId ? { voice: voiceId } : {}),
        rate: resolvedRate,
        pitch: resolvedPitch,
        onStart: () => {
          hapticLight();
          options.onStart?.();
        },
        onDone: () => {
          hapticSuccess();
          options.onDone?.();
        },
        onError: options.onError,
      });
    };

    if (cachedVoices) {
      const voiceId = findVoiceByGender(cachedVoices, gender);
      doSpeak(voiceId);
    } else {
      getVoicesSafe()
        .then((voices) => {
          const voiceId = findVoiceByGender(voices, gender);
          doSpeak(voiceId);
        })
        .catch(() => {
          doSpeak(undefined);
        });
    }
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
    const voices = await getVoicesSafe();
    if (!voices || voices.length === 0) return false;
    return voices.some((v) => v.language?.toLowerCase().startsWith('vi'));
  } catch {
    return false;
  }
}

