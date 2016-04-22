import { queryPre, queryPost } from './_query';

export default function queries(relayRequestList, fetchWithMiddleware) {
  return Promise.all(
    relayRequestList.map(relayRequest => {
      const req = queryPre(relayRequest);
      const fetchPromise = fetchWithMiddleware(req);
      return queryPost(relayRequest, fetchPromise);
    })
  );
}
