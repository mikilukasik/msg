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
    };

    const serviceOptions = {
      PORT: nextPortBase + 1,
      serviceName: 'test-msg-service',
      gatewayAddress: `0.0.0.0:${nextPortBase}`,
      log: () => {},
    };

    const _msg = {
      gateway: _msgGateway(gatewayOptions),
      service: _msgService(serviceOptions),
    }

    await _msg.gateway.start();
    console.log('msgGateway started');
    
    await _msg.service.connect();
    console.log('msgService connected');

    gatewayOptions.log = getLogger('MSG GATEWAY:');
    gatewayOptions.log = getLogger('MSG SERVICE:');

    msg = _msg;
  });

  // TODO: needs afterEach to gracefully shut down express servers

  it('service.do sends string data to gateway.on', async() => {
    const command = 'testServiceDo2GatewayOn';
    const testData = 'some string';

    msg.gateway.on(command, (data) => {
      expect(data.args[1]).toBe(testData);
    });

    msg.service.do(command, testData);
  });
});