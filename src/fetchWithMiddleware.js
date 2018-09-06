/* @flow */
/* eslint-disable no-param-reassign, prefer-const */

import { createRequestError } from './createRequestError';
import type {
  Middleware,
  RRNLRequestObject,
  RRNLResponseObject,
  MiddlewareNextFn,
  RRNLOptions,
  RRNLResponsePayload,
} from './definition';

function runFetch(req: RRNLRequestObject): Promise<RRNLResponseObject> {
  let { url, ...opts } = req;

  if (!url) {
    if (req.relayReqType === 'batch-query') {
      url = '/graphql/batch';
    } else {
      url = '/graphql';
    }
  }

  return fetch(url, (opts: any))
    .then(res => {
      if (res.status < 200 || res.status >= 300) {
        return res.text().then(text => {
          const err: any = new Error(text);
          err.fetchResponse = res;
          throw err;
        });
      }
      return res;
    })
    .then(res => {
      return res.json().then(payload => {
        return { ...res, payload };
      });
    });
}

export default function fetchWithMiddleware(
  req: RRNLRequestObject,
  middlewares: Middleware[],
  options: RRNLOptions
): Promise<RRNLResponsePayload> {
  const wrappedFetch: MiddlewareNextFn = compose(...middlewares)(runFetch);

  return wrappedFetch(req).then(res => {
    const { payload } = res;
    const { noThrow = false } = options;
    const hasErrors =
      !payload || payload.hasOwnProperty('errors') || !payload.hasOwnProperty('data');

    /** Only throw the Error if noThrow === false */
    if (!noThrow && hasErrors) {
      throw createRequestError(req, res);
    }

    /** Return payload.data as well as the errors (if they exist) */
    return {
      data: (payload && payload.data) || null,
      errors: hasErrors ? createRequestError(req, res) : null,
    };
  });
}

/**
 * Composes single-argument functions from right to left. The rightmost
 * function can take multiple arguments as it provides the signature for
 * the resulting composite function.
 *
 * @param {...Function} funcs The functions to compose.
 * @returns {Function} A function obtained by composing the argument functions
 * from right to left. For example, compose(f, g, h) is identical to doing
 * (...args) => f(g(h(...args))).
 */
function compose(...funcs) {
  if (funcs.length === 0) {
    return arg => arg;
  } else {
    const last = funcs[funcs.length - 1];
    const rest = funcs.slice(0, -1);
    return (...args) => rest.reduceRight((composed, f) => f(composed), last(...args));
  }
}
