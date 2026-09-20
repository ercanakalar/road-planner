const path = require('path');
const { withAppBuildGradle } = require('expo/config-plugins');

// The generated build.gradle signs every build type with the bundled debug
// keystore, so `expo run:android` and the APK build would end up with two
// different certificate fingerprints — and Google's OAuth client, assetlinks
// and the developer-verification registration are all keyed by one.
// When a keystore is configured, sign debug and release with it instead.
const withAppSigning = (config, { keystorePath, keystorePassword, keyAlias, keyPassword } = {}) => {
  if (!keystorePath) return config;

  return withAppBuildGradle(config, (mod) => {
    const gradle = mod.modResults.contents;
    const absolute = path.resolve(mod.modRequest.projectRoot, keystorePath);
    const quote = (value) => `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

    const release = [
      '        release {',
      `            storeFile file(${quote(absolute)})`,
      `            storePassword ${quote(keystorePassword)}`,
      `            keyAlias ${quote(keyAlias)}`,
      `            keyPassword ${quote(keyPassword)}`,
      '        }',
    ].join('\n');

    if (!gradle.includes('signingConfigs {')) {
      throw new Error('withAppSigning: no signingConfigs block found in android/app/build.gradle');
    }

    mod.modResults.contents = gradle
      .replace(/signingConfigs \{\n/, `signingConfigs {\n${release}\n`)
      .replace(/signingConfig signingConfigs\.debug/g, 'signingConfig signingConfigs.release');

    return mod;
  });
};

module.exports = withAppSigning;
