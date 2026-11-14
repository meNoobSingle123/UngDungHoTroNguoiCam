const fs = require('node:fs');
const path = require('node:path');

const FORBIDDEN_RELEASE_TOKENS = [
  'MockEngine',
  '__MOCK_ENGINE_DO_NOT_SHIP__',
  'recognizer-mock',
  'MockDebugPanel',
];

const DEV_CONDITION_PATTERNS = [
  /^__DEV__$/,
  /^__DEV__\s*===\s*true$/,
  /^true\s*===\s*__DEV__$/,
  /^typeof\s+__DEV__\s*!==\s*['"]undefined['"]\s*&&\s*__DEV__\s*===\s*true$/,
  /^typeof\s+__DEV__\s*!==\s*['"]undefined['"]\s*&&\s*__DEV__$/,
];

function isDevGuardCondition(expr) {
  const normalized = expr.trim().replace(/^\(+|\)+$/g, '').trim();
  return DEV_CONDITION_PATTERNS.some((pattern) => pattern.test(normalized));
}

function skipStringOrComment(code, idx) {
  const ch = code[idx];
  const next = code[idx + 1];

  if (ch === '/' && next === '/') {
    let i = idx + 2;
    while (i < code.length && code[i] !== '\n') i += 1;
    return i;
  }
  if (ch === '/' && next === '*') {
    const end = code.indexOf('*/', idx + 2);
    return end === -1 ? code.length : end + 2;
  }
  if (ch === '\'' || ch === '"' || ch === '`') {
    const quote = ch;
    let i = idx + 1;
    while (i < code.length) {
      if (code[i] === '\\') {
        i += 2;
        continue;
      }
      if (code[i] === quote) {
        return i + 1;
      }
      i += 1;
    }
    return code.length;
  }
  return idx;
}

function findMatchingBrace(code, openBraceIdx) {
  let depth = 0;
  let i = openBraceIdx;
  while (i < code.length) {
    const skipped = skipStringOrComment(code, i);
    if (skipped > i) {
      i = skipped;
      continue;
    }
    if (code[i] === '{') depth += 1;
    else if (code[i] === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
    i += 1;
  }
  return -1;
}

/**
 * Simulates production dead-code elimination (`__DEV__ = false`) by removing
 * `if (__DEV__ ...)` blocks cleanly outside strings/comments.
 */
function stripDevIfBlocks(code) {
  let out = '';
  let i = 0;

  while (i < code.length) {
    const skipped = skipStringOrComment(code, i);
    if (skipped > i) {
      out += code.slice(i, skipped);
      i = skipped;
      continue;
    }

    const prevChar = i > 0 ? code[i - 1] : '';
    const isWordStart = !/[A-Za-z0-9_$]/.test(prevChar);

    if (isWordStart && code.startsWith('if', i) && !/[A-Za-z0-9_$]/.test(code[i + 2] || '')) {
      const rest = code.slice(i + 2);
      const match = rest.match(/^\s*\(([^()]*)\)\s*\{/);
      if (match && isDevGuardCondition(match[1])) {
        const openBraceIdx = i + 2 + match[0].length - 1;
        const closeBraceIdx = findMatchingBrace(code, openBraceIdx);
        if (closeBraceIdx !== -1) {
          out += '/* __DEV__ stripped */';
          i = closeBraceIdx + 1;
          continue;
        }
      }
    }

    out += code[i];
    i += 1;
  }

  return out;
}

function collectSourceFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') {
        continue;
      }
      results.push(...collectSourceFiles(fullPath));
    } else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

function scanTextForMockTokens(text, label) {
  const findings = [];
  for (const token of FORBIDDEN_RELEASE_TOKENS) {
    if (text.includes(token)) {
      findings.push(`${label}: contains forbidden release token "${token}"`);
    }
  }
  return findings;
}

function checkUiContractBoundary(rootDir) {
  const errors = [];
  const uiPkgPath = path.join(rootDir, 'packages/sign-ui/package.json');
  const uiPkg = JSON.parse(fs.readFileSync(uiPkgPath, 'utf8'));
  const deps = Object.keys(uiPkg.dependencies || {});

  for (const dep of deps) {
    if (dep !== '@sign/recognizer-contract') {
      errors.push(
        `packages/sign-ui must depend ONLY on @sign/recognizer-contract, found "${dep}"`
      );
    }
  }

  const uiFiles = collectSourceFiles(path.join(rootDir, 'packages/sign-ui/src'));
  for (const filePath of uiFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    const rel = path.relative(rootDir, filePath);
    errors.push(...scanTextForMockTokens(content, rel));
  }

  return errors;
}

function stripCommentsOutsideStrings(code) {
  let out = '';
  let i = 0;
  while (i < code.length) {
    const ch = code[i];
    const next = code[i + 1];
    if (ch === '/' && next === '/') {
      while (i < code.length && code[i] !== '\n') i += 1;
      continue;
    }
    if (ch === '/' && next === '*') {
      const end = code.indexOf('*/', i + 2);
      i = end === -1 ? code.length : end + 2;
      continue;
    }
    if (ch === '\'' || ch === '"' || ch === '`') {
      const end = skipStringOrComment(code, i);
      out += code.slice(i, end);
      i = end;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

function verifyProductionSourceExclusion(rootDir, relativeDirs = [
  'packages/recognizer-contract/src',
  'packages/sign-ui/src',
  'packages/recognizer-plugin/src',
  'packages/sentence-builder/src',
  'app',
  'src',
]) {
  const errors = [];
  for (const relDir of relativeDirs) {
    const files = collectSourceFiles(path.join(rootDir, relDir));
    for (const filePath of files) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const stripped = stripCommentsOutsideStrings(stripDevIfBlocks(raw));
      const rel = path.relative(rootDir, filePath);
      errors.push(...scanTextForMockTokens(stripped, `${rel} (after __DEV__ DCE)`));
    }
  }
  return errors;
}

function scanReleaseBundleArtifacts(rootDir, customPaths = []) {
  const candidatePaths = [
    ...customPaths,
    process.env.RELEASE_BUNDLE_PATH,
    path.join(rootDir, 'dist/release/main.jsbundle'),
    path.join(rootDir, 'dist/release/index.js'),
    path.join(rootDir, 'ios/main.jsbundle'),
    path.join(rootDir, 'android/app/build/generated/assets/react/release/index.android.bundle'),
  ].filter(Boolean);

  const scannedFiles = [];
  const errors = [];

  for (const filePath of candidatePaths) {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      scannedFiles.push(filePath);
      const bundleContent = fs.readFileSync(filePath, 'utf8');
      errors.push(...scanTextForMockTokens(bundleContent, path.relative(rootDir, filePath)));
    }
  }

  return { scannedFiles, errors };
}

module.exports = {
  FORBIDDEN_RELEASE_TOKENS,
  stripDevIfBlocks,
  scanTextForMockTokens,
  checkUiContractBoundary,
  verifyProductionSourceExclusion,
  scanReleaseBundleArtifacts,
};
