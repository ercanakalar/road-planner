const withCleartextTraffic = require('./plugins/withCleartextTraffic');
const withAppSigning = require('./plugins/withAppSigning');
const withAdiRegistration = require('./plugins/withAdiRegistration');
const withoutLocationService = require('./plugins/withoutLocationService');

const readEnv = () => ({
  baseUrl: process.env.EXPO_PUBLIC_BASE_URL ?? '',
  shareLinkBaseUrl: process.env.EXPO_PUBLIC_SHARE_LINK_BASE_URL ?? '',
  mapsApiKey: process.env.EXPO_PUBLIC_MAP_API_KEY ?? '',
  signing: {
    keystorePath: process.env.ANDROID_KEYSTORE_PATH ?? '',
    keystorePassword: process.env.ANDROID_KEYSTORE_PASSWORD ?? '',
    keyAlias: process.env.ANDROID_KEY_ALIAS ?? '',
    keyPassword: process.env.ANDROID_KEY_PASSWORD ?? process.env.ANDROID_KEYSTORE_PASSWORD ?? '',
  },
});

const shareIntentFilters = (shareLinkBaseUrl) => {
  if (!shareLinkBaseUrl) return [];

  let parsed;
  try {
    parsed = new URL(shareLinkBaseUrl);
  } catch {
    return [];
  }

  return [
    {
      action: 'VIEW',
      autoVerify: true,
      data: [
        {
          scheme: parsed.protocol.replace(':', ''),
          host: parsed.hostname,
          pathPrefix: '/share',
        },
      ],
      category: ['BROWSABLE', 'DEFAULT'],
    },
  ];
};

module.exports = ({ config } = {}) => {
  const expo = config ?? require('./app.json').expo;
  const { mapsApiKey, baseUrl, shareLinkBaseUrl, signing } = readEnv();

  const needsCleartext = baseUrl.startsWith('http://');

  return {
    ...expo,
    plugins: [
      ...(expo.plugins ?? []),
      [withCleartextTraffic, { enabled: needsCleartext }],
      [withAppSigning, signing],
      withAdiRegistration,
      withoutLocationService,
    ],
    android: {
      ...expo.android,
      intentFilters: [
        ...(expo.android?.intentFilters ?? []),
        ...shareIntentFilters(shareLinkBaseUrl),
      ],
      config: { googleMaps: { apiKey: mapsApiKey } },
    },
    ios: {
      ...expo.ios,
      config: { googleMapsApiKey: mapsApiKey },
    },
  };
};
