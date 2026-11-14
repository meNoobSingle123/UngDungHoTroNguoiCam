import type { WordId } from '@sign/recognizer-contract';

export type SentenceModifier = 'none' | 'question' | 'urgent';

export interface SentenceTemplate {
  readonly id: string;
  readonly patterns: ReadonlyArray<ReadonlyArray<WordId>>;
  readonly out: string;
  readonly urgentOut?: string;
}

export interface BuiltSentence {
  text: string;
}

export const SENTENCE_TEMPLATES: readonly SentenceTemplate[] = [
  { id: 't1', patterns: [['toi', 'muon', 'an']], out: 'Tôi muốn ăn.' },
  { id: 't2', patterns: [['toi', 'khong', 'an']], out: 'Tôi không ăn.' },
  {
    id: 't3',
    patterns: [
      ['toi', 'nuoc', 'mua'],
      ['toi', 'mua', 'nuoc'],
    ],
    out: 'Tôi muốn mua nước.',
  },
  {
    id: 't4',
    patterns: [
      ['toi', 'nuoc', 'muon', 'uong'],
      ['toi', 'muon', 'uong', 'nuoc'],
    ],
    out: 'Tôi muốn uống nước.',
  },
  {
    id: 't5',
    patterns: [
      ['bao_nhieu', 'tien'],
      ['tien', 'bao_nhieu'],
    ],
    out: 'Bao nhiêu tiền?',
  },
  {
    id: 't6',
    patterns: [['toi', 'dau']],
    out: 'Tôi bị đau.',
    urgentOut: 'Tôi đau nhiều lắm!',
  },
  {
    id: 't7',
    patterns: [
      ['bac_si', 'giup_do'],
      ['giup_do', 'bac_si'],
    ],
    out: 'Xin hãy giúp tôi gọi bác sĩ.',
  },
  {
    id: 't8',
    patterns: [
      ['toi', 'nha', 'di'],
      ['toi', 'di', 'nha'],
    ],
    out: 'Tôi muốn về nhà.',
  },
  { id: 't9', patterns: [['ban', 'doi']], out: 'Xin bạn đợi một chút.' },
  { id: 't10', patterns: [['xin_chao']], out: 'Xin chào.' },
  { id: 't11', patterns: [['cam_on']], out: 'Cảm ơn.' },
  { id: 't12', patterns: [['xin_loi']], out: 'Xin lỗi.' },
];

function matchesPattern(
  words: readonly WordId[],
  pattern: readonly WordId[]
): boolean {
  if (words.length !== pattern.length) {
    return false;
  }
  for (let i = 0; i < words.length; i += 1) {
    if (words[i] !== pattern[i]) {
      return false;
    }
  }
  return true;
}

function applyModifier(
  template: SentenceTemplate,
  modifier: SentenceModifier
): string {
  if (modifier === 'none') {
    return template.out;
  }
  if (modifier === 'urgent' && template.urgentOut) {
    return template.urgentOut;
  }
  const baseWithoutPunctuation = template.out.replace(/[.?!]+$/, '');
  return modifier === 'question'
    ? `${baseWithoutPunctuation}?`
    : `${baseWithoutPunctuation}!`;
}

/**
 * Pure deterministic sentence builder matching locked WordId sequences against
 * vetted templates. Returns null when no template matches (never guesses).
 */
export function buildSentence(
  words: readonly WordId[],
  modifier: SentenceModifier = 'none'
): BuiltSentence | null {
  if (words.length === 0) {
    return null;
  }

  for (const template of SENTENCE_TEMPLATES) {
    if (template.patterns.some((pattern) => matchesPattern(words, pattern))) {
      return { text: applyModifier(template, modifier) };
    }
  }

  return null;
}

