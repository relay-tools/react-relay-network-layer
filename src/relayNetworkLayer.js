import queries from './relayQueries';
import mutation from './relayMutation';
import fetchWithMiddleware from './fetchWithMiddleware';

export default class RelayNetworkLayer {
  constructor(middlewares, options) {
    this._options = options;
    this._middlewares = Array.isArray(middlewares)
      ? middlewares
      : [middlewares];
    this._supportedOptions = [];

    this._middlewares.forEach(mw => {
      if (mw && mw.supports) {
        if (Array.isArray(mw.supports)) {
          this._supportedOptions.push(...mw.supports);
        } else {
          this._supportedOptions.push(mw.supports);
        }
      }
    });

    this.supports = this.supports.bind(this);
    this.sendQueries = this.sendQueries.bind(this);
    this.sendMutation = this.sendMutation.bind(this);
  }

  supports(...options) {
    return options.every(
      option => this._supportedOptions.indexOf(option) !== -1
    );
  }

  sendQueries(requests) {
    return queries(requests, req =>
      fetchWithMiddleware(req, this._middlewares));
  }

  sendMutation(request) {
    return mutation(request, req =>
      fetchWithMiddleware(req, this._middlewares));
  }
}
