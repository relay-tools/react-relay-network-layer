/* eslint-disable import/prefer-default-export, no-param-reassign */

export const mockReq = (reqid, { query, files } = {}) => {
  if (!reqid) reqid = Math.random();

  let error;
  let payload;

  return {
    getID() {
      return reqid;
    },
    getQueryString() {
      return query || '{}';
    },
    getDebugName() {
      return `debugname${reqid}`;
    },
    getVariables() {
      return {};
    },
    getFiles() {
      return files;
    },
    reject(err) {
      error = err;
    },
    resolve(resp) {
      payload = resp;
    },
    get error() {
      return error;
    },
    get payload() {
      return payload;
    },
  };
};

export const mockReqWithSize = (reqid, size) => {
  return mockReq(reqid, { query: `{${'x'.repeat(size)}}` });
};

export const mockReqWithFiles = reqid => {
  return mockReq(reqid, { files: { file1: 'data', file2: 'data' } });
};
