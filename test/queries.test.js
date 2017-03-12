import { assert } from 'chai';
import fetchMock from 'fetch-mock';
import { RelayNetworkLayer } from '../src';
import { mockReq } from './testutils';

describe('Queries tests', () => {
  const middlewares = [];
  const rnl = new RelayNetworkLayer(middlewares);

  beforeEach(() => {
    fetchMock.restore();
  });

  it('should make a successfull query', () => {
    fetchMock.mock({
      matcher: '/graphql',
      response: {
        status: 200,
        body: { data: {} },
        sendAsJson: true,
      },
      method: 'POST',
    });
    return assert.isFulfilled(rnl.sendQueries([mockReq()]));
  });

  it('should fail correctly on network failure', () => {
    fetchMock.mock({
      matcher: '/graphql',
      response: {
        throws: new Error('Network connection error'),
      },
      method: 'POST',
    });
    return assert.isRejected(
      rnl.sendQueries([mockReq()]),
      /Network connection error/
    );
  });

  it('should handle error response', () => {
    fetchMock.mock({
      matcher: '/graphql',
      response: {
        status: 200,
        body: {
          errors: [{ location: 1, message: 'major error' }],
        },
      },
      method: 'POST',
    });

    const req1 = mockReq(1);
    req1.reject = err => {
      assert(err instanceof Error, 'should be an error');
    };

    return assert.isRejected(rnl.sendQueries([req1]));
  });
});
