import { ToastType } from 'types/status-type';
import { ApiResponse } from './base-type';

export type GetUserByIdArgs = {
  userId: string;
  accessToken: string;
};

export type GetUserByIdResponse = ApiResponse<Omit<UserArgs, 'accessToken'>>;

export type UserArgs = {
  id: string;
  accessToken: string;
  firstName: string;
  lastName: string;
  email: string;
  photo: string;
  nickName: string;
};

export type UserResponse = {
  status: ToastType;
  header: string;
  message: string;
  data: Omit<UserArgs, 'accessToken'>;
};

export interface ProfileForm {
  firstName: string;
  lastName: string;
  nickName: string;
}
