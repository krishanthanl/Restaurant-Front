// One tab-scoped token store; user details are always restored from /auth/me.
const key = 'access_token';
const csrfKey = 'csrf_token';
export const tokenStore = {
  get: () => window.sessionStorage.getItem(key),
  getCsrf: () => window.sessionStorage.getItem(csrfKey),
  set: (token: string) => window.sessionStorage.setItem(key, token),
  setSession: (token: string, csrfToken: string) => {
    window.sessionStorage.setItem(key, token);
    window.sessionStorage.setItem(csrfKey, csrfToken);
  },
  clear: () => {
    window.sessionStorage.removeItem(key);
    window.sessionStorage.removeItem(csrfKey);
    window.localStorage.removeItem(key); // Remove tokens left by the previous client implementation.
  },
};
