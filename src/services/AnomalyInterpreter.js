import {removeExtraSpaces} from "./Utils";

export const ID_TOKEN = 0;
export const STRING_TOKEN = 1;
export const PERCENT_TOKEN = 2;
export const DISTANCE_TOKEN = 3;
export const ENDL_TOKEN = 4;

const isIdTokenRegex = /^[A-Z]{3}-\d{3}$/;
const isPercentTokenRegex = /^([1-9]\d*|0)([.,]\d+)%$/;
const isDistanceTokenRegex = /^([1-9]\d*|0)([.,]\d+)* ((AU)|(km)|(m))$/;

export function isIdToken(str) {
  return str.match(isIdTokenRegex);
}

export function isPercentToken(str) {
  return str.match(isPercentTokenRegex);
}

export function isDistanceToken(str) {
  return str.match(isDistanceTokenRegex);
}

export class SintacticAnalyser {
  constructor(text) {
    this.ptn = 0;
    this.text = text.replaceAll('  ', '\t');
    this.token = '';
    this.tokens = [];
  }

  calculateTokens() {
    this.consumeTabs();

    while (this.next()) {
      if (this.getPos() === '\t') {
        this.calculateNextToken();
        this.consumeTabs();
      }
      if (this.getPos() === '\n') {
        this.calculateNextToken();
        this.consumeEndls();
      }
    }

    if (this.token.length > 0) {
      this.calculateNextToken();
    }

    return this.tokens;
  }

  next(consume = true) {
    if (this.ptn < this.text.length) {
      this.token += consume ? this.getPos() : '';
      return this.ptn++ < this.text.length;
    }
    return false;
  }

  getPos() {
    return this.text[this.ptn];
  }

  consumeEndls() {
    while (this.text[this.ptn] === '\n' && this.ptn < this.text.length) {
      this.ptn++;
    }
    this.calculateNextToken('\n');
  }

  calculateNextToken(value = null) {
    value = value !== null ? value : this.token;

    let type = STRING_TOKEN;
    if (value === '\n') {
      type = ENDL_TOKEN;
    } else if (isIdToken(value)) {
      type = ID_TOKEN;
    } else if (isPercentToken(value)) {
      type = PERCENT_TOKEN;
    } else if (isDistanceToken(value)) {
      type = DISTANCE_TOKEN;
    }

    this.tokens.push({type, value});
    this.token = '';
  }

  consumeTabs() {
    while (this.text[this.ptn] === '\t' && this.ptn < this.text.length) {
      this.ptn++;
    }
  }
}

export const ANOMALY_CATEGORY_ANOMALY = 'Cosmic Anomaly';
export const ANOMALY_CATEGORY_SIGNATURE = 'Cosmic Signature';
export const ANOMALY_TYPE_WORMHOLE = 'Wormhole';
export const ANOMALY_TYPE_COMBAT = 'Combat Site';
export const ANOMALY_TYPE_ORE = 'Ore Site';
export const ANOMALY_TYPE_GAS = 'Gas Site';
export const ANOMALY_TYPE_RELIC = 'Relic Site';
export const ANOMALY_TYPE_DATA = 'Data Site';
export const ANOMALY_TYPE_UNKNOWN = 'Unknown';

export class LexicoAnalyser {
  constructor(text) {
    const sintacticAnalyser = new SintacticAnalyser(text);
    this.tokens = sintacticAnalyser.calculateTokens();
    this.ptr = 0;
    this.step = 0;

    this.anomalies = [];
    this.anomaly = {};
  }

  readAnomalies() {
    while (this.ptr < this.tokens.length) {
      this.resetCurrentAnomaly();
      if (this.readLine()) {
        this.anomalies.push(this.anomaly);
      }
      if (this.token() && this.token().type === ENDL_TOKEN) {
        this.consumeToken(ENDL_TOKEN);
      }
    }
    return this.anomalies;
  }

  resetCurrentAnomaly() {
    const date = new Date();
    date.setDate(date.getDate() + 3);
    this.anomaly = {
      id: '',
      expiration: date.getTime(),
      name: '',
      category: '',
      type: ANOMALY_TYPE_UNKNOWN,
      percent: '',
      distance: '',
      life: 'stable',
      mass: 'stable'
    };
  }

  readLine() {
    try {
      this.readAnomalyId();
      this.readAnomalyCategory();
      if (this.token().type === PERCENT_TOKEN) {
        this.readPercentAndDistance();
        return true;
      }
      this.readAnomalyType();
      if (this.token().type === PERCENT_TOKEN) {
        this.readPercentAndDistance();
        return true;
      }
      this.readAnomalyName();
      this.readPercentAndDistance();
      return true
    } catch (e) {
      console.log(e);
      this.consumeUntilEndl();
    }
    return false;
  }

  readAnomalyId() {
    this.anomaly.id = removeExtraSpaces(this.consumeToken(ID_TOKEN).value);
  }

  readAnomalyCategory() {
    switch (this.token().value) {
      case ANOMALY_CATEGORY_ANOMALY:
      case ANOMALY_CATEGORY_SIGNATURE:
        this.anomaly.category = removeExtraSpaces(this.consumeToken(STRING_TOKEN).value);
        break
      default:
        console.log(this.token().value)
        throw new Error('Error with read anomaly category');
    }
  }

  readAnomalyType() {
    switch (this.token().value) {
      case ANOMALY_TYPE_WORMHOLE:
      case ANOMALY_TYPE_DATA:
      case ANOMALY_TYPE_COMBAT:
      case ANOMALY_TYPE_GAS:
      case ANOMALY_TYPE_ORE:
      case ANOMALY_TYPE_UNKNOWN:
      case ANOMALY_TYPE_RELIC:
        this.anomaly.type = removeExtraSpaces(this.consumeToken(STRING_TOKEN).value);
        break
      default:
        throw new Error('Error with read anomaly type');
    }
  }

  readAnomalyName() {
    this.anomaly.name = removeExtraSpaces(this.consumeToken(STRING_TOKEN).value);
  }

  readPercentAndDistance() {
    this.anomaly.percent = removeExtraSpaces(this.consumeToken(PERCENT_TOKEN).value);
    this.anomaly.distance = removeExtraSpaces(this.consumeToken(DISTANCE_TOKEN).value);
  }

  consumeToken(tokenType, matchStr = null) {
    if (this.token().type === tokenType &&
      ((matchStr !== null && matchStr === this.token().value) || matchStr === null)) {
      return this.next();
    }
    throw new Error(`Token (${tokenType}) is not present`);
  }

  token() {
    if (this.ptr >= this.tokens.length) {
      return null;
    }
    return this.tokens[this.ptr];
  }

  consumeUntilEndl() {
    while (this.ptr < this.tokens.length && this.tokens[this.ptr].type !== ENDL_TOKEN) {
      this.next();
    }
  }

  next() {
    if (this.ptr < this.tokens.length) {
      return this.tokens[this.ptr++];
    }
    return null;
  }
}
