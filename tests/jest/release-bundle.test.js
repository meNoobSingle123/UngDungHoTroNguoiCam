const fs = require('node:fs');
const path = require('node:path');
const scanner = require('../../scripts/release-bundle-scanner.cjs');

const ROOT_DIR = path.resolve(__dirname, '../..');

describe('Release bundle MockEngine exclusion (mandatory)', () => {
  test('packages/sign-ui depends strictly on @sign/recognizer-contract and contains no MockEngine references', () => {
    const errors = scanner.checkUiContractBoundary(ROOT_DIR);
    expect(errors).toEqual([]);
  });

  test('production source tree contains no MockEngine or recognizer-mock after __DEV__ dead-code elimination', () => {
    const errors = scanner.verifyProductionSourceExclusion(ROOT_DIR);
    expect(errors).toEqual([]);
  });

  test('prebuilt release bundle artifacts (if present) must not contain MockEngine', () => {
    const result = scanner.scanReleaseBundleArtifacts(ROOT_DIR);
    expect(result.errors).toEqual([]);
  });

  test('scanner detects unguarded MockEngine leakage in a simulated release bundle', () => {
    const leakedBundle = `
      function createEngine() {
        const { MockEngine } = require('@sign/recognizer-mock');
        return new MockEngine();
      }
    `;
    const findings = scanner.scanTextForMockTokens(leakedBundle, 'simulated-release.jsbundle');
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.some((f) => f.includes('MockEngine'))).toBe(true);
  });

  test('createAppEngine throws or ignores mock when __DEV__ is false', () => {
    const appEnginePath = path.join(ROOT_DIR, 'src/features/camera/createAppEngine.ts');
    const source = fs.readFileSync(appEnginePath, 'utf8');
    const stripped = scanner.stripDevIfBlocks(source);
    expect(stripped).not.toContain('MockEngine');
    expect(stripped).not.toContain('recognizer-mock');
  });
});

