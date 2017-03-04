/* eslint-disable no-unused-vars */

export default function deferMiddleware(opts = {}) {
  const middleware = next => req => next(req);

  middleware.supports = ['defer'];

  return middleware;
}
