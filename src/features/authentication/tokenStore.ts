// One tab-scoped token store; user details are always restored from /auth/me.
const key = 'access_token';
export const tokenStore = {
  get: () => window.sessionStorage.getItem(key),
  set: (token: string) => window.sessionStorage.setItem(key, token),
  clear: () => {
    window.sessionStorage.removeItem(key);
    window.localStorage.removeItem(key); // Remove tokens left by the previous client implementation.
  },
};
