// Read-only for UI; changes require a Pull Request approved by both UI and AI owners.
export const WORD_IDS = [
  'xin_chao','cam_on','xin_loi','toi','ban','co','khong','muon','an','uong',
  'nuoc','mua','bao_nhieu','tien','dau','bac_si','giup_do','di','nha','doi',
] as const;
export type WordId = typeof WORD_IDS[number];

export type RecognizerState = 'idle' | 'starting' | 'running' | 'error';

export type RecognizerEvent =
  | { type: 'state'; state: RecognizerState; message?: string }
  | { type: 'hand'; present: boolean; fps: number }
  | { type: 'candidate'; word: WordId; p: number; p2: number }   // gợi ý, chưa khóa
  | { type: 'locked'; word: WordId; p: number; tMs: number }     // đã giữ thế đủ lâu và đủ tin cậy
  | { type: 'unclear'; tMs: number };                            // dưới ngưỡng: KHÔNG thêm từ

export interface RecognizerInfo {
  engine: 'mock' | 'mediapipe-litert';
  modelVersion: string;
  preprocessVersion: string;
  enabledWords: WordId[];         // từ nào đạt ngưỡng ≥85% với người lạ
}

export interface RecognizerEngine {
  start(opts: { facing: 'front' | 'back' }): Promise<void>;
  stop(): Promise<void>;
  subscribe(listener: (e: RecognizerEvent) => void): () => void;
  info(): RecognizerInfo;
}

export interface SignCameraViewProps {
  engine: RecognizerEngine;
  active: boolean;
  facing: 'front' | 'back';
  style?: unknown;
}

