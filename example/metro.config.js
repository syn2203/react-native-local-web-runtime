const path = require('node:path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const projectRoot = __dirname;
const localWebPackageRoot = path.resolve(projectRoot, '..');

const config = {
  resolver: {
    extraNodeModules: {
      react: path.resolve(projectRoot, 'node_modules/react'),
      'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
      'react-native-local-web-runtime': localWebPackageRoot,
    },
  },
  watchFolders: [localWebPackageRoot],
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
