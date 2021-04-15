const { testRunId, port } = process.env;
const customCode = require(`../../_temp/customCode-${testRunId}.js`);
const _msgGateway = require('../../../src/gateway');

const msgGateway = _msgGateway({
  port,
  serviceName: `test-msg-gateway-${testRunId}`,
  ips: {
    public: 'ignore',
  },
});

msgGateway.start().then(() => {
  customCode({ log: console.log, msgGateway });
});
