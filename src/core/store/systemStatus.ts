import { create } from 'zustand';
import {
  resolveDefaultFontScaleLevel,
  type FontScaleLevel,
} from '../theme/tokens.ts';

export type SystemStatusLevel = 'ready' | 'attention' | 'unavailable';
export type OnboardingStatus = 'pending' | 'completed' | 'skipped';
export type PermissionCheckState =
  | 'unknown'
  | 'granted'
  | 'denied'
  | 'never_ask_again';

export interface ConversationEntry {
  id: string;
  speaker: 'me' | 'other';
  text: string;
  tMs: number;
}

export interface PersistedSettingsSnapshot {
  fontLevel?: FontScaleLevel;
  highContrast?: boolean;
  speechRate?: number;
  emergencyInfo?: string;
  onboardingStatus?: OnboardingStatus;
}

type SettingsPersistListener = (settings: Required<PersistedSettingsSnapshot>) => void;
let persistListener: SettingsPersistListener | null = null;

export function registerSettingsPersistListener(
  listener: SettingsPersistListener | null
): void {
  persistListener = listener;
}

function notifyPersist(state: SystemStoreState): void {
  persistListener?.({
    fontLevel: state.fontLevel,
    highContrast: state.highContrast,
    speechRate: state.speechRate,
    emergencyInfo: state.emergencyInfo,
    onboardingStatus: state.onboardingStatus,
  });
}

export interface SystemStoreState {
  statusLight: SystemStatusLevel;
  statusDetail: string | null;
  fontLevel: FontScaleLevel;
  highContrast: boolean;
  speechRate: number;
  reduceMotion: boolean;
  isFlipped180: boolean;
  emergencyInfo: string;
  onboardingStatus: OnboardingStatus;
  permissionState: PermissionCheckState;
  history: ConversationEntry[];

  setStatusLight: (level: SystemStatusLevel, detail?: string | null) => void;
  setFontLevel: (level: FontScaleLevel) => void;
  initFontScaleFromSystem: (systemFontScale: number) => void;
  setHighContrast: (enabled: boolean) => void;
  setSpeechRate: (rate: number) => void;
  setReduceMotion: (enabled: boolean) => void;
  toggleFlip180: () => void;
  setEmergencyInfo: (text: string) => void;
  setOnboardingStatus: (status: OnboardingStatus) => void;
  setPermissionState: (state: PermissionCheckState) => void;
  applyPersistedSettings: (snapshot: PersistedSettingsSnapshot) => void;
  addHistoryEntry: (speaker: 'me' | 'other', text: string, tMs?: number) => void;
  clearHistory: () => void;
}

export const useSystemStore = create<SystemStoreState>((set, get) => ({
  statusLight: 'ready',
  statusDetail: null,
  fontLevel: 'small',
  highContrast: false,
  speechRate: 1.0,
  reduceMotion: false,
  isFlipped180: false,
  emergencyInfo: '',
  onboardingStatus: 'pending',
  permissionState: 'unknown',
  history: [],

  setStatusLight: (statusLight, statusDetail = null) =>
    set({ statusLight, statusDetail }),
  setFontLevel: (fontLevel) => {
    set({ fontLevel });
    notifyPersist(get());
  },
  initFontScaleFromSystem: (systemFontScale) =>
    set((s) => ({
      fontLevel:
        s.onboardingStatus === 'pending'
          ? resolveDefaultFontScaleLevel(systemFontScale)
          : s.fontLevel,
    })),
  setHighContrast: (highContrast) => {
    set({ highContrast });
    notifyPersist(get());
  },
  setSpeechRate: (speechRate) => {
    set({ speechRate });
    notifyPersist(get());
  },
  setReduceMotion: (reduceMotion) => set({ reduceMotion }),
  toggleFlip180: () => set((s) => ({ isFlipped180: !s.isFlipped180 })),
  setEmergencyInfo: (emergencyInfo) => {
    set({ emergencyInfo });
    notifyPersist(get());
  },
  setOnboardingStatus: (onboardingStatus) => {
    set({ onboardingStatus });
    notifyPersist(get());
  },
  setPermissionState: (permissionState) => set({ permissionState }),
  applyPersistedSettings: (snapshot) =>
    set((s) => ({
      fontLevel: snapshot.fontLevel ?? s.fontLevel,
      highContrast: snapshot.highContrast ?? s.highContrast,
      speechRate: snapshot.speechRate ?? s.speechRate,
      emergencyInfo: snapshot.emergencyInfo ?? s.emergencyInfo,
      onboardingStatus: snapshot.onboardingStatus ?? s.onboardingStatus,
    })),
  addHistoryEntry: (speaker, text, tMs = Date.now()) =>
    set((s) => ({
      history: [
        ...s.history,
        { id: `${tMs}-${s.history.length}`, speaker, text, tMs },
      ],
    })),
  clearHistory: () => set({ history: [] }),
}));
