import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('Antigravity configuration & safety invariants (Section 6)', () => {
  it('AGENTS.md exists and stays within 12,000 chars and 24,000 bytes', () => {
    const content = fs.readFileSync(path.join(ROOT_DIR, 'AGENTS.md'), 'utf8');
    assert.ok(content.length > 0 && content.length <= 12000);
    assert.ok(Buffer.byteLength(content, 'utf8') <= 24000);
  });

  it('.agents/rules/*.md exist, stay <= 24,000 bytes, and never contain // turbo', () => {
    const requiredRules = [
      '00-project.md',
      '10-mobile.md',
      '30-backend.md',
      '40-android-native.md',
    ];
    for (const file of requiredRules) {
      const fullPath = path.join(ROOT_DIR, '.agents/rules', file);
      assert.ok(fs.existsSync(fullPath), `Missing rule: ${file}`);
      const content = fs.readFileSync(fullPath, 'utf8');
      assert.ok(Buffer.byteLength(content, 'utf8') <= 24000, `${file} exceeds 24KB`);
      assert.ok(!/\/\/\s*turbo(-all)?/i.test(content), `${file} contains forbidden // turbo`);
    }
  });

  it('.agents/skills/*/SKILL.md exist with valid frontmatter and no // turbo', () => {
    const requiredSkills = [
      'recognizer-contract',
      'ui-accessibility',
      'spring-firebase-auth',
      'plan',
      'verify',
      'review',
      'eod',
    ];
    for (const skill of requiredSkills) {
      const skillPath = path.join(ROOT_DIR, '.agents/skills', skill, 'SKILL.md');
      assert.ok(fs.existsSync(skillPath), `Missing skill: ${skill}`);
      const content = fs.readFileSync(skillPath, 'utf8');
      assert.match(content, /^---\s*\n[\s\S]*?name:\s*.+\n[\s\S]*?description:\s*.+\n[\s\S]*?---/);
      assert.ok(!/\/\/\s*turbo(-all)?/i.test(content), `${skill} contains forbidden // turbo`);
    }
  });

  it('app/ and src/features/camera match Section 7 U-00 layout without leftover apps/', () => {
    assert.ok(fs.existsSync(path.join(ROOT_DIR, 'src/features/camera/createAppEngine.ts')));
    assert.ok(fs.existsSync(path.join(ROOT_DIR, 'src/features/camera/AppCameraContainer.tsx')));
    assert.equal(fs.existsSync(path.join(ROOT_DIR, 'apps')), false);
  });
});

