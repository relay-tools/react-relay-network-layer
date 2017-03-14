/* eslint-disable no-param-reassign, no-use-before-define, prefer-template */

export default function mutation(relayRequest, fetchWithMiddleware) {
  const req = {
    method: 'POST',
    relayReqId: relayRequest.getID
      ? relayRequest.getID()
      : `mutation${Math.random()}`,
    relayReqObj: relayRequest,
    relayReqType: 'mutation',
  };

  if (hasFiles(relayRequest)) {
    mutationWithFiles(req, relayRequest);
  } else {
    mutationWithoutFiles(req, relayRequest);
  }

  return fetchWithMiddleware(req)
    .then(data => relayRequest.resolve({ response: data }))
    .catch(err => relayRequest.reject(err));
}

function hasFiles(relayRequest) {
  return !!(relayRequest.getFiles && relayRequest.getFiles());
}

function mutationWithFiles(req, relayRequest) {
  req.headers = {};

  if (hasFiles(relayRequest)) {
    const files = relayRequest.getFiles();

    if (!global.FormData) {
      throw new Error('Uploading files without `FormData` not supported.');
    }
    const formData = new FormData();
    formData.append('id', req.relayReqId);
    formData.append('query', relayRequest.getQueryString());
    formData.append('variables', JSON.stringify(relayRequest.getVariables()));
    Object.keys(files).forEach(filename => {
      if (Array.isArray(files[filename])) {
        files[filename].forEach(file => {
          formData.append(filename, file);
        });
      } else {
        formData.append(filename, files[filename]);
      }
    });
    req.body = formData;
  }
}

function mutationWithoutFiles(req, relayRequest) {
  req.headers = {
    Accept: '*/*',
    'Content-Type': 'application/json',
  };

  req.body = JSON.stringify({
    id: req.relayReqId,
    query: relayRequest.getQueryString(),
    variables: relayRequest.getVariables(),
  });
}
