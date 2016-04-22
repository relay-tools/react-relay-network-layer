/* eslint-disable no-param-reassign, no-use-before-define, prefer-template */

import formatRequestErrors from '../formatRequestErrors';

export default function mutation(relayRequest, fetchWithMiddleware) {
  const req = {
    relayReqId: Date.now(),
    relayReqObj: relayRequest,
    relayReqType: 'mutation',
  };

  if (_hasFiles(relayRequest)) {
    Object.assign(req, _mutationWithFiles(relayRequest));
  } else {
    Object.assign(req, _mutation(relayRequest));
  }

  return fetchWithMiddleware(req)
    .then(payload => {
      if (payload.hasOwnProperty('errors')) {
        const error = new Error(
          'Server request for mutation `' + relayRequest.getDebugName() + '` ' +
          'failed for the following reasons:\n\n' +
          formatRequestErrors(relayRequest, payload.errors)
        );
        error.source = payload;
        relayRequest.reject(error);
      } else {
        relayRequest.resolve({ response: payload.data });
      }
    }).catch(
      error => relayRequest.reject(error)
    );
}


function _hasFiles(relayRequest) {
  return !!(relayRequest.getFiles && relayRequest.getFiles());
}


function _mutationWithFiles(relayRequest) {
  const req = {
    method: 'POST',
  };

  if (_hasFiles(relayRequest)) {
    const files = relayRequest.getFiles();

    if (!global.FormData) {
      throw new Error('Uploading files without `FormData` not supported.');
    }
    const formData = new FormData();
    formData.append('query', relayRequest.getQueryString());
    formData.append('variables', JSON.stringify(relayRequest.getVariables()));
    for (const filename in files) {
      if (files.hasOwnProperty(filename)) {
        formData.append(filename, files[filename]);
      }
    }
    req.body = formData;
  }

  return req;
}


function _mutation(relayRequest) {
  const req = {
    method: 'POST',
    headers: {
      Accept: '*/*',
      'Content-Type': 'application/json',
    },
  };

  req.body = JSON.stringify({
    query: relayRequest.getQueryString(),
    variables: relayRequest.getVariables(),
  });

  return req;
}
