const { withPodfileProperties } = require('expo/config-plugins');
module.exports = config => withPodfileProperties(config, mod => {
  // A precompiled RNCore would silently bypass the patched delegate source.
  mod.modResults['ios.buildReactNativeFromSource'] = 'true';
  return mod;
});
