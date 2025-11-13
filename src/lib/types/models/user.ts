export enum UserRole {
  Admin = 'admin',
  User = 'user',
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
