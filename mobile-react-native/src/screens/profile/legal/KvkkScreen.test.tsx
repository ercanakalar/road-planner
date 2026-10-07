import { Provider } from 'react-redux';
import renderer, { act } from 'react-test-renderer';
import Toast from 'react-native-toast-message';

import KvkkScreen from './KvkkScreen';
import { KVKK_CONSENT_VERSION, KVKK_COPY } from 'constants/kvkk';
import { ConfirmContext } from 'hooks/feedback/useConfirm';
import store from 'store';
import { logout, sessionRestored } from 'store/slices/authSlice';
import { kvkkHydrated } from 'store/slices/kvkkSlice';
import { KvkkConsentRecord } from 'types/kvkk';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

const CONSENT: KvkkConsentRecord = {
  version: KVKK_CONSENT_VERSION,
  acceptedAt: '2026-09-30T08:00:00.000Z',
  language: 'en',
};

const SESSION = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  userId: 'user-1',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// A restored session also fetches the person's routes and favourites; those
// get an empty list, everything else on the consent side its usual answer.
const answerWithdrawal = (response: () => Response) => {
  global.fetch = jest.fn(async (request: Request) => {
    if (request.url.endsWith('/consent/withdraw')) return response();
    return new URL(request.url).pathname.includes('/consent')
      ? json(200, { status: 'success', data: { recorded: true } })
      : json(200, { status: 'success', data: [] });
  }) as never;
};

const withdrawalRequests = () =>
  (global.fetch as jest.Mock).mock.calls
    .map(([request]) => request as Request)
    .filter((request) => request.url.endsWith('/consent/withdraw'));

const settle = async () => {
  for (let i = 0; i < 5; i += 1) {
    await act(() => new Promise((resolve) => setImmediate(resolve)));
  }
};

const render = (answer: boolean) => {
  const confirm = jest.fn(async () => answer);
  let tree!: renderer.ReactTestRenderer;

  act(() => {
    tree = renderer.create(
      <Provider store={store}>
        <ConfirmContext value={confirm}>
          <KvkkScreen />
        </ConfirmContext>
      </Provider>,
    );
  });

  return { tree, confirm };
};

const pressWithdraw = async (tree: renderer.ReactTestRenderer) => {
  const labels = [KVKK_COPY.en.withdrawLabel, KVKK_COPY.tr.withdrawLabel];
  const [button] = tree.root.findAll(
    (node) =>
      typeof node.props?.onPress === 'function' &&
      labels.includes(node.props?.label),
  );

  await act(async () => {
    await button.props.onPress();
  });
  await settle();
};

describe('KvkkScreen — withdrawing consent', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    answerWithdrawal(() =>
      json(200, {
        status: 'success',
        header: 'Account deleted',
        message: 'Your account has been permanently deleted.',
        data: { deleted: true },
      }),
    );
    store.dispatch(logout());
    store.dispatch(kvkkHydrated(CONSENT));
    await settle();
  });

  describe('when signed in', () => {
    beforeEach(async () => {
      store.dispatch(sessionRestored(SESSION));
      await settle();
    });

    it('warns that the account will be deleted for good', async () => {
      const { tree, confirm } = render(false);

      await pressWithdraw(tree);

      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          message: KVKK_COPY.en.withdrawDeleteMessage,
          confirmLabel: KVKK_COPY.en.withdrawDeleteConfirmLabel,
          tone: 'danger',
        }),
      );
    });

    it('deletes the account, then signs out and asks for consent again', async () => {
      const { tree } = render(true);

      await pressWithdraw(tree);

      const [request] = withdrawalRequests();
      await expect(request.json()).resolves.toEqual({
        noticeVersion: KVKK_CONSENT_VERSION,
        language: 'en',
      });
      expect(store.getState().auth.isLoggedIn).toBe(false);
      expect(store.getState().kvkk.consent).toBeNull();
    });

    it('changes nothing when the server could not delete the account', async () => {
      answerWithdrawal(() =>
        json(400, { status: 'error', message: 'Account not found.' }),
      );
      const { tree } = render(true);

      await pressWithdraw(tree);

      expect(store.getState().auth.isLoggedIn).toBe(true);
      expect(store.getState().kvkk.consent).toEqual(CONSENT);
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          text1: KVKK_COPY.en.withdrawFailedTitle,
        }),
      );
    });

    it('does nothing at all when the person thinks better of it', async () => {
      const { tree } = render(false);

      await pressWithdraw(tree);

      expect(withdrawalRequests()).toHaveLength(0);
      expect(store.getState().auth.isLoggedIn).toBe(true);
      expect(store.getState().kvkk.consent).toEqual(CONSENT);
    });
  });

  describe('when signed out', () => {
    it('only takes the consent back on this phone — there is no account to delete', async () => {
      const { tree, confirm } = render(true);

      await pressWithdraw(tree);

      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({ message: KVKK_COPY.en.withdrawMessage }),
      );
      expect(withdrawalRequests()).toHaveLength(0);
      expect(store.getState().kvkk.consent).toBeNull();
    });
  });
});
