export enum UserRole {
  Admin = 'admin',
  Reader = 'user',
}

export interface User {
  _id: string;
  fullName: string;
  username: string;
  password?: string;
  phoneNumber?: string;
  role: UserRole;
  photo?: string;
}
