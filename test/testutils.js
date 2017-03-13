/* eslint-disable import/prefer-default-export, no-param-reassign */

export const mockReq = reqid => {
  if (!reqid) reqid = Math.random();

  return {
    getID() {
      return reqid;
    },
    getQueryString() {
      return '{}';
    },
    getDebugName() {
      return `debugname${reqid}`;
    },
    getVariables() {
      return {};
    },
    reject(err) {
      return err;
    },
    resolve(resp) {
      return resp;
    },
  };
};

export const mockReqWithSize = (reqid, size) => {
  if (!reqid) reqid = Math.random();

  return {
    getID() {
      return reqid;
    },
    getQueryString() {
      return `{${Array(size).join('x')}}`;
    },
    getDebugName() {
      return `debugname${reqid}`;
    },
    getVariables() {
      return {};
    },
    reject(err) {
      return err;
    },
    resolve(resp) {
      return resp;
    },
  };
};
