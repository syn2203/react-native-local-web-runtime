const path = require('node:path');

const reactNativePath = path.dirname(require.resolve('react-native/package.json'));

module.exports = {
  reactNativePath,
};
