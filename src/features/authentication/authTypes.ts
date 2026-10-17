export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  role: 'Admin' | 'Manager' | 'Cashier' | 'Waiter' | 'Kitchen';
  permissions: string[];
}
export interface LoginResponse {
  accessToken: string;
  expiresAtUtc: string;
  csrfToken: string;
  user: AuthUser;
}
