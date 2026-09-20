import TestRenderer, { act } from 'react-test-renderer';

import useSignedIn from './useSignedIn';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const render = () => {
  let signedIn!: () => void;

  const Probe = () => {
    signedIn = useSignedIn();
    return null;
  };

  act(() => {
    TestRenderer.create(<Probe />);
  });

  return () => act(() => signedIn());
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useSignedIn', () => {
  it('lands on the routes tab, the same place the email form goes', () => {
    render()();

    expect(mockNavigate).toHaveBeenCalledWith('HomeTabNavigator', {
      screen: 'Routes',
    });
  });
});
