/* eslint-disable no-console */

export default function performanceMiddleware(opts = {}) {
  const logger = opts.logger || console.log.bind(console, '[RELAY-NETWORK]');

  return next =>
    req => {
      // get query name here, because `req` can be changed after `next()` call
      const query = `${req.relayReqType} ${req.relayReqId}`;

      const start = new Date().getTime();

      return next(req).then(res => {
        const end = new Date().getTime();
        logger(`${query}: ${end - start}ms`);
        return res;
      });
    };
}
