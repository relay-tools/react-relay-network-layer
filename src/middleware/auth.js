/* @flow */
/* eslint-disable no-param-reassign, arrow-body-style, dot-notation */

import { isFunction } from '../utils';
import type { Middleware, RelayClassicRequest, RRNLRequestObject } from '../definition';

class WrongTokenError extends Error {
  res: ?RelayClassicRequest;

  constructor(msg, res: ?RelayClassicRequest) {
    super(msg);
    this.res = res;
    this.name = 'WrongTokenError';
  }
}

export type AuthMiddlewareOpts = {|
  token?: string | Promise<string> | ((req: RRNLRequestObject) => string | Promise<string>),
  tokenRefreshPromise?: (req: RRNLRequestObject, res: any) => string | Promise<string>,
  allowEmptyToken?: boolean,
  prefix?: string,
  header?: string,
|};

export default function authMiddleware(opts?: AuthMiddlewareOpts): Middleware {
  const {
    token: tokenOrThunk,
    tokenRefreshPromise,
    allowEmptyToken = false,
    prefix = 'Bearer ',
    header = 'Authorization',
  } =
    opts || {};

  let tokenRefreshInProgress = null;

  return next => req => {
    return new Promise((resolve, reject) => {
      // $FlowFixMe
      const token: string = isFunction(tokenOrThunk) ? tokenOrThunk(req) : tokenOrThunk;

      if (!token && tokenRefreshPromise && !allowEmptyToken) {
        reject(new WrongTokenError('Empty token'));
      }
      resolve(token);
    })
      .then(token => {
        if (token) {
          req.headers[header] = `${prefix}${token}`;
        }
        return next(req);
      })
      .catch(e => {
        if (e && tokenRefreshPromise) {
          if (e.message === 'Empty token' || (e.fetchResponse && e.fetchResponse.status === 401)) {
            if (tokenRefreshPromise) {
              if (!tokenRefreshInProgress) {
                tokenRefreshInProgress = Promise.resolve(
                  tokenRefreshPromise(req, e.fetchResponse)
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
          }
        }

        throw e;
      });
  };
}
