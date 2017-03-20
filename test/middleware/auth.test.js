import { assert } from 'chai';
import fetchMock from 'fetch-mock';
import { RelayNetworkLayer } from '../../src';
import { mockReq } from '../testutils';
import authMiddleware from '../../src/middleware/auth';

describe('Middleware / auth', () => {
  describe('`token` option as string (with default `prefix` and `header`)', () => {
    const rnl = new RelayNetworkLayer([
      authMiddleware({
        token: '123',
        tokenRefreshPromise: () => 345,
      }),
    ]);

    beforeEach(() => {
      fetchMock.restore();

      fetchMock.mock({
        matcher: '/graphql',
        response: {
          status: 200,
          body: { data: 'PAYLOAD' },
          sendAsJson: true,
        },
        method: 'POST',
      });
    });

    it('should work with query', () => {
      const req1 = mockReq();
      return rnl.sendQueries([req1]).then(() => {
        assert.equal(req1.payload.response, 'PAYLOAD');
        const reqs = fetchMock.calls('/graphql');
        assert.equal(reqs.length, 1);
        assert.equal(reqs[0][1].headers.Authorization, 'Bearer 123');
      });
    });

    it('should work with mutation', () => {
      const req1 = mockReq();
      return assert.isFulfilled(
        rnl.sendMutation(req1).then(() => {
          assert.equal(req1.payload.response, 'PAYLOAD');
          const reqs = fetchMock.calls('/graphql');
          assert.equal(reqs.length, 1);
          assert.equal(reqs[0][1].headers.Authorization, 'Bearer 123');
        })
      );
    });
  });

  describe('`token` option as thunk (with custom `prefix` and `header`)', () => {
    const rnl = new RelayNetworkLayer([
      authMiddleware({
        token: () => '333',
        tokenRefreshPromise: () => 345,
        prefix: 'MyBearer ',
        header: 'MyAuthorization',
      }),
    ]);

    beforeEach(() => {
      fetchMock.restore();

      fetchMock.mock({
        matcher: '/graphql',
        response: {
          status: 200,
          body: { data: 'PAYLOAD' },
          sendAsJson: true,
        },
        method: 'POST',
      });
    });

    it('should work with query', () => {
      const req1 = mockReq();
      return rnl.sendQueries([req1]).then(() => {
        assert.equal(req1.payload.response, 'PAYLOAD');
        const reqs = fetchMock.calls('/graphql');
        assert.equal(reqs.length, 1);
        assert.equal(reqs[0][1].headers.MyAuthorization, 'MyBearer 333');
      });
    });

    it('should work with mutation', () => {
      const req1 = mockReq();
      return assert.isFulfilled(
        rnl.sendMutation(req1).then(() => {
          assert.equal(req1.payload.response, 'PAYLOAD');
          const reqs = fetchMock.calls('/graphql');
          assert.equal(reqs.length, 1);
          assert.equal(reqs[0][1].headers.MyAuthorization, 'MyBearer 333');
        })
      );
    });
  });

  describe('`tokenRefreshPromise` should be called on 401 response', () => {
    beforeEach(() => {
      fetchMock.restore();

      fetchMock.mock({
        matcher: '/graphql',
        response: {
          status: 401,
          body: { data: 'PAYLOAD' },
          sendAsJson: true,
        },
        method: 'POST',
      });
    });

    it('should work with query (provided promise)', () => {
      const rnl = new RelayNetworkLayer([
        authMiddleware({
          token: '123',
          tokenRefreshPromise: () => Promise.resolve(345),
        }),
      ]);

      const req1 = mockReq();
      return rnl.sendQueries([req1]).then(() => {
        const reqs = fetchMock.calls('/graphql');
        assert.equal(reqs.length, 2);
        assert.equal(reqs[1][1].headers.Authorization, 'Bearer 345');
      });
    });

    it('should work with mutation (provided regular value)', () => {
      const rnl = new RelayNetworkLayer([
        authMiddleware({
          token: '123',
          tokenRefreshPromise: () => 456,
        }),
      ]);

      const req1 = mockReq();
      return assert.isFulfilled(
        rnl.sendMutation(req1).then(() => {
          const reqs = fetchMock.calls('/graphql');
          assert.equal(reqs.length, 2);
          assert.equal(reqs[1][1].headers.Authorization, 'Bearer 456');
        })
      );
    });
  });
});
