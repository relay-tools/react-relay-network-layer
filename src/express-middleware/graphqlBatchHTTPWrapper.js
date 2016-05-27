export default function (graphqlHTTPMiddleware) {
  return (req, res, next) => {
    const subResponses = [];
    Promise.all(
      req.body.map(data =>
        new Promise((resolve) => {
          const subRequest = {
            __proto__: req.__proto__, // eslint-disable-line
            ...req,
            body: data,
          };
          const subResponse = {
            status(st) { this.statusCode = st; return this; },
            set() { return this; },
            send(payload) {
              resolve({ status: this.statusCode, id: data.id, payload });
            },

            // support express-graphql@0.5.2
            setHeader() { return this; },
            write(payload) { this.payload = payload; },
            end() {
              resolve({ status: this.statusCode, id: data.id, payload: this.payload });
            },
          };
          subResponses.push(subResponse);
          graphqlHTTPMiddleware(subRequest, subResponse);
        })
      )
    ).then(
      (responses) => {
        const response = [];
        responses.forEach(({ status, id, payload }) => {
          if (status) { res.status(status); }
          response.push({
            id,
            payload: JSON.parse(payload),
          });
        });
        res.send(response);
        next();
      }
    );
  };
}
