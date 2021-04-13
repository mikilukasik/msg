const { testRunId } = process.env;
const customCode = require(`../../_temp/customCode-${testRunId}.js`);
const _msgGateway = require('../../../src/gateway');

const msgGateway = _msgGateway({
  port: 11220,
  serviceName: `test-msg-gateway-${testRunId}`
});

msgGateway.start().then(() => {
  customCode({ log: console.log, msgGateway, shutDown: () => process.exit(0) });
});

setTimeout(() => {
  console.log('killing after 10 seconds');
  process.exit(1);
}, 10000);
