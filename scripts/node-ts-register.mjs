import fs from 'node:fs';
import { registerHooks } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const WORKSPACE_ENTRY_MAP = new Map([
  ['@sign/recognizer-contract', path.join(rootDir, 'packages/recognizer-contract/src/index.ts')],
  ['@sign/recognizer-mock', path.join(rootDir, 'packages/recognizer-mock/src/index.ts')],
  ['@sign/recognizer-plugin', path.join(rootDir, 'packages/recognizer-plugin/src/index.ts')],
  ['@sign/sentence-builder', path.join(rootDir, 'packages/sentence-builder/src/index.ts')],
  ['@sign/sign-ui', path.join(rootDir, 'packages/sign-ui/src/index.ts')],
]);

registerHooks({
  resolve(specifier, context, nextResolve) {
    const mapped = WORKSPACE_ENTRY_MAP.get(specifier);
    if (mapped) {
      return {
        shortCircuit: true,
        url: pathToFileURL(mapped).href,
      };
    }

    if (
      (specifier.startsWith('./') || specifier.startsWith('../')) &&
      context.parentURL &&
      !path.extname(specifier)
    ) {
      const parentPath = fileURLToPath(context.parentURL);
      const tsCandidate = path.resolve(path.dirname(parentPath), `${specifier}.ts`);
      if (fs.existsSync(tsCandidate)) {
        return {
          shortCircuit: true,
          url: pathToFileURL(tsCandidate).href,
        };
      }
    }

    return nextResolve(specifier, context);
  },
});

