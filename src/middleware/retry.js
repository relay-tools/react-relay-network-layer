/* eslint-disable no-console */
import fetchWithRetries from 'fbjs/lib/fetchWithRetries';

function fetchOnError(request) {
  return fetchWithRetries(request.url, request).then((response) => response);
}

export default function retryMiddleware(opts = {}) {
  const fetchTimeout = opts.fetchTimeout || false;
  const retryDelays = opts.retryDelays || false;
  const statusCodes = opts.statusCodes || false;

  return next => req => (
    next(req).then(res => {
      if (res.status < 200 || res.status > 300 || !res.status.ok) {
        const request = Object.assign({}, req);

        if (fetchTimeout || retryDelays) {
          request.fetchTimeout = fetchTimeout;
          request.retryDelays = retryDelays;
        }
        if (statusCodes && statusCodes.indexOf(res.status) !== -1) {
          return fetchOnError(request);
        } else if (!statusCodes) {
          return fetchOnError(request);
        }
      }
      
      return next(req);
    })
  );
}
