const path = require('node:path');

const expoDir = path.dirname(require.resolve('expo/package.json'));
const babelPresetExpo = require.resolve('babel-preset-expo', {
  paths: [__dirname, expoDir],
});

module.exports = function configureBabel(api) {
  api.cache(true);
  return {
    presets: [babelPresetExpo],
  };
};
