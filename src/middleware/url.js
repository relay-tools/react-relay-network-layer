/* eslint-disable no-param-reassign */

import { isFunction } from '../utils';

export default function urlMiddleware(opts = {}) {
  const urlOrThunk = opts.url || '/graphql';
  const fetchOpts = opts.opts;

  return next =>
    req => {
      if (fetchOpts) {
        const { headers, ...otherOpts } = fetchOpts;
        Object.assign(req, otherOpts);
        if (headers) {
          Object.assign(req.headers, headers);
        }
      }

      if (req.relayReqType !== 'batch-query') {
        req.url = isFunction(urlOrThunk) ? urlOrThunk(req) : urlOrThunk;
      }

      return next(req);
    };
}
