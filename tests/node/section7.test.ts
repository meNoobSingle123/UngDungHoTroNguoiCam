import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { WORD_IDS, type WordId } from '@sign/recognizer-contract';
import {
  SENTENCE_TEMPLATES,
  buildSentence,
  type SentenceModifier,
} from '../../packages/sentence-builder/src/index.ts';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function linearizeChannel(channel255: number): number {
  const s = channel255 / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const raw = hex.slice(1);
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  return (
    0.2126 * linearizeChannel(r) +
    0.7152 * linearizeChannel(g) +
    0.0722 * linearizeChannel(b)
  );
}

function contrastRatio(fgHex: string, bgHex: string): number {
  const l1 = relativeLuminance(fgHex);
  const l2 = relativeLuminance(bgHex);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function extractTokenMap(sectionText: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const match of sectionText.matchAll(/\b([A-Za-z]+)\s+(#[0-9A-Fa-f]{6})\b/g)) {
    map[match[1]] = match[2].toUpperCase();
  }
  return map;
}

describe('Section 7.1 DESIGN.md contrast ratios', () => {
  it('parses DESIGN.md color tokens and satisfies WCAG contrast thresholds', () => {
    const designMd = fs.readFileSync(path.join(ROOT_DIR, 'DESIGN.md'), 'utf8');

    const lightMatch = designMd.match(/Sáng:([\s\S]*?)Tương phản cao:/);
    const hcMatch = designMd.match(/Tương phản cao:([\s\S]*?)SOS \(cả hai chế độ\):/);
    const sosMatch = designMd.match(/SOS \(cả hai chế độ\):[^\n]*`(#D50000)`[^\n]*`(#FFFFFF)`/i);

    assert.ok(lightMatch, 'Missing Sáng token section in DESIGN.md');
    assert.ok(hcMatch, 'Missing Tương phản cao token section in DESIGN.md');
    assert.ok(sosMatch, 'Missing SOS color pair in DESIGN.md');

    const light = extractTokenMap(lightMatch[1]);
    const hc = extractTokenMap(hcMatch[1]);

    // Light mode >= 4.5:1
    for (const bg of [light.bg, light.surface]) {
      for (const fg of [light.text, light.textMuted, light.success, light.warning, light.danger]) {
        assert.ok(contrastRatio(fg, bg) >= 4.5, `Light pair ${fg}/${bg} below 4.5:1`);
      }
    }
    assert.ok(contrastRatio(light.primary, light.bg) >= 4.5);
    assert.ok(contrastRatio(light.onPrimary, light.primary) >= 4.5);
    assert.ok(contrastRatio(light.onDanger, light.danger) >= 4.5);

    // High contrast mode >= 7:1
    for (const bg of [hc.bg, hc.surface]) {
      for (const fg of [hc.text, hc.textMuted, hc.success, hc.warning, hc.danger]) {
        assert.ok(contrastRatio(fg, bg) >= 7, `High-contrast pair ${fg}/${bg} below 7:1`);
      }
    }
    assert.ok(contrastRatio(hc.onPrimary, hc.primary) >= 7);

    // SOS >= 4.5:1
    assert.ok(contrastRatio(sosMatch[2], sosMatch[1]) >= 4.5);
  });
});

describe('Section 7.3 sentence-templates & @sign/sentence-builder (U-08)', () => {
  it('SENTENCE_TEMPLATES matches docs/spec/sentence-templates.json and uses valid WordIds', () => {
    const jsonTemplates = JSON.parse(
      fs.readFileSync(path.join(ROOT_DIR, 'docs/spec/sentence-templates.json'), 'utf8')
    ) as Array<{ id: string; patterns: WordId[][]; out: string }>;

    const validWords = new Set<string>(WORD_IDS);
    assert.equal(SENTENCE_TEMPLATES.length, jsonTemplates.length);

    for (let i = 0; i < jsonTemplates.length; i += 1) {
      assert.equal(SENTENCE_TEMPLATES[i].id, jsonTemplates[i].id);
      assert.deepEqual(SENTENCE_TEMPLATES[i].patterns, jsonTemplates[i].patterns);
      assert.equal(SENTENCE_TEMPLATES[i].out, jsonTemplates[i].out);
      for (const pat of jsonTemplates[i].patterns) {
        for (const w of pat) {
          assert.ok(validWords.has(w), `Unknown WordId "${w}" in template ${jsonTemplates[i].id}`);
        }
      }
    }
  });

  it('passes all 8 U-08 specification test cases', () => {
    const cases: Array<{
      words: WordId[];
      modifier: SentenceModifier;
      expected: string | null;
    }> = [
      { words: ['toi', 'muon', 'an'], modifier: 'none', expected: 'Tôi muốn ăn.' },
      { words: ['toi', 'mua', 'nuoc'], modifier: 'none', expected: 'Tôi muốn mua nước.' },
      { words: ['toi', 'nuoc', 'mua'], modifier: 'none', expected: 'Tôi muốn mua nước.' },
      { words: ['tien', 'bao_nhieu'], modifier: 'none', expected: 'Bao nhiêu tiền?' },
      { words: ['toi', 'dau'], modifier: 'urgent', expected: 'Tôi đau nhiều lắm!' },
      {
        words: ['bac_si', 'giup_do'],
        modifier: 'question',
        expected: 'Xin hãy giúp tôi gọi bác sĩ?',
      },
      { words: ['muon', 'toi', 'an'], modifier: 'none', expected: null },
      { words: [], modifier: 'none', expected: null },
    ];

    for (const c of cases) {
      const actual = buildSentence(c.words, c.modifier);
      assert.deepEqual(
        actual,
        c.expected === null ? null : { text: c.expected },
        `Failed for [${c.words.join(', ')}] (${c.modifier})`
      );
    }
  });

  it('handles base question/urgent punctuation cleanly across remaining templates', () => {
    assert.deepEqual(buildSentence(['toi', 'dau'], 'none'), { text: 'Tôi bị đau.' });
    assert.deepEqual(buildSentence(['toi', 'dau'], 'question'), { text: 'Tôi bị đau?' });
    assert.deepEqual(buildSentence(['bao_nhieu', 'tien'], 'question'), {
      text: 'Bao nhiêu tiền?',
    });
    assert.deepEqual(buildSentence(['bao_nhieu', 'tien'], 'urgent'), {
      text: 'Bao nhiêu tiền!',
    });
    assert.deepEqual(buildSentence(['xin_chao'], 'none'), { text: 'Xin chào.' });
  });
});

