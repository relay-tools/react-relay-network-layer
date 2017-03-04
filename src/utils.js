/* eslint-disable  */

export function isFunction(obj) {
  return !!(obj && obj.constructor && obj.call && obj.apply);
}
