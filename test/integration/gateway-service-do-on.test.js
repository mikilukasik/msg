import expect from 'expect';
import _msgService from '../../src/service';
import _msgGateway from '../../src/gateway';

let msg;
let testDataString;
let testDataNumber;
let testDataObject;
let testDataArray;

let nextPortBase = 15000;

const getLogger = (prefix) => (...args) => console.log(prefix, ...args);

describe.only('do & on', () => {
  beforeEach(async() => {
    nextPortBase += 10;
    testDataString = `some string ${Math.random()}`;
    testDataNumber = Math.random();
    testDataObject = { [testDataString]: testDataNumber };
    testDataArray = [testDataString, testDataObject];

    const gatewayOptions = {
      port: nextPortBase,
      serviceName: `test-msg-gateway-${nextPortBase}`,
      // log: () => {},
      // TODO: remove this hack below once network package is gone
      ips: { public: 'ignore' },
    };

    const serviceOptions = {
      PORT: nextPortBase + 1,
      serviceName: `test-msg-service-${nextPortBase + 1}`,
      gatewayAddress: `0.0.0.0:${nextPortBase}`,
      // log: () => {},
      // TODO: remove this hack below once network package is gone
      ips: { public: 'ignore' },
    };

    gatewayOptions.log = getLogger(`MSG GATEWAY ${nextPortBase}:`);
    serviceOptions.log = getLogger(`MSG SERVICE ${nextPortBase + 1}:`);

    const _msg = {
      gateway: _msgGateway(gatewayOptions),
      service: _msgService(serviceOptions),
    };

    await _msg.gateway.start();
    await _msg.service.connect();

    // gatewayOptions.log = getLogger('MSG GATEWAY:');
    // serviceOptions.log = getLogger('MSG SERVICE:');

    msg = _msg;
  });

  afterEach(async function() {
    this.timeout(10000);
    await msg.service.close();
    await msg.gateway.close();
  });

  it('service.do sends string data to gateway.on', async() => {
    const command = 'testServiceDo2GatewayOnString';
    msg.gateway.on(command, (data) => {
      expect(data.args[1]).toBe(testDataString);
    });
    msg.service.do(command, testDataString);
  });

  it('gateway.do sends string data to service.on', async() => {
    const command = 'testGatewayDo2ServiceOnString';
    msg.service.on(command, (data) => {
      expect(data.args[1]).toBe(testDataString);
    });
    msg.gateway.do(command, testDataString);
  });

  it('service.do sends number data to gateway.on', async() => {
    const command = 'testServiceDo2GatewayOnNumber';
    msg.gateway.on(command, (data) => {
      console.log(typeof testDataNumber)
      expect(data.args[1]).toBe(testDataNumber);
    });
    msg.service.do(command, testDataNumber);
  });

  it('gateway.do sends number data to service.on', async() => {
    const command = 'testGatewayDo2ServiceOnNumber';
    msg.service.on(command, (data) => {
      expect(data.args[1]).toBe(testDataNumber);
    });
    msg.gateway.do(command, testDataNumber);
  });
});