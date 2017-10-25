/* eslint-disable no-param-reassign */

import { isFunction } from '../utils';

// Max out at roughly 100kb (express-graphql imposed max)
const DEFAULT_BATCH_SIZE = 102400;

export default function batchMiddleware(opts = {}) {
  const batchTimeout = opts.batchTimeout || 0; // 0 is the same as nextTick in nodeJS
  const allowMutations = opts.allowMutations || false;
  const batchUrl = opts.batchUrl || '/graphql/batch';
  const maxBatchSize = opts.maxBatchSize || DEFAULT_BATCH_SIZE;
  const singleton = {};

  return next =>
    req => {
      // never batch mutations with files
      // mutation without files can be batched if allowMutations = true
      if (
        req.relayReqType === 'mutation' &&
        (!allowMutations || (global.FormData && req.body instanceof FormData))
      ) {
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
    const relayReqId = req.relayReqId;
    const requestMap = singleton.batcher.requestMap;
    requestMap[relayReqId] = requestMap[relayReqId] || [];
    requestMap[relayReqId].push({
      req,
      completeOk: res => {
        req.done = true;
        resolve(res);
      },
      completeErr: err => {
        req.done = true;
        reject(err);
      },
    });
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
      sendRequests(batcher.requestMap, next, opts)
        .then(() => finalizeUncompleted(batcher))
        .catch(() => finalizeUncompleted(batcher));
    },
    opts.batchTimeout
  );

  return batcher;
}

function sendRequests(requestMap, next, opts) {
  const ids = Object.keys(requestMap);

  if (ids.length === 1) {
    // SEND AS SINGLE QUERY
    const requests = requestMap[ids[0]];

    return next(requests[0].req).then(res => {
      requests.forEach(request => request.completeOk(res));
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
      body: `[${ids.map(id => requestMap[id][0].req.body).join(',')}]`,
    };

    return next(req)
      .then(batchResponse => {
        if (!batchResponse || !Array.isArray(batchResponse.json)) {
          throw new Error('Wrong response from server');
        }

        batchResponse.json.forEach(res => {
          if (!res) return;
          const requests = requestMap[res.id];
          if (requests) {
            const responsePayload = copyBatchResponse(batchResponse, res);
            requests.forEach(request => request.completeOk(responsePayload));
          }
        });
      })
      .catch(e => {
        ids.forEach(id => {
          const requests = requestMap[id];
          requests.forEach(request => request.completeErr(e));
        });
      });
  }

  return Promise.resolve();
}

// check that server returns responses for all requests
function finalizeUncompleted(batcher) {
  Object.keys(batcher.requestMap).forEach(id => {
    const requests = batcher.requestMap[id];
    requests.forEach(request => {
      if (!request.req.done) {
        request.completeErr(
          new Error(
            `Server does not return response for request with id ${id} \n` +
              `eg. { "id": "${id}", "data": {} }`
          )
        );
      }
    });
  });
}

function copyBatchResponse(batchResponse, res) {
  // Fallback for graphql-graphene and apollo-server batch responses
  const json = res.payload || res;
  return {
    ok: batchResponse.ok,
    status: batchResponse.status,
    statusText: batchResponse.statusText,
    url: batchResponse.url,
    headers: batchResponse.headers,
    json,
  };
}
