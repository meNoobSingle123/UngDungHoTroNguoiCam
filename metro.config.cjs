const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const config = getDefaultConfig(__dirname);
const isReleaseBuild =
  process.env.NODE_ENV === 'production' || process.env.RN_RELEASE === '1';

config.watchFolders = [path.resolve(__dirname, 'packages')];
config.resolver.blockList = isReleaseBuild
  ? [/[/\\]packages[/\\]recognizer-mock[/\\].*/]
  : [];

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    isReleaseBuild &&
    (moduleName === '@sign/recognizer-mock' || moduleName.includes('recognizer-mock'))
  ) {
    throw new Error(
      `[release-guard] Forbidden import of "${moduleName}" in production/release build.`
    );
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
