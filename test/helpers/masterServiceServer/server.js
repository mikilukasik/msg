const { testRunId, port } = process.env;
const customCode = require(`../../_temp/customCode-${testRunId}.js`);
const _msgService = require('../../../test/_master_branch/src/service');

const msgService = _msgService({
  PORT: port,
  serviceName: `test-msg-service-${testRunId}`,
  ips: {
    public: 'ignore',
  },
});

msgService.connect().then(() => {
  customCode({ log: console.log, msgService });
});

