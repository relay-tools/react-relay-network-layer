/* eslint-disable no-param-reassign */

import { isFunction } from '../utils';

export default function batchMiddleware(opts = {}) {
  const batchTimeout = opts.batchTimeout || 0; // 0 is the same as nextTick in nodeJS
  const allowMutations = opts.allowMutations || false;
  const batchUrl = opts.batchUrl || '/graphql/batch';
  const singleton = {};

  return next =>
    req => {
      if (req.relayReqType === 'mutation' && !allowMutations) {
        return next(req);
      }

      return passThroughBatch(req, next, {
        batchTimeout,
        batchUrl,
        singleton,
      });
    };
}

function passThroughBatch(req, next, opts) {
  const { singleton } = opts;

  if (!singleton.batcher || !singleton.batcher.acceptRequests) {
    singleton.batcher = prepareNewBatcher(next, opts);
  }

  // here we can check batcher body size
  // and if needed splitting - create new batcher:
  //   singleton.batcher = prepareNewBatcher(next, opts);
  singleton.batcher.bodySize += req.body.length;

  // queue request
  return new Promise((resolve, reject) => {
    singleton.batcher.requestMap[req.relayReqId] = { req, resolve, reject };
  });
}

function prepareNewBatcher(next, opts) {
  const batcher = {
    bodySize: 0,
    requestMap: {},
    acceptRequests: true,
  };

  setTimeout(
    () => {
      batcher.acceptRequests = false;
      sendRequests(batcher.requestMap, next, opts).then(() => {
        // check that server returns responses for all requests
        Object.keys(batcher.requestMap).forEach(id => {
          if (!batcher.requestMap[id].done) {
            batcher.requestMap[id].reject(
              new Error(
                `Server does not return response for request with id ${id} \n` +
                  `eg. { "id": "${id}", "data": {} }`
              )
            );
          }
        });
      });
    },
    opts.batchTimeout
  );

  return batcher;
}

function sendRequests(requestMap, next, opts) {
  const ids = Object.keys(requestMap);

  if (ids.length === 1) {
    // SEND AS SINGLE QUERY
    const request = requestMap[ids[0]];

    return next(request.req).then(res => {
      request.done = true;
      request.resolve(res);
    });
  } else if (ids.length > 1) {
    // SEND AS BATCHED QUERY
    const url = isFunction(opts.batchUrl)
      ? opts.batchUrl(requestMap)
      : opts.batchUrl;

    const req = {
      url,
      relayReqId: `BATCH_QUERY:${ids.join(':')}`,
      relayReqObj: requestMap,
      relayReqType: 'batch-query',
      method: 'POST',
      headers: {
        Accept: '*/*',
        'Content-Type': 'application/json',
      },
      body: `[${ids.map(id => requestMap[id].req.body).join(',')}]`,
    };

    return next(req)
      .then(batchResponse => {
        if (!batchResponse || !Array.isArray(batchResponse.json)) {
          throw new Error('Wrong response from server');
        }

        batchResponse.json.forEach(res => {
          if (!res) return;
          const request = requestMap[res.id];
          if (request) {
            if (res.payload) {
              request.done = true;
              request.resolve(
                Object.assign({}, batchResponse, { json: res.payload })
              );
              return;
            }
            // compatibility with graphene-django and apollo-server batch format
            request.done = true;
            request.resolve(Object.assign({}, batchResponse, { json: res }));
          }
        });
      })
      .catch(e => {
        ids.forEach(id => {
          requestMap[id].done = true;
          requestMap[id].reject(e);
        });
      });
  }

  return Promise.resolve();
}
