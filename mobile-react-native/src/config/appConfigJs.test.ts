const loadConfig = () => {
  jest.resetModules();

  return require('../../app.config.js')();
};

const withEnv = (env: Record<string, string | undefined>, run: () => void) => {
  const previous = { ...process.env };

  Object.entries(env).forEach(([key, value]) => {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  });

  try {
    run();
  } finally {
    process.env = previous;
  }
};

describe('app.config.js', () => {
  it('leaves the native map configuration to app.json', () => {
    withEnv({ EXPO_PUBLIC_MAP_API_KEY: 'a-real-key' }, () => {
      const config = loadConfig();

      expect(config.android.config).toBeUndefined();
      expect(config.ios.config).toBeUndefined();
    });
  });

  it('allows plain HTTP only when the API url needs it', () => {
    const cleartext = (config: { plugins: unknown[] }) => {
      const entry = config.plugins.find(
        (plugin) => Array.isArray(plugin) && typeof plugin[0] === 'function',
      ) as [unknown, { enabled: boolean }];

      return entry[1].enabled;
    };

    withEnv({ EXPO_PUBLIC_BASE_URL: 'http://192.168.1.10:3000' }, () => {
      expect(cleartext(loadConfig())).toBe(true);
    });

    withEnv({ EXPO_PUBLIC_BASE_URL: 'https://api.example.com' }, () => {
      expect(cleartext(loadConfig())).toBe(false);
    });
  });

  it('keeps the plugins declared in app.json', () => {
    const config = loadConfig();
    const names = config.plugins.map((plugin: unknown) =>
      Array.isArray(plugin) ? plugin[0] : plugin,
    );

    expect(names).toContain('expo-secure-store');
    expect(names).toContain('expo-image-picker');
  });

  it('keeps the scheme Google sign-in redirects back to', () => {
    expect(loadConfig().scheme).toBe('net.travelroutes.travelroutes');
  });

  it('keeps the application id that scheme has to equal', () => {
    // useGoogleAuth builds `<application id>:/oauthredirect` from these, and a
    // native Google client accepts no other redirect. Changing either without
    // registering a new OAuth client breaks sign-in on that platform.
    const config = loadConfig();

    expect(config.android.package).toBe('net.travelroutes.travelroutes');
    expect(config.ios.bundleIdentifier).toBe('net.travelroutes.travelroutes');
  });
});

describe('android share intent filters', () => {
  const filters = (config: { android: { intentFilters?: unknown[] } }) =>
    config.android.intentFilters ?? [];

  it('claims the share path on the configured host', () => {
    withEnv(
      { EXPO_PUBLIC_SHARE_LINK_BASE_URL: 'https://roads.example.com' },
      () => {
        expect(filters(loadConfig())).toEqual([
          {
            action: 'VIEW',
            autoVerify: true,
            data: [
              { scheme: 'https', host: 'roads.example.com', pathPrefix: '/share' },
            ],
            category: ['BROWSABLE', 'DEFAULT'],
          },
        ]);
      },
    );
  });

  it('adds nothing when there is no host to claim', () => {
    withEnv({ EXPO_PUBLIC_SHARE_LINK_BASE_URL: undefined }, () => {
      expect(filters(loadConfig())).toEqual([]);
    });
  });

  it('ignores a host that is not a url rather than failing the build', () => {
    withEnv({ EXPO_PUBLIC_SHARE_LINK_BASE_URL: 'roads.example.com' }, () => {
      expect(filters(loadConfig())).toEqual([]);
    });
  });
});
