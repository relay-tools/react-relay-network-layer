/* eslint-disable no-param-reassign */

import createRequestError from './createRequestError';

export default function fetchWithMiddleware(reqFromRelay, middlewares) {
  const fetchAfterAllWrappers = req => {
    let { url, ...opts } = req;

    if (!url) {
      if (req.relayReqType === 'batch-query') {
        url = '/graphql/batch';
      } else {
        url = '/graphql';
      }
    }

    return fetch(url, opts)
      .then(res => {
        if (res.status >= 200 && res.status < 300) {
          return res;
        }
        return res.text().then(text => {
          const err = new Error(text);
          err.fetchResponse = res;
          throw err;
        });
      })
      .then(res => {
        // sub-promise for combining `res` with parsed json
        return res.json().then(json => {
          res.json = json;
          return res;
        });
      });
  };

  const wrappedFetch = compose(...middlewares)(fetchAfterAllWrappers);

  return wrappedFetch(reqFromRelay).then(res => {
    const payload = res.json;
    if ({}.hasOwnProperty.call(payload, 'errors')) {
      throw createRequestError(
        reqFromRelay.relayReqObj,
        reqFromRelay.relayReqType,
        '200',
        payload
      );
    } else if (!{}.hasOwnProperty.call(payload, 'data')) {
      throw new Error(
        'Server response.data was missing for query `' +
          reqFromRelay.relayReqObj.getDebugName() +
          '`.'
      );
    }
    return payload.data;
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
    return (...args) =>
      rest.reduceRight((composed, f) => f(composed), last(...args));
  }
}
