import path from 'node:path';
import { fileURLToPath } from 'node:url';
import scanner from './release-bundle-scanner.cjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const boundaryErrors = scanner.checkUiContractBoundary(rootDir);
const dceErrors = scanner.verifyProductionSourceExclusion(rootDir);
const bundleResult = scanner.scanReleaseBundleArtifacts(rootDir);

const allErrors = [...boundaryErrors, ...dceErrors, ...bundleResult.errors];

if (allErrors.length > 0) {
  console.error('Release bundle verification FAILED:');
  for (const err of allErrors) {
    console.error(` - ${err}`);
  }
  process.exit(1);
}

console.log('Release bundle verification PASSED.');
console.log(
  `Scanned prebuilt release bundles: ${bundleResult.scannedFiles.length > 0 ? bundleResult.scannedFiles.join(', ') : 'none present yet (verified source DCE + UI boundary).'}`
);

