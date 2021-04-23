import expect from 'expect';
import _msgService from '../../src/service';
import _msgGateway from '../../src/gateway';

let msg;
let cmd;
let testDataString;
let testDataStringResponse;
let testDataNumber;
let testDataNumberResponse;
let testDataObject;
let testDataObjectResponse;
let testDataArray;
let testDataArrayResponse;

let nextPortBase = 15000;

const getLogger = (prefix) => (...args) => {}; // console.log(prefix, ...args);

describe('gateway <--> service: .do and .on, response with comms.send()', () => {
  beforeEach(async function() {
    nextPortBase += 10;
    cmd = `someCommand${Math.random()}`;
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

    const serviceOptions = {
      PORT: nextPortBase + 1,
      serviceName: `test-msg-service-${nextPortBase + 1}`,
      gatewayAddress: `0.0.0.0:${nextPortBase}`,
      ips: { public: '0.0.0.0' },
    };

    gatewayOptions.log = getLogger(`MSG GATEWAY ${nextPortBase}:`);
    serviceOptions.log = getLogger(`MSG SERVICE ${nextPortBase + 1}:`);

    const _msg = {
      gateway: _msgGateway(gatewayOptions),
      service: _msgService(serviceOptions),
    };

    await _msg.gateway.start();
    await _msg.service.connect();

    msg = _msg;
  });

  afterEach(async function() {
    this.timeout(10000);
    await msg.service.close();
    await msg.gateway.close();
  });

  it('service.do sends string data to gateway.on and receives string answer', async() => {
    msg.gateway.on(cmd, (data, comms) => {
      expect(data).toBe(testDataString);
      comms.send(testDataStringResponse);
    });
    return msg.service.do(cmd, testDataString)
      .then(response => {
        expect(response).toStrictEqual(testDataStringResponse);
      });
  });

  it('gateway.do sends string data to service.on and receives string answer', async() => {
    msg.service.on(cmd, (data, comms) => {
      expect(data).toBe(testDataString);
      comms.send(testDataStringResponse);
    });
    await msg.gateway.waitForRule(cmd);
    return msg.gateway.do(cmd, testDataString)
      .then(response => {
        expect(response).toStrictEqual(testDataStringResponse);
      });
  });

  it('service.do sends number data to gateway.on and receives number answer', async() => {
    msg.gateway.on(cmd, (data, comms) => {
      expect(data).toBe(testDataNumber);
      comms.send(testDataNumberResponse);
    });
    return msg.service.do(cmd, testDataNumber)
      .then(response => {
        expect(response).toStrictEqual(testDataNumberResponse);
      });
  });

  it('gateway.do sends number data to service.on and receives number answer', async() => {
    msg.service.on(cmd, (data, comms) => {
      expect(data).toBe(testDataNumber);
      comms.send(testDataNumberResponse);
    });
    await msg.gateway.waitForRule(cmd);
    return msg.gateway.do(cmd, testDataNumber)
      .then(response => {
        expect(response).toStrictEqual(testDataNumberResponse);
      });
  });

  it('service.do sends object data to gateway.on and receives object answer', async() => {
    msg.gateway.on(cmd, (data, comms) => {
      expect(data).toStrictEqual(testDataObject);
      comms.send(testDataObjectResponse);
    });
    return msg.service.do(cmd, testDataObject)
      .then(response => {
        expect(response).toStrictEqual(testDataObjectResponse);
      });
  });

  it('gateway.do sends object data to service.on and receives object answer', async() => {
    msg.service.on(cmd, (data, comms) => {
      expect(data).toStrictEqual(testDataObject);
      comms.send(testDataObjectResponse);
    });
    await msg.gateway.waitForRule(cmd);
    return msg.gateway.do(cmd, testDataObject)
      .then(response => {
        expect(response).toStrictEqual(testDataObjectResponse);
      });
  });

  it('service.do sends array data to gateway.on and receives array answer', async() => {
    msg.gateway.on(cmd, (data, comms) => {
      expect(data).toStrictEqual(testDataArray);
      comms.send(testDataArrayResponse);
    });
    return msg.service.do(cmd, testDataArray)
      .then(response => {
        expect(response).toStrictEqual(testDataArrayResponse);
      });
  });

  it('gateway.do sends array data to service.on and receives array answer', async() => {
    msg.service.on(cmd, (data, comms) => {
      expect(data).toStrictEqual(testDataArray);
      comms.send(testDataArrayResponse);
    });
    await msg.gateway.waitForRule(cmd);
    return msg.gateway.do(cmd, testDataArray)
      .then(response => {
        expect(response).toStrictEqual(testDataArrayResponse);
      });
  });
});
