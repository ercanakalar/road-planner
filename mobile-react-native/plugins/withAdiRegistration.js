const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

// Android Developer Verification needs `assets/adi-registration.properties`
// inside the APK. The android/ folder is generated, so copy it in at prebuild.
const withAdiRegistration = (config) =>
  withDangerousMod(config, [
    'android',
    (mod) => {
      const source = path.join(__dirname, 'adi-registration.properties');
      if (!fs.existsSync(source)) {
        console.warn('withAdiRegistration: plugins/adi-registration.properties is missing, skipping');
        return mod;
      }
      const assetsDir = path.join(
        mod.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'assets',
      );
      fs.mkdirSync(assetsDir, { recursive: true });
      fs.copyFileSync(source, path.join(assetsDir, 'adi-registration.properties'));
      return mod;
    },
  ]);

module.exports = withAdiRegistration;
