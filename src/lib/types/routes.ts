export const ApiRoutes = {
  // OAuth endpoints for mobile clients
  oauthGoogle: '/api/auth/oauth/google',
  oauthApple: '/api/auth/oauth/apple',

  // Legacy endpoints (deprecated)
  login: '/api/auth/login',
  register: '/api/auth/register',
  logout: '/api/auth/logout',

  // User endpoints
  getUser: '/api/users/:id',
  getUsers: '/api/users',
  createUser: '/api/users',
  updateUser: '/api/users/:id',
  deleteUser: '/api/users/:id',
} as const
