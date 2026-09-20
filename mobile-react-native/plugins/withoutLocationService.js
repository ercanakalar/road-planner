const { withAndroidManifest } = require('expo/config-plugins');

// expo-location's own manifest declares LocationTaskService with
// foregroundServiceType="location". The service only runs for background
// location tasks (startLocationUpdatesAsync), which this app never starts —
// it follows a route with watchPositionAsync while the screen is on — but the
// declaration alone makes Play Console demand a foreground-service permission
// form and a demo video. Removing the node keeps the manifest honest.
const SERVICE = 'expo.modules.location.services.LocationTaskService';

const withoutLocationService = (config) =>
  withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    const application = manifest.application?.[0];
    if (!application) return mod;

    manifest.$['xmlns:tools'] = manifest.$['xmlns:tools'] ?? 'http://schemas.android.com/tools';

    application.service = (application.service ?? []).filter(
      (service) => service.$['android:name'] !== SERVICE,
    );
    application.service.push({
      $: { 'android:name': SERVICE, 'tools:node': 'remove' },
    });

    return mod;
  });

module.exports = withoutLocationService;
