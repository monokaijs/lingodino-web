export const ApiRoutes = {
  login: "/api/auth/login",
  register: "/api/auth/register",
  logout: "/api/auth/logout",
  getUser: "/api/users/:id",
  getUsers: "/api/users",
  createUser: "/api/users",
  updateUser: "/api/users/:id",
  deleteUser: "/api/users/:id",
} as const;
