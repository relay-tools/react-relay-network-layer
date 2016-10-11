export const mockReq = (reqid) => {
  return {
    getID() {
      return reqid || 'reqid';
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
      return Promise.reject(err);
    },
    resolve(resp) {
      return Promise.resolve(resp);
    },
  };
};
