import { create } from 'zustand';
import {
  createInitialSosSnapshot,
  createSosMachine,
  type SosSnapshot,
} from './sosMachine.ts';

const machine = createSosMachine();

export interface SosUiStore extends SosSnapshot {
  pressIn: (nowMs?: number) => void;
  tick: (nowMs?: number) => void;
  pressOut: () => void;
  stop: () => void;
}

export const useSosStore = create<SosUiStore>((set) => ({
  ...createInitialSosSnapshot(),
  pressIn: (nowMs = Date.now()) => set(machine.pressIn(nowMs)),
  tick: (nowMs = Date.now()) => set(machine.tick(nowMs)),
  pressOut: () => set(machine.pressOut()),
  stop: () => {
    machine.requestStop();
    set(machine.completeStop());
  },
}));

