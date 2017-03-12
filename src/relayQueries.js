/* eslint-disable no-param-reassign, prefer-template */

import formatRequestErrors from './formatRequestErrors';

export default function queries(relayRequestList, fetchWithMiddleware) {
  return Promise.all(
    relayRequestList.map(relayRequest => {
      const req = {
        relayReqId: relayRequest.getID(),
        relayReqObj: relayRequest,
        relayReqType: 'query',
        method: 'POST',
        headers: {
          Accept: '*/*',
          'Content-Type': 'application/json',
        },
        body: prepareRequestBody(relayRequest),
      };
      return queryPost(relayRequest, fetchWithMiddleware(req));
    })
  );
}

export function prepareRequestBody(relayRequest) {
  return JSON.stringify({
    id: relayRequest.getID(),
    query: relayRequest.getQueryString(),
    variables: relayRequest.getVariables(),
  });
}

export function queryPost(relayRequest, fetchPromise) {
  return fetchPromise
    .then(payload => {
      if ({}.hasOwnProperty.call(payload, 'errors')) {
        const error = new Error(
          'Server request for query `' +
            relayRequest.getDebugName() +
            '` ' +
            'failed for the following reasons:\n\n' +
            formatRequestErrors(relayRequest, payload.errors)
        );
        error.source = payload;
        throw new Error(error);
      } else if (!{}.hasOwnProperty.call(payload, 'data')) {
        throw new Error(
          'Server response.data was missing for query `' +
            relayRequest.getDebugName() +
            '`.'
        );
      }
      return relayRequest.resolve({ response: payload.data });
    })
    .catch(error => {
      relayRequest.reject(error);
      throw error;
    });
}
