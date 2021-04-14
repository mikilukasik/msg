const { testRunId } = process.env;
const customCode = require(`../../_temp/customCode-${testRunId}.js`);
const _msgService = require('../../../src/service');

const msgService = _msgService({
  port: 11221,
  serviceName: `test-msg-service-${testRunId}`,
  ips: {
    public: 'ignore',
  },
});

msgService.connect().then(() => {
  customCode({ log: console.log, msgService });
});

