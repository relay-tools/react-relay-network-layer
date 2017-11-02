import { assert } from 'chai';
import fetchMock from 'fetch-mock';
import FormData from 'form-data';
import { RelayNetworkLayer, batchMiddleware } from '../src';
import { mockReq, mockReqWithSize, mockReqWithFiles } from './testutils';

global.FormData = FormData;

describe('batchMiddleware', () => {
  const rnl = new RelayNetworkLayer([batchMiddleware()]);

  beforeEach(() => {
    fetchMock.restore();
  });

  it('should make a successfull single request', () => {
    fetchMock.post('/graphql', { data: {} });
    return assert.isFulfilled(rnl.sendQueries([mockReq()]));
  });

  it('should make a successfully batch request', () => {
    fetchMock.mock({
      matcher: '/graphql/batch',
      response: {
        status: 200,
        body: [{ id: 1, data: {} }, { id: 2, data: {} }],
      },
      method: 'POST',
    });

    return assert.isFulfilled(rnl.sendQueries([mockReq(1), mockReq(2)]));
  });

  it('should make a successfully batch request with duplicate request ids', () => {
    fetchMock.mock({
      matcher: '/graphql/batch',
      response: {
        status: 200,
        body: [{ id: 1, data: {} }, { id: 2, data: {} }],
      },
      method: 'POST',
    });

    const req1 = mockReq(1);
    const req2 = mockReq(2);
    const req3 = mockReq(2);

    return assert.isFulfilled(rnl.sendQueries([req1, req2, req3]));
  });

  it('should reject if server does not return response for request', () => {
    fetchMock.mock({
      matcher: '/graphql/batch',
      response: {
        status: 200,
        body: [{ data: {} }, { data: {} }],
      },
      method: 'POST',
    });

    const req1 = mockReq(1);
    const req2 = mockReq(2);
    return assert.isFulfilled(
      rnl.sendQueries([req1, req2]).then(() => {
        assert(req1.error instanceof Error);
        assert(
          /Server does not return response for request/.test(req1.error.message)
        );
        assert(req2.error instanceof Error);
        assert(
          /Server does not return response for request/.test(req2.error.message)
        );
      })
    );
  });

  it('should reject if server does not return response for duplicate request ids', () => {
    fetchMock.mock({
      matcher: '/graphql/batch',
      response: {
        status: 200,
        body: [{ data: {} }, { data: {} }],
      },
      method: 'POST',
    });

    const req1 = mockReq(1);
    const req2 = mockReq(2);
    const req3 = mockReq(2);
    return assert.isFulfilled(
      rnl.sendQueries([req1, req2, req3]).then(() => {
        assert(req1.error instanceof Error);
        assert(
          /Server does not return response for request/.test(req1.error.message)
        );
        assert(req2.error instanceof Error);
        assert(
          /Server does not return response for request/.test(req2.error.message)
        );
        assert(req3.error instanceof Error);
        assert(
          /Server does not return response for request/.test(req3.error.message)
        );
      })
    );
  });

  it('should handle network failure', () => {
    fetchMock.mock({
      matcher: '/graphql/batch',
      response: {
        throws: new Error('Network connection error'),
      },
      method: 'POST',
    });
    const req1 = mockReq(1);
    const req2 = mockReq(2);
    return assert.isFulfilled(rnl.sendQueries([req1, req2])).then(() => {
      assert(req1.error instanceof Error);
      assert(/Network connection error/.test(req1.error.message));
      assert(req2.error instanceof Error);
      assert(/Network connection error/.test(req2.error.message));
    });
  });

  it('should handle server errors for one request', () => {
    fetchMock.mock({
      matcher: '/graphql/batch',
      response: {
        status: 200,
        body: [
          {
            id: 1,
            payload: {
              errors: [{ location: 1, message: 'major error' }],
            },
          },
          { id: 2, payload: { data: {} } },
        ],
      },
      method: 'POST',
    });

    const req1 = mockReq(1);
    const req2 = mockReq(2);
    return assert.isFulfilled(rnl.sendQueries([req1, req2])).then(() => {
      assert(req1.error instanceof Error, 'should be an error');
      assert(!req2.error);
    });
  });

  it('should handle server errors for all requests', () => {
    fetchMock.mock({
      matcher: '/graphql/batch',
      response: {
        status: 200,
        body: {
          errors: [{ location: 1, message: 'major error' }],
        },
      },
      method: 'POST',
    });

    const req1 = mockReq(1);
    const req2 = mockReq(2);
    const req3 = mockReq(3);
    return assert.isFulfilled(rnl.sendQueries([req1, req2, req3])).then(() => {
      assert(req1.error instanceof Error, 'should be an error');
      assert(req2.error instanceof Error, 'should be an error');
      assert(req3.error instanceof Error, 'should be an error');
    });
  });

  it('should handle responses without payload wrapper', () => {
    fetchMock.mock({
      matcher: '/graphql/batch',
      response: {
        status: 200,
        body: [
          {
            id: 1,
            errors: [{ location: 1, message: 'major error' }],
          },
          { id: 2, data: {} },
        ],
      },
      method: 'POST',
    });

    const req1 = mockReq(1);
    const req2 = mockReq(2);
    return assert.isFulfilled(rnl.sendQueries([req1, req2])).then(() => {
      assert(req1.error instanceof Error, 'should be an error');
      assert(!req2.error);
    });
  });

  describe('option `batchTimeout`', () => {
    const rnl2 = new RelayNetworkLayer([batchMiddleware({ batchTimeout: 50 })]);

    beforeEach(() => {
      fetchMock.restore();
    });

    it('should gather different requests into one batch request', () => {
      fetchMock.mock({
        matcher: '/graphql/batch',
        response: {
          status: 200,
          body: [{ id: 1, data: {} }, { id: 2, data: {} }, { id: 3, data: {} }],
        },
        method: 'POST',
      });

      rnl2.sendQueries([mockReq(1)]);
      setTimeout(() => rnl2.sendQueries([mockReq(2)]), 30);

      return assert.isFulfilled(rnl2.sendQueries([mockReq(3)])).then(() => {
        const reqs = fetchMock.calls('/graphql/batch');
        assert.equal(reqs.length, 1);
        assert.equal(
          reqs[0][1].body,
          '[{"id":1,"query":"{}","variables":{}},{"id":2,"query":"{}","variables":{}},{"id":3,"query":"{}","variables":{}}]'
        );
      });
    });

    it('should gather different requests into two batch request', () => {
      fetchMock.mock({
        matcher: '/graphql/batch',
        response: {
          status: 200,
          body: [
            { id: 1, data: {} },
            { id: 2, data: {} },
            { id: 3, data: {} },
            { id: 4, data: {} },
          ],
        },
        method: 'POST',
      });

      rnl2.sendQueries([mockReq(1)]);

      setTimeout(() => rnl2.sendQueries([mockReq(2)]), 60);
      setTimeout(() => rnl2.sendQueries([mockReq(3)]), 70);

      return assert.isFulfilled(rnl2.sendQueries([mockReq(4)])).then(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            const reqs = fetchMock.calls('/graphql/batch');
            assert.equal(reqs.length, 2);
            assert.equal(
              reqs[0][1].body,
              '[{"id":1,"query":"{}","variables":{}},{"id":4,"query":"{}","variables":{}}]'
            );
            assert.equal(
              reqs[1][1].body,
              '[{"id":2,"query":"{}","variables":{}},{"id":3,"query":"{}","variables":{}}]'
            );
            resolve();
          }, 100);
        });
      });
    });
  });

  describe('option `maxBatchSize`', () => {
    const rnl3 = new RelayNetworkLayer([
      batchMiddleware({ maxBatchSize: 1024 * 10 }),
    ]);

    beforeEach(() => {
      fetchMock.restore();
    });

    it('should split large batched requests into multiple requests', () => {
      fetchMock.mock({
        matcher: '/graphql',
        response: {
          status: 200,
          body: { id: 5, data: {} },
        },
        method: 'POST',
      });

      fetchMock.mock({
        matcher: '/graphql/batch',
        response: {
          status: 200,
          body: [
            { id: 1, data: {} },
            { id: 2, data: {} },
            { id: 3, data: {} },
            { id: 4, data: {} },
          ],
        },
        method: 'POST',
      });

      const req1 = mockReqWithSize(1, 1024 * 7);
      const req2 = mockReqWithSize(2, 1024 * 2);
      const req3 = mockReqWithSize(3, 1024 * 5);
      const req4 = mockReqWithSize(4, 1024 * 4);
      const req5 = mockReqWithSize(5, 1024 * 11);

      return assert
        .isFulfilled(rnl3.sendQueries([req1, req2, req3, req4, req5]))
        .then(() => {
          const batchReqs = fetchMock.calls('/graphql/batch');
          const singleReqs = fetchMock.calls('/graphql');
          assert.equal(batchReqs.length, 2);
          assert.equal(singleReqs.length, 1);
        });
    });
  });

  describe('option `allowMutations`', () => {
    beforeEach(() => {
      fetchMock.restore();
    });

    it('should not batch mutations by default', () => {
      const rnlTimeout20 = new RelayNetworkLayer([
        batchMiddleware({ batchTimeout: 20 }),
      ]);

      fetchMock.mock({
        matcher: '/graphql',
        response: {
          status: 200,
          body: { id: 1, data: {} },
        },
        method: 'POST',
      });

      const req1 = mockReqWithFiles(1);
      rnlTimeout20.sendMutation(req1);
      const req2 = mockReqWithFiles(1);

      return assert.isFulfilled(rnlTimeout20.sendMutation(req2)).then(() => {
        const singleReqs = fetchMock.calls('/graphql');
        assert.equal(singleReqs.length, 2);
      });
    });

    it('should batch mutations if `allowMutations=true`', () => {
      const rnlAllowMutations = new RelayNetworkLayer([
        batchMiddleware({ batchTimeout: 20, allowMutations: true }),
      ]);

      fetchMock.mock({
        matcher: '/graphql/batch',
        response: {
          status: 200,
          body: [{ id: 1, data: {} }, { id: 2, data: {} }],
        },
        method: 'POST',
      });

      const req1 = mockReq(1);
      rnlAllowMutations.sendMutation(req1);
      const req2 = mockReq(2);

      return assert
        .isFulfilled(rnlAllowMutations.sendMutation(req2))
        .then(() => {
          const batchReqs = fetchMock.calls('/graphql/batch');
          assert.equal(batchReqs.length, 1);
        });
    });

    it('should not batch mutations with files if `allowMutations=true`', () => {
      const rnlAllowMutations = new RelayNetworkLayer([
        batchMiddleware({ batchTimeout: 20, allowMutations: true }),
      ]);

      fetchMock.mock({
        matcher: '/graphql',
        response: {
          status: 200,
          body: { id: 1, data: {} },
        },
        method: 'POST',
      });

      const req1 = mockReqWithFiles(1);
      rnlAllowMutations.sendMutation(req1);
      const req2 = mockReqWithFiles(1);

      return assert
        .isFulfilled(rnlAllowMutations.sendMutation(req2))
        .then(() => {
          const singleReqs = fetchMock.calls('/graphql');
          assert.equal(singleReqs.length, 2);
        });
    });
  });
});
