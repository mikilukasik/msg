import expect from 'expect';
import _msgService from '../../src/service';
import _msgGateway from '../../src/gateway';

let msg;
let testDataString;
let testDataNumber;
let testDataObject;
let testDataArray;

let nextPortBase = 15000;

const getLogger = (prefix) => (...args) => {}; // console.log(prefix, ...args);

describe('do & on', () => {
  beforeEach(async function() {
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
      ips: { public: '0.0.0.0' },
    };

    const serviceOptions = {
      port: nextPortBase + 1,
      serviceName: `test-msg-service-${nextPortBase + 1}`,
      gatewayAddress: `0.0.0.0:${nextPortBase}`,
      // log: () => {},
      // TODO: remove this hack below once network package is gone
      ips: { public: '0.0.0.0' },
    };

    gatewayOptions.log = getLogger(`MSG GATEWAY ${nextPortBase}:`);
    serviceOptions.log = getLogger(`MSG SERVICE ${nextPortBase + 1}:`);

    msg = undefined;

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

  it('service.do sends string data to gateway.on', () => new Promise(async(done) => {
    const command = 'testServiceDo2GatewayOnString';
    msg.gateway.on(command, (data) => {
      expect(data.args[1]).toBe(testDataString);
      done();
    });
    await new Promise(r => setTimeout(r, 5));
    msg.service.do(command, testDataString);
  }));

  it('gateway.do sends string data to service.on', () => new Promise(async(done) => {
    const command = 'testGatewayDo2ServiceOnString';
    msg.service.on(command, (data) => {
      expect(data.args[1]).toBe(testDataString);
      done();
    });
    await new Promise(r => setTimeout(r, 5));
    msg.gateway.do(command, testDataString);
  }));

  it('service.do sends number data to gateway.on', () => new Promise(async(done) => {
    const command = 'testServiceDo2GatewayOnNumber';
    msg.gateway.on(command, (data) => {
      expect(data.args[1]).toBe(testDataNumber);
      done();
    });
    await new Promise(r => setTimeout(r, 5));
    msg.service.do(command, testDataNumber);
  }));

  it('gateway.do sends number data to service.on', () => new Promise(async(done) => {
    const command = 'testGatewayDo2ServiceOnNumber';
    msg.service.on(command, (data) => {
      expect(data.args[1]).toBe(testDataNumber);
      done();
    });
    await new Promise(r => setTimeout(r, 5));
    msg.gateway.do(command, testDataNumber);
  }));
});
