/* eslint-disable no-param-reassign */

import fetchMock from 'fetch-mock';
import fetchWithMiddleware from '../fetchWithMiddleware';
import { mockReq as mockRelayReq } from '../__mocks__/mockReq';

function createMockReq(reqId) {
  const relayRequest = mockRelayReq(reqId);
  const req = {
    relayReqId: relayRequest.getID(),
    relayReqObj: relayRequest,
    relayReqType: 'query',
    method: 'POST',
    headers: {
      Accept: '*/*',
      'Content-Type': 'application/json',
    },
  };

  req.body = JSON.stringify({
    id: relayRequest.getID(),
    query: relayRequest.getQueryString(),
    variables: relayRequest.getVariables(),
  });

  return req;
}

describe('fetchWithMiddleware', () => {
  beforeEach(() => {
    fetchMock.restore();
  });

  it('should make a successfull request without middlewares', async () => {
    fetchMock.post('/graphql', { id: 1, data: { user: 123 } });

    const data = await fetchWithMiddleware(createMockReq(1), []);
    expect(data).toEqual({ user: 123 });
  });

  it('should make a successfull request with middlewares', async () => {
    const numPlus5 = next => req =>
      next(req).then(res => {
        res.json.data.num += 5;
        return res;
      });
    const numMultiply10 = next => req =>
      next(req).then(res => {
        res.json.data.num *= 10;
        return res;
      });

    fetchMock.post('/graphql', { id: 1, data: { num: 1 } });

    const data = await fetchWithMiddleware(createMockReq(1), [
      numPlus5,
      numMultiply10, // should be first, when changing response
    ]);
    expect(data).toEqual({ num: 15 });
  });
});
