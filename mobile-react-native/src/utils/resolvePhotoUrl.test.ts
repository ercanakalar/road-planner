import { resolvePhotoUrl } from './resolvePhotoUrl';

describe('resolvePhotoUrl', () => {
  it('resolves an API path against the configured base url', () => {
    expect(resolvePhotoUrl('/api/user/photo/abc.jpg')).toBe(
      'http://api.test/api/user/photo/abc.jpg',
    );
  });

  it('does not double the slash when the path has none', () => {
    expect(resolvePhotoUrl('api/user/photo/abc.jpg')).toBe(
      'http://api.test/api/user/photo/abc.jpg',
    );
  });

  it('passes an absolute url through untouched', () => {
    const google = 'https://lh3.googleusercontent.com/a/photo.jpg';
    expect(resolvePhotoUrl(google)).toBe(google);
    expect(resolvePhotoUrl('http://example.com/a.png')).toBe(
      'http://example.com/a.png',
    );
  });

  it('leaves local and inline sources alone', () => {
    expect(resolvePhotoUrl('file:///tmp/pick.jpg')).toBe(
      'file:///tmp/pick.jpg',
    );
    expect(resolvePhotoUrl('data:image/png;base64,AAA')).toBe(
      'data:image/png;base64,AAA',
    );
  });

  it('treats missing and blank photos as no photo', () => {
    expect(resolvePhotoUrl(undefined)).toBeNull();
    expect(resolvePhotoUrl(null)).toBeNull();
    expect(resolvePhotoUrl('')).toBeNull();
    expect(resolvePhotoUrl('   ')).toBeNull();
  });
});
