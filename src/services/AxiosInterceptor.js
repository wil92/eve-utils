import axios from 'axios';

import {authService} from "./AuthService";
import {sendMessage, sendMessageAndWaitResponse} from "./MessageHandler";

export function jwtInterceptor() {
  axios.interceptors.request.use(async (request) => {
    if (!authService.isAuth() || !authService.isNotExpired()) {
      try {
        await sendMessageAndWaitResponse({type: 'refresh-token'});
      } catch (e) {
        sendMessage({type: 'logout'});
        return null;
      }
    }

    request.headers.common.Authorization = `Bearer ${authService.authData.access_token}`

    return request;
  });
}
