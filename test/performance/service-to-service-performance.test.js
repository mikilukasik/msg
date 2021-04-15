import expect from 'expect';
import _msgServiceLocal from '../../src/service';
import _msgGatewayLocal from '../../src/gateway';
import _msgServiceMaster from '../../test/_master_branch/src/service';
import _msgGatewayMaster from '../../test/_master_branch/src/gateway';

const MAX_TEST_LENGTH = 1000;

let msg;
let command;
let testDataString;
let testDataStringResponse;
let testDataObject;
let testDataObjectResponse;

let nextPortBase = 18000;

const generateSmallData = () => {
  testDataString = `some string ${Math.random()}`;
  testDataStringResponse = `some string ${Math.random()}`;
  testDataObject = { [testDataString]: testDataString };
  testDataObjectResponse = { [testDataStringResponse]: testDataStringResponse };
};

const generateLargeData = () => {
  testDataString = [...new Array(1000)].map(() => `some string ${Math.random()}`).join(' ');
  testDataStringResponse = [...new Array(1000)].map(() => `some string ${Math.random()}`).join(' ');
  testDataObject = [...new Array(1000)].reduce((result, e, index) => { result[`key${index}${Math.random()}`] = Math.random(); return result; }, {});
  testDataObjectResponse = [...new Array(1000)].reduce((result, e, index) => { result[`key${index}${Math.random()}`] = Math.random(); return result; }, {});
};

describe('service <--> service: performance', function() {
  this.timeout(MAX_TEST_LENGTH + 1500);
  this.retries(2);

  beforeEach(async function() {
    nextPortBase += 20;
    command = `someCommand${Math.random()}`;

    const gatewayOptionsLocal = {
      port: nextPortBase,
      serviceName: `test-msg-gateway-${nextPortBase}`,
      ips: { public: '0.0.0.0' },
      log: () => {},
    };

    const gatewayOptionsMaster = {
      port: nextPortBase + 10,
      serviceName: `test-msg-gateway-${nextPortBase + 10}`,
      ips: { public: '0.0.0.0' },
      log: () => {},
    };

    const service1OptionsLocal = {
      PORT: nextPortBase + 1,
      serviceName: `test-msg-service-${nextPortBase + 1}`,
      gatewayAddress: `0.0.0.0:${nextPortBase}`,
      ips: { public: '0.0.0.0' },
      log: () => {},
    };

    const service2OptionsLocal = {
      PORT: nextPortBase + 2,
      serviceName: `test-msg-service-${nextPortBase + 2}`,
      gatewayAddress: `0.0.0.0:${nextPortBase}`,
      ips: { public: '0.0.0.0' },
      log: () => {},
    };

    const service1OptionsMaster = {
      PORT: nextPortBase + 11,
      serviceName: `test-msg-service-${nextPortBase + 11}`,
      gatewayAddress: `0.0.0.0:${nextPortBase + 10}`,
      ips: { public: '0.0.0.0' },
      log: () => {},
    };

    const service2OptionsMaster = {
      PORT: nextPortBase + 12,
      serviceName: `test-msg-service-${nextPortBase + 12}`,
      gatewayAddress: `0.0.0.0:${nextPortBase + 10}`,
      ips: { public: '0.0.0.0' },
      log: () => {},
    };

    const _msg = {
      localGateway: _msgGatewayLocal(gatewayOptionsLocal),
      localService1: _msgServiceLocal(service1OptionsLocal),
      localService2: _msgServiceLocal(service2OptionsLocal),
      masterGateway: _msgGatewayMaster(gatewayOptionsMaster),
      masterService1: _msgServiceMaster(service1OptionsMaster),
      masterService2: _msgServiceMaster(service2OptionsMaster),
    };

    await _msg.localGateway.start();
    await _msg.masterGateway.start();
    await _msg.localService1.connect();
    await _msg.masterService1.connect();
    await _msg.localService2.connect();
    await _msg.masterService2.connect();

    msg = _msg;
  });

  afterEach(async function() {
    this.timeout(10000);
    await msg.localService1.close();
    await msg.localService2.close();
    await msg.localGateway.close();
    await msg.masterService1.close();
    await msg.masterService2.close();
    await msg.masterGateway.close();
  });

  it(`Completing full service to service cycles with small string data`, async() => {
    generateSmallData();
    msg.localService1.on(command, (data, comms) => comms.send(testDataStringResponse));
    await msg.localGateway.waitForRule(command);

    msg.masterService1.on(command, (data, comms) => comms.send(testDataStringResponse));
    await msg.localGateway.waitForRule(command);

    const endBeforeTimestamp = Date.now() + MAX_TEST_LENGTH;
    const completedCyclesCount = { local: 0, master: 0 };

    const localSendDo = () => msg.localService2.do(command, testDataString).then(() => {
      if (Date.now() > endBeforeTimestamp) return;
      completedCyclesCount.local += 1;
      return localSendDo();
    });

    const masterSendDo = () => msg.masterService2.do(command, testDataString).then(() => {
      if (Date.now() > endBeforeTimestamp) return;
      completedCyclesCount.master += 1;
      return masterSendDo();
    });

    await Promise.all([localSendDo(), masterSendDo()]);

    console.log(`Full do-on cycles with small string data: local: ${completedCyclesCount.local}, master: ${completedCyclesCount.master}`);
    expect(completedCyclesCount.local).toBeGreaterThanOrEqual(completedCyclesCount.master);
  });
});
