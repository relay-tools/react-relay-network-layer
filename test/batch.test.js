import { assert } from 'chai';
import fetchMock from 'fetch-mock';
import { RelayNetworkLayer } from '../src';
import { mockReq } from './testutils';

describe('Batch tests', () => {
  const middlewares = [];
  const rnl = new RelayNetworkLayer(middlewares);

  afterEach(() => {
    fetchMock.restore();
  });

  it('should make a successfull batch request', () => {
    fetchMock.post('/graphql/batch', [
      {},
      {},
    ]);

    assert.isFulfilled(rnl.sendQueries([mockReq(), mockReq()]));
  });

  it('should handle network failure', () => {
    fetchMock.mock({
      matcher: '/graphql/batch',
      response: {
        throws: new Error('Network connection error'),
      },
      method: 'POST',
    });
    assert.isRejected(rnl.sendQueries([mockReq(), mockReq()]), /Network connection error/);
  });

  it('should handle server errors', () => {
    fetchMock.mock({
      matcher: '/graphql/batch',
      response: {
        status: 200,
        body: [
          {
            id: 1,
            payload: {
              errors: [
                { location: 1, message: 'major error' },
              ],
            },
          },
          { id: 2, payload: { data: {} } },
        ],
      },
      method: 'POST',
    });

    const req1 = mockReq(1);
    req1.reject = (err) => {
      assert(err instanceof Error, 'should be an error');
    };
    const req2 = mockReq(2);
    assert.isFulfilled(rnl.sendQueries([req1, req2]));
  });

  it('should handle responces without payload wrapper', () => {
    fetchMock.mock({
      matcher: '/graphql/batch',
      response: {
        status: 200,
        body: [
          {
            id: 1,
            errors: [
              { location: 1, message: 'major error' },
            ],
          },
          { id: 2, data: {} },
        ],
      },
      method: 'POST',
    });

    const req1 = mockReq(1);
    req1.reject = (err) => {
      assert(err instanceof Error, 'should be an error');
    };
    const req2 = mockReq(2);
    assert.isFulfilled(rnl.sendQueries([req1, req2]));
  });
});
