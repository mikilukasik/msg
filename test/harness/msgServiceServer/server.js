const { testRunId } = process.env;
const customCode = require(`../../_temp/customCode-${testRunId}.js`);
const _msgService = require('../../../src/service');

const msgService = _msgService({
  PORT: 11221,
  serviceName: `test-msg-service-${testRunId}`
});

msgService.connect().then(() => {
  customCode({ log: console.log, msgService, shutDown: () => process.exit(0) });
});

setTimeout(() => {
  console.log('killing after 10 seconds');
  process.exit(1);
}, 10000);
