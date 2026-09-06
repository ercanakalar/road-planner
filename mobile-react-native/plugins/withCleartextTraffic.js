const { withAndroidManifest } = require('expo/config-plugins');

const withCleartextTraffic = (config, { enabled } = {}) =>
  withAndroidManifest(config, (mod) => {
    const application = mod.modResults.manifest.application?.[0];
    if (!application) return mod;

    if (enabled) {
      application.$['android:usesCleartextTraffic'] = 'true';
    } else {
      delete application.$['android:usesCleartextTraffic'];
    }

    return mod;
  });

module.exports = withCleartextTraffic;
