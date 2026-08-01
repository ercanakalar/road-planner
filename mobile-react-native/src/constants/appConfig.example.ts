const appConfig = {
  baseUrl: process.env.EXPO_PUBLIC_BASE_URL ?? 'http://localhost:3000',
  mapApiKey: process.env.EXPO_PUBLIC_MAP_API_KEY ?? '',
};

export default appConfig;
