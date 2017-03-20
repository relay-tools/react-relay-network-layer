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
    header = 'Authorization',
  } = opts;

  let tokenRefreshInProgress = null;

  return next =>
    req => {
      return new Promise((resolve, reject) => {
        const token = isFunction(tokenOrThunk)
          ? tokenOrThunk(req)
          : tokenOrThunk;
        if (!token && tokenRefreshPromise && !allowEmptyToken) {
          reject(new WrongTokenError('Token not provided, try fetch new one'));
        }
        resolve(token);
      })
        .then(token => {
          if (token) {
            req.headers[header] = `${prefix}${token}`;
          }
          return next(req);
        })
        .catch(err => {
          if (
            err &&
            err.fetchResponse &&
            err.fetchResponse.status === 401 &&
            tokenRefreshPromise
          ) {
            throw new WrongTokenError(
              'Received status 401 from server',
              err.fetchResponse
            );
          } else {
            throw err;
          }
        })
        .catch(err => {
          if (err.name === 'WrongTokenError') {
            if (!tokenRefreshInProgress) {
              tokenRefreshInProgress = Promise.resolve(
                tokenRefreshPromise(req, err.res)
              ).then(newToken => {
                tokenRefreshInProgress = null;
                return newToken;
              });
            }

            return tokenRefreshInProgress.then(newToken => {
              req.headers[header] = `${prefix}${newToken}`;
              return next(req); // re-run query with new token
            });
          }

          throw err;
        });
    };
}
