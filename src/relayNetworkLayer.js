/* eslint-disable arrow-body-style, no-unused-vars */

import queries from './relay/queries';
import queriesBatch from './relay/queriesBatch';
import mutation from './relay/mutation';
import fetchWrapper from './fetchWrapper';


export default class RelayNetworkLayer {
  constructor(middlewares, options) {
    this._options = options;
    this._middlewares = Array.isArray(middlewares) ? middlewares : [middlewares];
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
  }

  supports = (...options) => {
    return options.every(option => this._supportedOptions.indexOf(option) !== -1);
  };

  sendQueries = (requests) => {
    if (requests.length > 1 && !this._isBatchQueriesDisabled()) {
      return queriesBatch(requests, this._fetchWithMiddleware);
    }

    return queries(requests, this._fetchWithMiddleware);
  };

  sendMutation = (request) => {
    return mutation(request, this._fetchWithMiddleware);
  };

  _fetchWithMiddleware = (req) => {
    return fetchWrapper(req, this._middlewares);
  };

  _isBatchQueriesDisabled = () => {
    return this._options && this._options.disableBatchQuery;
  };
}
