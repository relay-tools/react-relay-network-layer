ReactRelayNetworkLayer
==========================

The `ReactRelayNetworkLayer` is a [Relay Network Layer](https://facebook.github.io/relay/docs/guides-network-layer.html) 
with query batching and middleware support.

Available middlewares:
- **auth** - for adding auth token, and refreshing it if gets 401 response from server.
- **url** - for manipulating fetch `url` on fly via thunk
- **logger** - for logging requests and responses
- **perf** - simple time measure for network request

The main purpose is allowing patch requests on fly via middlewares.

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


Batching several requests into one:
===================================

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


TODO
====
- write fetchWithRetries middleware
- improve performance of `graphqlBatchHTTPWrapper`, by removing JSON.parse (need find proper way how to get result from `express-graphql` in json, not stringified)    
- find maintainers
 - who made fixes and remove missunderstanding in readme.MD 
 - write tests
