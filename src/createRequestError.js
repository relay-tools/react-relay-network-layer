/**
 * Formats an error response from GraphQL server request.
 */
function formatRequestErrors(request, errors) {
  const CONTEXT_BEFORE = 20;
  const CONTEXT_LENGTH = 60;

  if (!request.getQueryString) {
    return errors.join('\n');
  }

  const queryLines = request.getQueryString().split('\n');
  return errors
    .map(({ locations, message }, ii) => {
      const prefix = `${ii + 1}. `;
      const indent = ' '.repeat(prefix.length);

      // custom errors thrown in graphql-server may not have locations
      const locationMessage = locations
        ? '\n' +
            locations
              .map(({ column, line }) => {
                const queryLine = queryLines[line - 1];
                const offset = Math.min(column - 1, CONTEXT_BEFORE);
                return [
                  queryLine.substr(column - 1 - offset, CONTEXT_LENGTH),
                  `${' '.repeat(Math.max(offset, 0))}^^^`,
                ]
                  .map(messageLine => indent + messageLine)
                  .join('\n');
              })
              .join('\n')
        : '';
      return prefix + message + locationMessage;
    })
    .join('\n');
}

export default function createRequestError(
  request,
  requestType,
  responseStatus,
  payload
) {
  let errorReason;
  if (typeof payload === 'object' && payload.errors) {
    errorReason = formatRequestErrors(request, payload.errors);
  } else if (payload) {
    errorReason = payload;
  } else {
    errorReason = `Server response had an error status: ${responseStatus}`;
  }

  let error;
  if (request.getDebugName) {
    // for native Relay request
    error = new Error(
      `Server request for ${requestType} \`${request.getDebugName()}\` ` +
        `failed for the following reasons:\n\n${errorReason}`
    );
  } else if (request && typeof request === 'object') {
    // for batch request
    const ids = Object.keys(request);
    error = new Error(
      `Server request for \`BATCH_QUERY:${ids.join(':')}\` ` +
        `failed for the following reasons:\n\n${errorReason}`
    );
  } else {
    error = new Error(
      `Server request failed for the following reasons:\n\n${errorReason}`
    );
  }

  error.source = payload;
  error.status = responseStatus;
  return error;
}
