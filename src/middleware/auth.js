/* eslint-disable no-param-reassign, arrow-body-style, dot-notation */

import { isFunction } from '../utils';

class WrongTokenError extends Error {
  constructor(msg, res = {}) {
    super(msg);
    this.res = res;
    this.name = 'WrongTokenError';
  }
}

export default function authMiddleware(opts = {}) {
  const {
    token: tokenOrThunk,
    tokenRefreshPromise,
    allowEmptyToken = false,
    prefix = 'Bearer ',
  } = opts;

  return next => req => {
    return new Promise((resolve, reject) => {
      const token = isFunction(tokenOrThunk) ? tokenOrThunk(req) : tokenOrThunk;
      if (!token && tokenRefreshPromise && !allowEmptyToken) {
        reject(new WrongTokenError('Token not provided, try fetch new one'));
      }
      resolve(token);
    }).then(token => {
      if (token) {
        req.headers['Authorization'] = `${prefix}${token}`;
      }
      return next(req);
    }).then(res => {
      if (res.status === 401 && tokenRefreshPromise) {
        throw new WrongTokenError('Was recieved status 401 from server', res);
      }
      return res;
    }).catch(err => {
      if (err.name === 'WrongTokenError') {
        return tokenRefreshPromise(req, err.res)
          .then(newToken => {
            req.headers['Authorization'] = `${prefix}${newToken}`;
            return next(req); // re-run query with new token
          });
      }

      throw err;
    });
  };
}
