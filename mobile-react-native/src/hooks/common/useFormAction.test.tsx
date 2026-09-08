import { Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';

import useFormAction from './useFormAction';

type Values = { email: string };

type Form = ReturnType<typeof useFormAction<Values>>;

const renderForm = (config: Parameters<typeof useFormAction<Values>>[0]) => {
  const latest = { current: null as unknown as Form };

  const Probe = () => {
    latest.current = useFormAction(config);
    return <Text>probe</Text>;
  };

  act(() => {
    renderer.create(<Probe />);
  });

  return latest;
};

const type = (latest: { current: Form }, value: string) =>
  act(() => {
    latest.current.handleChange('email')(value);
  });

const submit = async (latest: { current: Form }) => {
  await act(async () => {
    latest.current.handleSubmit();
  });
};

describe('useFormAction', () => {
  it('starts with the initial values and no error', () => {
    const latest = renderForm({
      initialValues: { email: 'start@example.com' },
      submit: jest.fn(),
      failureMessage: 'failed',
    });

    expect(latest.current.values.email).toBe('start@example.com');
    expect(latest.current.error).toBe('');
    expect(latest.current.isPending).toBe(false);
  });

  it('reports a validation failure without sending anything', async () => {
    const send = jest.fn();
    const latest = renderForm({
      initialValues: { email: '' },
      validate: ({ email }) => (email ? '' : 'Enter an email.'),
      submit: send,
      failureMessage: 'failed',
    });

    await submit(latest);

    expect(latest.current.error).toBe('Enter an email.');
    expect(send).not.toHaveBeenCalled();
  });

  it('sends the current values once they validate', async () => {
    const send = jest.fn(async () => undefined);
    const latest = renderForm({
      initialValues: { email: '' },
      validate: ({ email }) => (email ? '' : 'Enter an email.'),
      submit: send,
      failureMessage: 'failed',
    });

    await type(latest, 'someone@example.com');
    await submit(latest);

    expect(send).toHaveBeenCalledWith({ email: 'someone@example.com' });
    expect(latest.current.error).toBe('');
  });

  it('turns a thrown submit into the failure message', async () => {
    const latest = renderForm({
      initialValues: { email: 'someone@example.com' },
      submit: async () => {
        throw new Error('401');
      },
      failureMessage: 'Sign-in failed.',
    });

    await submit(latest);

    expect(latest.current.error).toBe('Sign-in failed.');
  });

  it('clears a standing error as soon as the field is edited', async () => {
    const latest = renderForm({
      initialValues: { email: 'someone@example.com' },
      submit: async () => {
        throw new Error('401');
      },
      failureMessage: 'Sign-in failed.',
    });

    await submit(latest);
    expect(latest.current.error).toBe('Sign-in failed.');

    // A complaint about a value that has since been retyped is just noise.
    await type(latest, 'someone.else@example.com');
    expect(latest.current.error).toBe('');
  });

  it('is pending for as long as the submit is, not just the request', async () => {
    let release!: () => void;
    const inFlight = new Promise<void>((resolve) => {
      release = resolve;
    });

    const latest = renderForm({
      initialValues: { email: 'someone@example.com' },
      submit: () => inFlight,
      failureMessage: 'failed',
    });

    await act(async () => {
      latest.current.handleSubmit();
    });
    expect(latest.current.isPending).toBe(true);

    await act(async () => {
      release();
      await inFlight;
    });
    expect(latest.current.isPending).toBe(false);
  });
});
