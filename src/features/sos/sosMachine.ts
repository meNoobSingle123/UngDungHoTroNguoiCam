import { VI_STRINGS } from '../../core/i18n/vi.ts';

export type SosState = 'idle' | 'arming' | 'active' | 'stopping';

export const SOS_HOLD_MS = 1500;
export const SOS_FLASH_HZ = 2;
export const SOS_FLASH_INTERVAL_MS = 250;

export interface SosSnapshot {
  state: SosState;
  progress: number;
  armingStartedAtMs: number | null;
  hint: string | null;
}

export function createInitialSosSnapshot(): SosSnapshot {
  return {
    state: 'idle',
    progress: 0,
    armingStartedAtMs: null,
    hint: null,
  };
}

export function beginSosHold(prev: SosSnapshot, nowMs: number): SosSnapshot {
  if (prev.state !== 'idle') {
    return prev;
  }
  return {
    state: 'arming',
    progress: 0,
    armingStartedAtMs: nowMs,
    hint: null,
  };
}

export function tickSosHold(prev: SosSnapshot, nowMs: number): SosSnapshot {
  if (prev.state !== 'arming' || prev.armingStartedAtMs === null) {
    return prev;
  }
  const elapsed = Math.max(0, nowMs - prev.armingStartedAtMs);
  if (elapsed >= SOS_HOLD_MS) {
    return {
      state: 'active',
      progress: 1,
      armingStartedAtMs: prev.armingStartedAtMs,
      hint: null,
    };
  }
  return {
    ...prev,
    progress: elapsed / SOS_HOLD_MS,
  };
}

export function cancelSosHold(prev: SosSnapshot): SosSnapshot {
  if (prev.state !== 'arming') {
    return prev;
  }
  return {
    state: 'idle',
    progress: 0,
    armingStartedAtMs: null,
    hint: VI_STRINGS.sos.holdHint,
  };
}

export function beginSosStop(prev: SosSnapshot): SosSnapshot {
  if (prev.state !== 'active') {
    return prev;
  }
  return {
    ...prev,
    state: 'stopping',
  };
}

export function finishSosStop(prev: SosSnapshot): SosSnapshot {
  if (prev.state !== 'stopping' && prev.state !== 'active') {
    return prev;
  }
  return createInitialSosSnapshot();
}

export interface SosMachine {
  getSnapshot(): SosSnapshot;
  pressIn(nowMs: number): SosSnapshot;
  tick(nowMs: number): SosSnapshot;
  pressOut(): SosSnapshot;
  requestStop(): SosSnapshot;
  completeStop(): SosSnapshot;
}

export function createSosMachine(): SosMachine {
  let snapshot = createInitialSosSnapshot();

  return {
    getSnapshot() {
      return snapshot;
    },
    pressIn(nowMs: number) {
      snapshot = beginSosHold(snapshot, nowMs);
      return snapshot;
    },
    tick(nowMs: number) {
      snapshot = tickSosHold(snapshot, nowMs);
      return snapshot;
    },
    pressOut() {
      snapshot = cancelSosHold(snapshot);
      return snapshot;
    },
    requestStop() {
      snapshot = beginSosStop(snapshot);
      return snapshot;
    },
    completeStop() {
      snapshot = finishSosStop(snapshot);
      return snapshot;
    },
  };
}
