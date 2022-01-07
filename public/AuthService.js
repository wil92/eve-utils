const crypto = require("crypto");
const rp = require('request-promise');
const fs = require("fs");

module.exports = (config) => {

  config = config || {
    authorizeEndpoint: '',
    clientId: '',
    scope: '',
    redirectUri: '',
    tokenEndpoint: ''
  };

  return {
    challengePair: {verifier: '', challenge: ''},
    config,
    state: '',

    requestAuthCode () {
      this.challengePair = this.getPKCEChallengePair();
      this.state = this.randomState();
      return this.getAuthoriseUrl(this.challengePair);
    },

    async requestAccessCode(callbackUrl) {

      return new Promise((resolve, reject) => {

        if (this.isValidAccessCodeCallBackUrl(callbackUrl)) {

          const authCode = this.getParameterByName('code', callbackUrl);

          // const state = this.getParameterByName('code', callbackUrl);
          // if (state !== this.state) {
          //   return reject('State value incorrect');
          // }

          if (authCode != null) {

            let verifier = this.challengePair.verifier;
            let options = this.getTokenPostRequest(authCode, verifier);

            return rp(options)
              .then((response) => {
                //TODO: return / store access code,
                //remove console.log, meant for demonstration purposes only
                console.log('access token.response: ' + JSON.stringify(response));
                const fs = require('fs');
                fs.writeFileSync('out2.txt', JSON.stringify(response), {encoding: "utf8"});
              })
              .catch((err) => {
                if (err) throw new Error(err);
              });
          } else {
            reject('Could not parse the authorization code');
          }

        } else {
          reject('Access code callback url not expected.');
        }
      });
    },

    getAuthoriseUrl(challengePair) {
      const redirectUri = encodeURIComponent(this.config.redirectUri);
      return `${this.config.authorizeEndpoint}?response_type=code&redirect_uri=${redirectUri}&client_id=${this.config.clientId}&scope=${this.config.scope}&code_challenge=${challengePair.challenge}&code_challenge_method=S256&state=${this.state}`;
    },

    getTokenPostRequest(authCode, verifier) {
      return {
        method: 'POST',
        url: this.config.tokenEndpoint,
        headers: {'content-type': 'application/json'},
        body: `{"grant_type":"authorization_code",
              "client_id": "${this.config.clientId}",
              "code_verifier": "${verifier}",
              "code": "${authCode}"
            }`
      };
    },

    isValidAccessCodeCallBackUrl(callbackUrl) {
      return callbackUrl.indexOf(this.config.redirectUri) > -1
    },

    getPKCEChallengePair() {
      let verifier = this.base64URLEncode(crypto.randomBytes(32));
      let challenge = this.base64URLEncode(this.sha256(verifier));
      return {verifier, challenge};
    },

    getParameterByName(name, url) {
      name = name.replace(/[\[\]]/g, "\\$&");
      var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
      if (!results) return null;
      if (!results[2]) return '';
      return decodeURIComponent(results[2].replace(/\+/g, " "));
    },

    base64URLEncode(str) {

      return str.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    },

    randomState() {
      return (new Array(10).fill(0)).reduce((p) => p + 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)], '');
    },

    sha256(buffer) {
      return crypto.createHash('sha256').update(buffer).digest();
    }
  };
}
