## master

## 1.3.4 (August 29, 2016)
* fix: support `express-graphql@0.5.4`. Thanks @genbit [issue #19](https://github.com/nodkz/react-relay-network-layer/issues/19)

## 1.3.3 (August 5, 2016)
* fix: batch express middleware. It should not call next middleware. Thanks @genbit [issue #13](https://github.com/nodkz/react-relay-network-layer/issues/13)

## 1.3.2 (July 28, 2016)
* fix: gqErrors middleware, it does not display errors for single request (thanks to @jibingeo)

## 1.3.1 (July 12, 2016)
* fix: catch react-native error, when network request fails, eg. offline ([issue #7](https://github.com/nodkz/react-relay-network-layer/issues/7)).

## 1.2.0 (June 21, 2016)
* fix: remove `whatwg-fetch` polyfill, due problem in React Native ([issue #8](https://github.com/nodkz/react-relay-network-layer/issues/8)).

If your client does not have `fetch` global method, you should include polyfill explicitly in you code:
```js
  import 'whatwg-fetch'; // for old browsers
  or
  import 'node-fetch';  // for old node versions
  or
  import 'fetch-everywhere'; // fresh isomorphic fetch polyfill, that supports all clients (not tested ;)
```
Thanks to @roman01la and @edvinerikson.

## 1.1.4 (June 15, 2016)
* feat: add `allowEmptyToken` option for `authMiddleware` to allow made a request without Authorization header if token is empty

## 1.1.3 (June 13, 2016)
* fix: files upload with auth middleware (thanks to @alexanderlamb)

## 1.1.2 (May 27, 2016)
* feat: improve performance of `graphqlBatchHTTPWrapper`, by removing JSON.parse

## 1.1.1 (May 27, 2016)
* fix: add support for express-graphql@0.5.2

## 1.1.0 (May 17, 2016)

* feat: Add `json` param to `response`. Now it's available for middleware in bubbling phase (res.json).
* feat: new middleware `gqErrors` - display `errors` data to console from graphql response
![gqErrorsMiddleware](https://cloud.githubusercontent.com/assets/1946920/15324650/28582d12-1c69-11e6-9ef3-6834dee031e6.png)
* experimental: `deferMiddleware`, right now it's only inform Relay that NetworkLayer support this feature. See discussion about `defer` here [relay/issues/288](https://github.com/facebook/relay/issues/288)

## 1.0.3 (May 4, 2016)

* feat: improved `retryMiddleware` with thunk retries delays and force fetch

## 1.0.2 (May 4, 2016)

* feat: New `retryMiddleware` for request retry if the initial request fails (thanks to @mario-jerkovic)
* fix: `authMiddleware` which pass lowercased header `Authorization`

## 1.0.1 (April 25, 2016)

* docs: Prepare `README.md` for npmjs.com

## 1.0.0 (April 23, 2016)

* Initial public release
