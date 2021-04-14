import expect from 'expect';
import _msgService from '../../src/service';
import _msgGateway from '../../src/gateway';

let msg;
let nextPortBase = 15001;

const getLogger = (prefix) => (...args) => console.log(prefix, ...args);

describe('do & on', () => {
  beforeEach(async() => {
    const gatewayOptions = {
      port: nextPortBase,
      serviceName: 'test-msg-service',
      log: () => {},
      ips: {
        public: 'ignore'
      }
    };

    const serviceOptions = {
      PORT: nextPortBase + 1,
      serviceName: 'test-msg-service',
      gatewayAddress: `0.0.0.0:${nextPortBase}`,
      log: () => {},
      ips: {
        public: 'ignore'
      },
    };

    const _msg = {
      gateway: _msgGateway(gatewayOptions),
      service: _msgService(serviceOptions),
    }

    await _msg.gateway.start();
    await _msg.service.connect();

    gatewayOptions.log = getLogger('MSG GATEWAY:');
    gatewayOptions.log = getLogger('MSG SERVICE:');

    msg = _msg;
  });

  afterEach(async function() {
    this.timeout(10000);
    await msg.service.close();
    await msg.gateway.close();
  });

  it('service.do sends string data to gateway.on', async() => {
    const command = 'testServiceDo2GatewayOn';
    const testData = `some string ${Math.random()}`;

    msg.gateway.on(command, (data) => {
      expect(data.args[1]).toBe(testData);
    });

    msg.service.do(command, testData);
  });

  it('gateway.do sends string data to service.on', async() => {
    const command = 'testGatewayDo2ServiceOn';
    const testData = `some string ${Math.random()}`;

    msg.service.on(command, (data) => {
      expect(data.args[1]).toBe(testData);
    });

    msg.gateway.do(command, testData);
  });
});