/* eslint-disable */

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

process.on('unhandledRejection', function (error) {
  console.error('Unhandled Promise Rejection:');
  console.error(error && error.stack || error);
});
