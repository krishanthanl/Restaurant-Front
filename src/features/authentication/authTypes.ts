export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  role: 'Admin' | 'Manager' | 'Cashier' | 'Waiter' | 'Kitchen';
}
export interface LoginResponse {
  accessToken: string;
  expiresAtUtc: string;
  user: AuthUser;
}
