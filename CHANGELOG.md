## master

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
