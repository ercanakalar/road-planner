export type GetUserByIdArgs = {
  userId: string;
};

export type UserProfileData = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  photo: string;
  nickName: string;
};

export type GetUserByIdResponse = UserProfileData;

export type UserArgs = UserProfileData;

export type UserResponse = UserProfileData;

export interface ProfileForm {
  firstName: string;
  lastName: string;
  nickName: string;
}
