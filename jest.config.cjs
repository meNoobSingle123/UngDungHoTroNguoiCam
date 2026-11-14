/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/tests/jest/**/*.test.[jt]s?(x)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@sign/recognizer-contract$': '<rootDir>/packages/recognizer-contract/src/index.ts',
    '^@sign/recognizer-mock$': '<rootDir>/packages/recognizer-mock/src/index.ts',
    '^@sign/recognizer-mock/debug-panel$': '<rootDir>/packages/recognizer-mock/src/MockDebugPanel.tsx',
    '^@sign/recognizer-plugin$': '<rootDir>/packages/recognizer-plugin/src/index.ts',
    '^@sign/sentence-builder$': '<rootDir>/packages/sentence-builder/src/index.ts',
    '^@sign/sign-ui$': '<rootDir>/packages/sign-ui/src/index.ts',
    '^@sign/sign-ui/camera-screen$': '<rootDir>/packages/sign-ui/src/SignCameraScreen.tsx',
  },
};
