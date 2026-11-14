const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '../..');

describe('Shared words.json and recognizer-bundle spec parity', () => {
  test('docs/spec/words.json matches WORD_IDS order in packages/recognizer-contract/src/index.ts', () => {
    const words = JSON.parse(
      fs.readFileSync(path.join(ROOT_DIR, 'docs/spec/words.json'), 'utf8')
    );
    const contractSrc = fs.readFileSync(
      path.join(ROOT_DIR, 'packages/recognizer-contract/src/index.ts'),
      'utf8'
    );
    const match = contractSrc.match(/export const WORD_IDS = \[([\s\S]*?)\] as const;/);
    expect(match).not.toBeNull();
    const contractIds = Array.from(match[1].matchAll(/'([^']+)'/g), (m) => m[1]);

    expect(words).toHaveLength(20);
    expect(words.map((w) => w.id)).toEqual(contractIds);
  });

  test('docs/spec/recognizer-bundle/labels.json starts with "none" followed by 20 WORD_IDS', () => {
    const words = JSON.parse(
      fs.readFileSync(path.join(ROOT_DIR, 'docs/spec/words.json'), 'utf8')
    );
    const labels = JSON.parse(
      fs.readFileSync(path.join(ROOT_DIR, 'docs/spec/recognizer-bundle/labels.json'), 'utf8')
    );
    expect(labels).toEqual(['none', ...words.map((w) => w.id)]);
  });
});

