import { configureStore } from '@reduxjs/toolkit';

import authReducer from 'store/slices/authSlice';
import { profileService } from './profileService';

const makeStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      [profileService.reducerPath]: profileService.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(profileService.middleware),
  });

const envelope = (data: unknown) =>
  JSON.stringify({ status: 'success', header: 'h', message: 'm', data });

const jsonResponse = (status: number, body: string) =>
  new Response(body, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const upload = async (store: ReturnType<typeof makeStore>) => {
  const pending = store.dispatch(
    // Only the uri: the file itself supplies the name and the MIME type when
    // Expo encodes the body. See toUploadPart.
    profileService.endpoints.updatePhoto.initiate({
      uri: 'file:///tmp/pick.jpeg',
    }),
  );

  const result = await pending;
  // Otherwise the cache entry outlives the test on RTK's own timer.
  pending.reset();

  return result;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('updatePhoto', () => {
  it('posts the picked file as multipart to the photo endpoint', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        jsonResponse(200, envelope({ id: 'u1', photo: '/api/user/photo/x.jpg' })),
      ) as never;

    await upload(makeStore());

    const request = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(request.url).toBe('http://api.test/api/user/photo');
    expect(request.method).toBe('POST');
    // Never application/json: the boundary has to come from the body.
    expect(request.headers.get('Content-Type')).toMatch(/^multipart\/form-data/);
  });

  it('does not send the file again when the upload fails', async () => {
    // A retry re-uploads every byte. Two of them turn one slow minute into
    // three before the person is told anything at all.
    global.fetch = jest
      .fn()
      .mockRejectedValue(new TypeError('Network request failed')) as never;

    const result = await upload(makeStore());

    expect(global.fetch).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any).error?.status).toBe('FETCH_ERROR');
  });
});
