/**
 * @param text {string}
 * @returns {string}
 */
export function removeExtraSpaces(text) {
  return text.trim().replace(/ +/g, ' ');
}
