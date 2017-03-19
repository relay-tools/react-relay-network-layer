import { assert } from 'chai';
import fetchMock from 'fetch-mock';
import { RelayNetworkLayer } from '../../src';
import { mockReq } from '../testutils';
import urlMiddleware from '../../src/middleware/url';

describe('Middleware / url', () => {
  describe('url option as string', () => {
    const rnl = new RelayNetworkLayer([
      urlMiddleware({
        url: '/other/url',
      }),
    ]);

    beforeEach(() => {
      fetchMock.restore();

      fetchMock.mock({
        matcher: '/other/url',
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
      rnl.sendQueries([req1]).then(() => {
        assert.equal(req1.payload.response, 'PAYLOAD');
      });
    });

    it('should work with mutation', () => {
      const req1 = mockReq();
      return assert.isFulfilled(
        rnl.sendMutation(req1).then(() => {
          assert.equal(req1.payload.response, 'PAYLOAD');
        })
      );
    });
  });

  describe('url option as thunk', () => {
    const rnl = new RelayNetworkLayer([
      urlMiddleware({
        url: (_) => '/thunk_url', // eslint-disable-line
      }),
    ]);

    beforeEach(() => {
      fetchMock.restore();

      fetchMock.mock({
        matcher: '/thunk_url',
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
      rnl.sendQueries([req1]).then(() => {
        assert.equal(req1.payload.response, 'PAYLOAD');
      });
    });

    it('should work with mutation', () => {
      const req1 = mockReq();
      return assert.isFulfilled(
        rnl.sendMutation(req1).then(() => {
          assert.equal(req1.payload.response, 'PAYLOAD');
        })
      );
    });
  });
});
