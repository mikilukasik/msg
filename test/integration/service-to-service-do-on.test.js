import expect from 'expect';
import _msgService from '../../src/service';
import _msgGateway from '../../src/gateway';

let msg;
let command;
let testDataString;
let testDataStringResponse;
let testDataNumber;
let testDataNumberResponse;
let testDataObject;
let testDataObjectResponse;
let testDataArray;
let testDataArrayResponse;

let nextPortBase = 17000;

const getLogger = (prefix) => (...args) => {}; // console.log(prefix, ...args);

describe('service <--> service: .do and .on, response with comms.send()', () => {
  beforeEach(async function() {
    nextPortBase += 10;
    command = `someCommand${Math.random()}`;
    testDataString = `some string ${Math.random()}`;
    testDataNumber = Math.random();
    testDataObject = { [testDataString]: testDataNumber };
    testDataArray = [testDataString, testDataObject];
    testDataStringResponse = `some string ${Math.random()}`;
    testDataNumberResponse = Math.random();
    testDataObjectResponse = { [testDataStringResponse]: testDataNumberResponse };
    testDataArrayResponse = [testDataStringResponse, testDataObjectResponse];

    const gatewayOptions = {
      port: nextPortBase,
      serviceName: `test-msg-gateway-${nextPortBase}`,
      ips: { public: '0.0.0.0' },
    };

    const service1Options = {
      PORT: nextPortBase + 1,
      serviceName: `test-msg-service-${nextPortBase + 1}`,
      gatewayAddress: `0.0.0.0:${nextPortBase}`,
      ips: { public: '0.0.0.0' },
    };

    const service2Options = {
      PORT: nextPortBase + 2,
      serviceName: `test-msg-service-${nextPortBase + 2}`,
      gatewayAddress: `0.0.0.0:${nextPortBase}`,
      ips: { public: '0.0.0.0' },
    };

    gatewayOptions.log = getLogger(`MSG GATEWAY ${nextPortBase}:`);
    service1Options.log = getLogger(`MSG SERVICE ${nextPortBase + 1}:`);
    service2Options.log = getLogger(`MSG SERVICE ${nextPortBase + 2}:`);

    const _msg = {
      gateway: _msgGateway(gatewayOptions),
      service1: _msgService(service1Options),
      service2: _msgService(service2Options),
    };

    await _msg.gateway.start();
    await _msg.service1.connect();
    await _msg.service2.connect();

    msg = _msg;
  });

  afterEach(async function() {
    this.timeout(10000);
    await msg.service1.close();
    await msg.service2.close();
    await msg.gateway.close();
  });

  it('.do sends string data to .on and receives string answer', async() => {
    msg.service1.on(command, (data, comms) => {
      expect(data.args[1]).toBe(testDataString);
      comms.send(testDataStringResponse);
    });
    return msg.service2.do(command, testDataString)
      .then(response => {
        expect(response).toStrictEqual(testDataStringResponse);
      });
  });

  
  it('.do sends number data to .on and receives number answer', async() => {
    msg.service1.on(command, (data, comms) => {
      expect(data.args[1]).toBe(testDataNumber);
      comms.send(testDataNumberResponse);
    });
    return msg.service2.do(command, testDataNumber)
      .then(response => {
        expect(response).toStrictEqual(testDataNumberResponse);
      });
  });

  

  it('.do sends object data to .on and receives object answer', async() => {
    msg.service1.on(command, (data, comms) => {
      expect(data.args[1]).toStrictEqual(testDataObject);
      comms.send(testDataObjectResponse);
    });
    return msg.service2.do(command, testDataObject)
      .then(response => {
        expect(response).toStrictEqual(testDataObjectResponse);
      });
  });

  

  it('.do sends array data to .on and receives array answer', async() => {
    msg.service1.on(command, (data, comms) => {
      expect(data.args[1]).toStrictEqual(testDataArray);
      comms.send(testDataArrayResponse);
    });
    return msg.service2.do(command, testDataArray)
      .then(response => {
        expect(response).toStrictEqual(testDataArrayResponse);
      });
  });

  
});
