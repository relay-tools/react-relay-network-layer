ReactRelayNetworkLayer
==========================

The `ReactRelayNetworkLayer` is a [Relay Network Layer](https://facebook.github.io/relay/docs/guides-network-layer.html) 
with query batching and middleware support:
- **auth** - for adding auth token, and refreshing it if gets 401 response from server.
- **url** - for manipulating fetch `url` on fly via thunk
- **logger** - for logging requests and responses
- **perf** - simple time measure for network request

The main purpose is allowing change requests on fly via middlewares.

Installation
============

`npm install react-relay-network-layer`


Example of using middlewares
============================
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


Batching several requests:
==========================

Sometimes Relay splitting query into multiple requests. This `ReactRelayNetworkLayer` can 
combine it in one http request.

Firstly, you should prepare server-side to proceed batch request:

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

After that, you can enable batch queries on the client:

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
- find maintainers
 - who fix my ugly readme.MD 
 - write tests