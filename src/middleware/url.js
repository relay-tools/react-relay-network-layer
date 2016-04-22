/* eslint-disable no-param-reassign */

import { isFunction } from '../utils';

export default function urlMiddleware(opts = {}) {
  const urlOrThunk = opts.url || '/graphql';
  const batchUrlOrThunk = opts.batchUrl || '/graphql/batch';
  const fetchOpts = opts.opts;

  return next => req => {
    if (fetchOpts) {
      const { headers, ...otherOpts } = fetchOpts;
      Object.assign(req, otherOpts);
      if (headers) {
        Object.assign(req.headers, headers);
      }
    }

    let url;
    if (req.relayReqType === 'batch-query') {
      url = batchUrlOrThunk;
    } else {
      url = urlOrThunk;
    }

    req.url = isFunction(url) ? url(req) : url;

    return next(req);
  };
}
