import { create } from 'zustand';
import {
  resolveDefaultFontScaleLevel,
  type FontScaleLevel,
} from '../theme/tokens.ts';

export type SystemStatusLevel = 'ready' | 'attention' | 'unavailable';
export type OnboardingStatus = 'pending' | 'completed' | 'skipped';
export type VoiceGender = 'female' | 'male';
export type PermissionCheckState =
  | 'unknown'
  | 'granted'
  | 'denied'
  | 'never_ask_again';

export interface UserAccountInfo {
  isLoggedIn: boolean;
  email?: string;
  displayName?: string;
  syncStatus: 'offline' | 'synced' | 'pending';
}

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
  voiceGender?: VoiceGender;
  emergencyInfo?: string;
  onboardingStatus?: OnboardingStatus;
  userAccount?: UserAccountInfo;
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
    voiceGender: state.voiceGender,
    emergencyInfo: state.emergencyInfo,
    onboardingStatus: state.onboardingStatus,
    userAccount: state.userAccount,
  });
}

export interface SystemStoreState {
  statusLight: SystemStatusLevel;
  statusDetail: string | null;
  fontLevel: FontScaleLevel;
  highContrast: boolean;
  speechRate: number;
  voiceGender: VoiceGender;
  reduceMotion: boolean;
  isFlipped180: boolean;
  emergencyInfo: string;
  onboardingStatus: OnboardingStatus;
  permissionState: PermissionCheckState;
  userAccount: UserAccountInfo;
  history: ConversationEntry[];

  setStatusLight: (level: SystemStatusLevel, detail?: string | null) => void;
  setFontLevel: (level: FontScaleLevel) => void;
  initFontScaleFromSystem: (systemFontScale: number) => void;
  setHighContrast: (enabled: boolean) => void;
  setSpeechRate: (rate: number) => void;
  setVoiceGender: (gender: VoiceGender) => void;
  setReduceMotion: (enabled: boolean) => void;
  toggleFlip180: () => void;
  setEmergencyInfo: (text: string) => void;
  setOnboardingStatus: (status: OnboardingStatus) => void;
  setPermissionState: (state: PermissionCheckState) => void;
  loginUser: (email: string) => void;
  logoutUser: () => void;
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
  voiceGender: 'female',
  reduceMotion: false,
  isFlipped180: false,
  emergencyInfo: '',
  onboardingStatus: 'pending',
  permissionState: 'unknown',
  userAccount: {
    isLoggedIn: false,
    syncStatus: 'offline',
  },
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
  setVoiceGender: (voiceGender) => {
    set({ voiceGender });
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
  loginUser: (email: string) => {
    const cleanEmail = email.trim() || 'nguoidung@nguoicam.vn';
    set({
      userAccount: {
        isLoggedIn: true,
        email: cleanEmail,
        displayName: cleanEmail.split('@')[0],
        syncStatus: 'synced',
      },
    });
    notifyPersist(get());
  },
  logoutUser: () => {
    set({
      userAccount: {
        isLoggedIn: false,
        syncStatus: 'offline',
      },
    });
    notifyPersist(get());
  },
  applyPersistedSettings: (snapshot) =>
    set((s) => ({
      fontLevel: snapshot.fontLevel ?? s.fontLevel,
      highContrast: snapshot.highContrast ?? s.highContrast,
      speechRate: snapshot.speechRate ?? s.speechRate,
      voiceGender: snapshot.voiceGender ?? s.voiceGender,
      emergencyInfo: snapshot.emergencyInfo ?? s.emergencyInfo,
      onboardingStatus: snapshot.onboardingStatus ?? s.onboardingStatus,
      userAccount: snapshot.userAccount ?? s.userAccount,
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
