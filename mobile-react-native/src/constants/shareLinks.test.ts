import appConfig from 'constants/appConfig';
import {
  APP_SCHEME,
  buildShareLink,
  linkingPrefixes,
  schemeShareLink,
  shareTokenFromUrl,
} from './shareLinks';

const withShareBase = (value: string, run: () => void) => {
  const previous = appConfig.shareLinkBaseUrl;
  appConfig.shareLinkBaseUrl = value;
  try {
    run();
  } finally {
    appConfig.shareLinkBaseUrl = previous;
  }
};

describe('buildShareLink', () => {
  it('uses the configured host when there is one', () => {
    withShareBase('https://roads.example.com', () => {
      expect(buildShareLink('tok')).toBe('https://roads.example.com/share/tok');
    });
  });

  it('does not double the slash on a host written with one', () => {
    withShareBase('https://roads.example.com/', () => {
      expect(buildShareLink('tok')).toBe('https://roads.example.com/share/tok');
    });
  });

  it("takes the server's link when it is a public address", () => {
    withShareBase('', () => {
      expect(buildShareLink('tok', 'https://roads.example.com/share/tok')).toBe(
        'https://roads.example.com/share/tok',
      );
    });
  });

  it.each([
    'http://localhost:8081/share/tok',
    'http://192.168.1.20:3000/share/tok',
    'http://10.0.2.2:3000/share/tok',
  ])("ignores %p, which means nothing on the recipient's phone", (serverUrl) => {
    withShareBase('', () => {
      expect(buildShareLink('tok', serverUrl)).toBe(schemeShareLink('tok'));
    });
  });

  it('falls back to a link that at least opens this app', () => {
    withShareBase('', () => {
      expect(buildShareLink('tok')).toBe(
        `${APP_SCHEME}://share/tok`,
      );
    });
  });
});

describe('shareTokenFromUrl', () => {
  it.each([
    `${APP_SCHEME}://share/abc.def.ghi`,
    'https://roads.example.com/share/abc.def.ghi',
    'https://roads.example.com/share/abc.def.ghi/',
    'https://roads.example.com/share/abc.def.ghi?utm=whatsapp',
    'https://roads.example.com/share/abc.def.ghi#top',
  ])('reads the token out of %p', (url) => {
    expect(shareTokenFromUrl(url)).toBe('abc.def.ghi');
  });

  it('decodes a token that arrived percent-encoded', () => {
    expect(shareTokenFromUrl('https://roads.example.com/share/a%2Eb')).toBe(
      'a.b',
    );
  });

  it.each([
    'https://roads.example.com/',
    'https://roads.example.com/share/',
    `${APP_SCHEME}://route/abc`,
  ])('finds nothing in %p', (url) => {
    expect(shareTokenFromUrl(url)).toBeNull();
  });
});

describe('linkingPrefixes', () => {
  it('always claims the app scheme', () => {
    withShareBase('', () => {
      expect(linkingPrefixes()).toEqual([`${APP_SCHEME}://`]);
    });
  });

  it('claims the configured host as well', () => {
    withShareBase('https://roads.example.com/', () => {
      expect(linkingPrefixes()).toEqual([
        `${APP_SCHEME}://`,
        'https://roads.example.com',
      ]);
    });
  });
});
