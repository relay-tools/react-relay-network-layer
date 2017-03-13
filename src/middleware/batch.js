/* eslint-disable no-param-reassign */

import { isFunction } from '../utils';

// Max out at roughly 100kb (express-graphql imposed max)
const DEFAULT_BATCH_SIZE = 102400;

function copyBatchResponse(batchResponse, res) {
  // Supports graphql-js, graphql-graphene and apollo-server responses
  const json = res.payload ? res.payload : res;
  return {
    ok: batchResponse.ok,
    status: batchResponse.status,
    json,
  };
}

export default function batchMiddleware(opts = {}) {
  const batchTimeout = opts.batchTimeout || 0; // 0 is the same as nextTick in nodeJS
  const allowMutations = opts.allowMutations || false;
  const batchUrl = opts.batchUrl || '/graphql/batch';
  const maxBatchSize = opts.maxBatchSize || DEFAULT_BATCH_SIZE;
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
        maxBatchSize,
      });
    };
}

function passThroughBatch(req, next, opts) {
  const { singleton } = opts;

  if (!singleton.batcher || !singleton.batcher.acceptRequests) {
    singleton.batcher = prepareNewBatcher(next, opts);
  }

  if (singleton.batcher.bodySize + req.body.length + 1 > opts.maxBatchSize) {
    singleton.batcher = prepareNewBatcher(next, opts);
  }

  // +1 accounts for tailing comma after joining
  singleton.batcher.bodySize += req.body.length + 1;

  // queue request
  return new Promise((resolve, reject) => {
    singleton.batcher.requestMap[req.relayReqId] = { req, resolve, reject };
  });
}

function prepareNewBatcher(next, opts) {
  const batcher = {
    bodySize: 2, // account for '[]'
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
            const responsePayload = copyBatchResponse(batchResponse, res);
            request.done = true;
            request.resolve(responsePayload);
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
