import type { WordId } from '@sign/recognizer-contract';

export interface WordLabelInfo {
  id: WordId;
  vi: string;
  group: 'chao_hoi' | 'co_ban' | 'an_uong' | 'mua_ban' | 'y_te' | 'di_lai';
}

export const WORD_LABELS: Record<WordId, WordLabelInfo> = {
  xin_chao: { id: 'xin_chao', vi: 'Xin chào', group: 'chao_hoi' },
  cam_on: { id: 'cam_on', vi: 'Cảm ơn', group: 'chao_hoi' },
  xin_loi: { id: 'xin_loi', vi: 'Xin lỗi', group: 'chao_hoi' },
  toi: { id: 'toi', vi: 'Tôi', group: 'co_ban' },
  ban: { id: 'ban', vi: 'Bạn', group: 'co_ban' },
  co: { id: 'co', vi: 'Có', group: 'co_ban' },
  khong: { id: 'khong', vi: 'Không', group: 'co_ban' },
  muon: { id: 'muon', vi: 'Muốn', group: 'co_ban' },
  an: { id: 'an', vi: 'Ăn', group: 'an_uong' },
  uong: { id: 'uong', vi: 'Uống', group: 'an_uong' },
  nuoc: { id: 'nuoc', vi: 'Nước', group: 'an_uong' },
  mua: { id: 'mua', vi: 'Mua', group: 'mua_ban' },
  bao_nhieu: { id: 'bao_nhieu', vi: 'Bao nhiêu', group: 'mua_ban' },
  tien: { id: 'tien', vi: 'Tiền', group: 'mua_ban' },
  dau: { id: 'dau', vi: 'Đau', group: 'y_te' },
  bac_si: { id: 'bac_si', vi: 'Bác sĩ', group: 'y_te' },
  giup_do: { id: 'giup_do', vi: 'Giúp đỡ', group: 'y_te' },
  di: { id: 'di', vi: 'Đi', group: 'di_lai' },
  nha: { id: 'nha', vi: 'Nhà', group: 'di_lai' },
  doi: { id: 'doi', vi: 'Đợi', group: 'di_lai' },
};

export function getWordDisplayText(word: WordId): string {
  return WORD_LABELS[word]?.vi ?? word;
}

