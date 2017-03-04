/**
 * Formats an error response from GraphQL server request.
 */
export default function formatRequestErrors(request, errors) {
  const CONTEXT_BEFORE = 20;
  const CONTEXT_LENGTH = 60;

  const queryLines = request.getQueryString().split('\n');
  return errors.map(({ locations, message }, ii) => {
    const prefix = `${ii + 1}. `;
    const indent = ' '.repeat(prefix.length);

    // custom errors thrown in graphql-server may not have locations
    const locationMessage = locations ?
      ('\n' + locations.map(({ column, line }) => {
        const queryLine = queryLines[line - 1];
        const offset = Math.min(column - 1, CONTEXT_BEFORE);
        return [
          queryLine.substr(column - 1 - offset, CONTEXT_LENGTH),
          `${' '.repeat(Math.max(offset, 0))}^^^`,
        ].map(messageLine => indent + messageLine).join('\n');
      }).join('\n')) :
      '';
    return prefix + message + locationMessage;
  }).join('\n');
}
