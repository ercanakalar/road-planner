const appConfig = {
  baseUrl: process.env.EXPO_PUBLIC_BASE_URL ?? 'http://localhost:3000',

  shareLinkBaseUrl: process.env.EXPO_PUBLIC_SHARE_LINK_BASE_URL ?? '',

  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
  googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
};

export default appConfig;
