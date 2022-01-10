import {observable} from "./MessageHandler";

observable.subscribe(message => {
  if (message.type === 'refresh-token-response') {
    authService.authData = message.auth;
    authService.expire = message.expire;
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
