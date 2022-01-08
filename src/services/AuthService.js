import {observable} from "./MessageHandler";

observable.on((type, data) => {
  if (type === 'refresh-token-response') {
    authService.authData = data.auth;
    authService.expire = data.expire;
  }
});

export const authService = {
  authData: {},
  expire: 0,

  getAuth() {
    return this.authData;
  },

  isAuth() {
    return this.authData && this.authData.token;
  },

  isNotExpired() {
    return this.expire > new Date().getTime();
  }
};
