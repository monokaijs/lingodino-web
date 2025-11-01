export interface SystemPreference {
  _id: string;
  systemName: string;
  allowRegistration: boolean;
  googleOAuthClientId?: string;
  googleOAuthClientSecret?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

