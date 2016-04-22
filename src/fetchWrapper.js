/* eslint-disable no-use-before-define, no-else-return, prefer-const */

import 'whatwg-fetch';

export default function fetchWrapper(reqFromRelay, middlewares) {
  const fetchAfterAllWrappers = (req) => {
    let { url, ...opts } = req;

    if (!url) {
      if (req.relayReqType === 'batch-query') {
        url = '/graphql/batch';
      } else {
        url = '/graphql';
      }
    }

    return fetch(url, opts).then();
  };

  const wrappedFetch = compose(...middlewares)(fetchAfterAllWrappers);

  return wrappedFetch(reqFromRelay)
    .then(throwOnServerError)
    .then(response => response.json());
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

function throwOnServerError(response) {
  if (response.status >= 200 && response.status < 300) {
    return response;
  }

  throw response;
}
