import { queryPost } from './_query';

export default function queriesBatch(relayRequestList, fetchWithMiddleware) {
  const requestMap = {};
  relayRequestList.forEach((req) => {
    const reqId = req.getID();
    requestMap[reqId] = req;
  });

  const req = {
    relayReqId: `BATCH_QUERY:${Object.keys(requestMap).join(':')}`,
    relayReqObj: relayRequestList,
    relayReqType: 'batch-query',
    method: 'POST',
    headers: {
      Accept: '*/*',
      'Content-Type': 'application/json',
    },
  };

  req.body = JSON.stringify(
    Object.keys(requestMap).map((id) => ({
      id,
      query: requestMap[id].getQueryString(),
      variables: requestMap[id].getVariables(),
    }))
  );

  return fetchWithMiddleware(req)
    .then(batchResponses => {
      batchResponses.forEach((res) => {
        if (!res) return;
        const relayRequest = requestMap[res.id];

        if (relayRequest) {
          queryPost(
            relayRequest,
            new Promise(resolve => {
              if (res.payload) {
                resolve(res.payload);
                return;
              }
              // compatibility with graphene-django and apollo-server batch format
              resolve(res);
            })
          );
        }
      });
    }).catch(e => {
      return Promise.all(relayRequestList.map(relayRequest => {
        return relayRequest.reject(e);
      }));
    });
}
