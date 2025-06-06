export interface UserState {
  data: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    photo: string | null;
    nickName: string | null;
    permitId: string;
  };
  isLoading: boolean;
  error: string | null;
}

export const userInitialState: UserState = {
  data: {
    id: '',
    email: '',
    firstName: null,
    lastName: null,
    photo: null,
    nickName: null,
    permitId: '',
  },
  isLoading: false,
  error: null,
};
