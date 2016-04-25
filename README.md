ReactRelayNetworkLayer
==========================

The `ReactRelayNetworkLayer` is a [Relay Network Layer](https://facebook.github.io/relay/docs/guides-network-layer.html) 
with query batching and middleware support.

Main purpose to use this NetworkLayer:
- If your app is making enough individual queries to be a performance problem on first page load
- If your app should manipulate request on the fly, and made some fallbacks if request fails

Available middlewares:
- **auth** - for adding auth token, and refreshing it if gets 401 response from server.
- **url** - for manipulating fetch `url` on fly via thunk
- **logger** - for logging requests and responses
- **perf** - simple time measure for network request


Installation
============

`npm install react-relay-network-layer`


Usage of middlewares
============================
This code for **client side**.
```js
import Relay from 'react-relay';
import {
  RelayNetworkLayer, urlMiddleware, authMiddleware, loggerMiddleware, perfMiddleware,
} from 'react-relay-network-layer';

Relay.injectNetworkLayer(new RelayNetworkLayer([
  urlMiddleware({
    url: (req) => '/graphql',
  }),
  loggerMiddleware(),
  perfMiddleware(),
  authMiddleware({
    token: () => store.get('jwt'),
    tokenRefreshPromise: (req) => {
      console.log('[client.js] resolve token refresh', req);
      return fetch('/jwt/refresh')
        .then(res => res.json())
        .then(json => {
          const token = json.token;
          store.set('jwt', token);
          return token;
        })
        .catch(err => console.log('[client.js] ERROR can not refresh token', err));
    },
  }),
], { disableBatchQuery: true }));
```


Batching several requests into one
==================================

Joseph Savona [wrote](https://github.com/facebook/relay/issues/1058#issuecomment-213592051): For legacy reasons, Relay splits "plural" root queries into individual queries. In general we want to diff each root value separately, since different fields may be missing for different root values.

Also if you use [react-relay-router](https://github.com/relay-tools/react-router-relay) and have multiple root queries in one route pass, you may notice that default network layer will produce several http requests. 

So for avoiding multiple http-requests, the `ReactRelayNetworkLayer` is the right way to combine it in single http-request.

Firstly, you should prepare **server** to proceed the batch request:

```js
import express from 'express';
import graphqlHTTP from 'express-graphql';
import { graphqlBatchHTTPWrapper } from 'react-relay-network-layer';
import bodyParser from 'body-parser';
import myGraphqlSchema from './graphqlSchema';

// setup standart `graphqlHTTP` express-middleware
const graphQLMiddleware = graphqlHTTP({ schema: myGraphqlSchema });

// declare route for batch query
server.use('/graphql/batch',
  bodyParser.json(),
  graphqlBatchHTTPWrapper(graphQLMiddleware)
);

// declare standard graphql route
server.use('/graphql',
  graphQLMiddleware
);
```

And right after server side ready to accept batch queries, you may enable batching on the **client**:

```js
Relay.injectNetworkLayer(new RelayNetworkLayer([
  urlMiddleware({
    url: '/graphql',
    batchUrl: '/graphql/batch', // <--- route for batch queries 
  }),
], { disableBatchQuery: false })); // <--- set to FALSE, or may remove `disableBatchQuery` option at all
```

Internally batching in NetworkLayer prepare list of queries `[ {id, query, variables}, ...]` sends it to server. And server returns list of responces `[ {id, payload}, ...]`, (where `id` is the same value as client requested for identifying which data goes with which query, and `payload` is standard response of GraphQL server: `{ data, error }`).


How middlewares work internally
===============================
Middlewares on bottom layer use [fetch](https://github.com/github/fetch) method. So `req` is compliant with a `fetch()` options. And `res` can be obtained via `resPromise.then(res => ...)`, which returned by `fetch()`.

Middlewares have 3 phases: 
- `setup phase`, which runs only once, when middleware added to the NetworkLayer 
- `capturing phase`, when you may change request object, and pass it down via `next(req)` 
- `bubbling phase`, when you may change response promise, made re-request or pass it up unchanged

Basic skeleton of middleware:
```js
export default function skeletonMiddleware(opts = {}) {
  // [SETUP PHASE]: here you can process `opts`, when you create Middleware
  
  return next => req => {
    // [CAPTURING PHASE]: here you can change `req` object, before it will pass to following middlewares.
    // ...some code which modify `req`
    
    const resPromise = next(req); // pass request to following middleware and get response promise from it
    
    // [BUBBLING PHASE]: here you may change response of underlying middlewares, via promise syntax 
    // ...some code, which may add `then()` or `catch()` to response promise
    //    resPromise.then(res => { console.log(res); return res; })
    
    return resPromise; // return response promise to upper middleware 
  };
}
```

Middlewares use LIFO (last in, first out) stack. Or simply put - use `compose` function. So if you pass such middlewares [M1(opts), M2(opts)] to NetworkLayer it will be work such way:
- call setup phase of `M1` with its opts
- call setup phase of `M2` with its opts
- for each request
 - call capture phase of `M1`
 - call capture phase of `M2`
 - call `fetch` method
 - call bubbling phase of `M2`
 - call bubbling phase of `M1`
 - chain to `resPromise.then(res => res.json())` and pass this promise for resolving/rejecting Relay requests.


TODO
====
- write fetchWithRetries middleware
- improve performance of `graphqlBatchHTTPWrapper`, by removing JSON.parse (need find proper way how to get result from `express-graphql` in json, not stringified)    
- find maintainers
 - who made fixes and remove missunderstanding in readme.MD 
 - write tests
