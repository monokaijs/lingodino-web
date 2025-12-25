export enum UserRole {
  Admin = 'admin',
  User = 'user',
}

export interface User {
  _id: string;
  email: string;
  fullName: string;
  role: UserRole;
  photo?: string;
  googleId?: string;
  appleId?: string;
}
