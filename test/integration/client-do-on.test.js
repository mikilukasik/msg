import expect from 'expect';
import _msgService from '../../src/service';
import _msgGateway from '../../src/gateway';
import { getClient } from '../helpers';
import { response } from 'express';

const SHOW_CLIENT_LOGS = true;
const SHOW_GATEWAY_LOGS = true;
const SHOW_SERVICE_LOGS = true;

let client;
let msg;
let socketRoute;
let command;
let testDataString;
let testDataStringResponse;
let testDataNumber;
let testDataNumberResponse;
let testDataObject;
let testDataObjectResponse;
let testDataArray;
let testDataArrayResponse;

let nextPortBase = 21000;

const getLogger = (prefix) => (...args) => console.log(prefix, ...args);

describe('client .do and .on, response with comms.send()', () => {
  before(async() => {
    client = getClient();
    await client.start();
  });

  beforeEach(async function() {
    nextPortBase += 10;
    command = `someCommand${Math.random()}`;
    socketRoute = `/${Math.random().toString(20).substr(2, 8)}`
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

    gatewayOptions.log = SHOW_GATEWAY_LOGS ? getLogger(`MSG GATEWAY ${nextPortBase}:`) : () => {};
    serviceOptions.log = SHOW_SERVICE_LOGS ? getLogger(`MSG SERVICE ${nextPortBase + 1}:`) : () => {};

    const _msg = {
      gateway: _msgGateway(gatewayOptions),
      service: _msgService(serviceOptions),
      client,
    };

    await _msg.gateway.start();
    await _msg.service.connect();

    const { page ,evaluate } = await client.getNewPage({ logger: SHOW_CLIENT_LOGS ? console : null });
    _msg.runOnClient = evaluate;
    _msg.clientPage = page;

    msg = _msg;
  });

  afterEach(async function() {
    this.timeout(10000);
    await msg.clientPage.close();
    await msg.service.close();
    await msg.gateway.close();
  });

  after(async() => {
    await client.stop();
  });

  it('client.do sends data to service.on and receives answer', async() => {
    const serviceSocket = msg.service.ws(socketRoute);
    serviceSocket.on(`${command}-string`, (data, comms) => {
      expect(data.args[1]).toBe(testDataString);
      comms.send(testDataStringResponse);
    });
    serviceSocket.on(`${command}-number`, (data, comms) => {
      expect(data.args[1]).toBe(testDataNumber);
      comms.send(testDataNumberResponse);
    });
    serviceSocket.on(`${command}-object`, (data, comms) => {
      expect(data.args[1]).toStrictEqual(testDataObject);
      comms.send(testDataObjectResponse);
    });
    serviceSocket.on(`${command}-array`, (data, comms) => {
      expect(data.args[1]).toStrictEqual(testDataArray);
      comms.send(testDataArrayResponse);
    });

    const response = await msg.runOnClient(({
      nextPortBase,
      socketRoute,
      command,
      testDataString,
      testDataNumber,
      testDataObject,
      testDataArray,
    }) => {
      const testSocket = msgClient.ws(`ws://0.0.0.0:${nextPortBase}${socketRoute}`);
      return Promise.all([
        testSocket.do(`${command}-string`, testDataString),
        testSocket.do(`${command}-number`, testDataNumber),
        testSocket.do(`${command}-object`, testDataObject),
        testSocket.do(`${command}-array`, testDataArray),
      ])
    }, {
      nextPortBase,
      socketRoute,
      command,
      testDataString,
      testDataNumber,
      testDataObject,
      testDataArray,
    });

    expect(response).toStrictEqual([
      testDataStringResponse,
      testDataNumberResponse,
      testDataObjectResponse,
      testDataArrayResponse,
    ]);
  });

  xit('client.do service.on in-flight data', async() => {
    const serviceSocket = msg.service.ws(socketRoute);

    const serviceReceived = []
    // await new Promise((resolve) => {
    const dealWithData = (data) => {
      serviceReceived.push(data);
      if (serviceReceived.length === 4) return resolve(serviceReceived);
    };

    const responses = [
      testDataStringResponse,
      testDataNumberResponse,
      testDataObjectResponse,
      testDataArrayResponse,
    ];

    serviceSocket.on(`${command}`, (data, comms) => {
      comms.onData((data) => {
        comms.data(responses.shift());
        dealWithData(data);
      })
    });
    // });

    const clientReceived = await msg.runOnClient(({
      nextPortBase,
      socketRoute,
      command,
      testDataString,
      testDataNumber,
      testDataObject,
      testDataArray,
    }) => new Promise((resolve) => {
      const result = [];
      const dealWithData = (data) => {
        result.push(data);
        if (result.length === 4) return resolve(result);
      }
      
      const testSocket = msgClient.ws(`ws://0.0.0.0:${nextPortBase}${socketRoute}`);
      testSocket.do(command, {}, (comms) => {
        comms.onData((data) => {
          dealWithData(data);
        });

        comms.data(testDataString);
        comms.data(testDataNumber);
        comms.data(testDataObject);
        comms.data(testDataArray);
      });
    }), {
      nextPortBase,
      socketRoute,
      command,
      testDataString,
      testDataNumber,
      testDataObject,
      testDataArray,
    });

    expect(serviceReceived).toStrictEqual([
      testDataStringResponse,
      testDataNumberResponse,
      testDataObjectResponse,
      testDataArrayResponse,
    ]);

    expect(clientReceived).toStrictEqual([
      testDataString,
      testDataNumber,
      testDataObject,
      testDataArray,
    ]);
  });

  it('service.connection.do sends data to client.on and receives answer', async() => {
    const serviceSocket = msg.service.ws(socketRoute);

    const clientResponsePromise = msg.runOnClient(({
      nextPortBase,
      socketRoute,
      command,
      testDataStringResponse,
      testDataNumberResponse,
      testDataObjectResponse,
      testDataArrayResponse,
    }) => new Promise((resolve) => {
      const result = [];
      const dealWithData = (data) => {
        result.push(data);
        if (result.length === 4) return resolve(result);
      }
      const testSocket = msgClient.ws(`ws://0.0.0.0:${nextPortBase}${socketRoute}`);
      testSocket.on(`${command}-string`, (data, comms) => {
        comms.send(testDataStringResponse);
        dealWithData(data.args[1]);
      });
      testSocket.on(`${command}-number`, (data, comms) => {
        comms.send(testDataNumberResponse);
        dealWithData(data.args[1]);
      });
      testSocket.on(`${command}-object`, (data, comms) => {
        comms.send(testDataObjectResponse);
        dealWithData(data.args[1]);
      });
      testSocket.on(`${command}-array`, (data, comms) => {
        comms.send(testDataArrayResponse);
        dealWithData(data.args[1]);
      });
    }), {
      nextPortBase,
      socketRoute,
      command,
      testDataStringResponse,
      testDataNumberResponse,
      testDataObjectResponse,
      testDataArrayResponse,
    });

    const connection = await new Promise((res) => {
      const getConnection = () => {
        const c = serviceSocket.connections.pop();
        if (c) return res(c);
        setTimeout(getConnection, 20);
      };
      getConnection();
    });

    const serviceResponse = await Promise.all([
      connection.do(`${command}-string`, testDataString),
      connection.do(`${command}-number`, testDataNumber),
      connection.do(`${command}-object`, testDataObject),
      connection.do(`${command}-array`, testDataArray),
    ]);

    expect(serviceResponse).toStrictEqual([
      testDataStringResponse,
      testDataNumberResponse,
      testDataObjectResponse,
      testDataArrayResponse,
    ]);

    const clientResponse = await clientResponsePromise;
    expect(clientResponse).toStrictEqual([
      testDataString,
      testDataNumber,
      testDataObject,
      testDataArray,
    ]);
  });

  // doesn't seem to be implemented
  xit('service.connection.do client.on in-flight data', async() => {
    const serviceSocket = msg.service.ws(socketRoute);

    const clientResponsePromise = msg.runOnClient(({
      nextPortBase,
      socketRoute,
      command,
      testDataStringResponse,
      testDataNumberResponse,
      testDataObjectResponse,
      testDataArrayResponse,
    }) => new Promise((resolve) => {
      const result = [];
      const dealWithData = (data) => {
        result.push(data);
        if (result.length === 4) return resolve(result);
      }
      const testSocket = msgClient.ws(`ws://0.0.0.0:${nextPortBase}${socketRoute}`);
      const responses = [
        testDataStringResponse,
        testDataNumberResponse,
        testDataObjectResponse,
        testDataArrayResponse,
      ];
      testSocket.on(`${command}`, (data, comms) => {
        comms.onData((data) => {
          dealWithData(data);
          comms.data(responses.shift());
        });
      });
    }), {
      nextPortBase,
      socketRoute,
      command,
      testDataStringResponse,
      testDataNumberResponse,
      testDataObjectResponse,
      testDataArrayResponse,
    });

    const connection = await new Promise((res) => {
      const getConnection = () => {
        const c = serviceSocket.connections.pop();
        if (c) return res(c);
        setTimeout(getConnection, 20);
      };
      getConnection();
    });

    const serviceResponse = await new Promise((resolve) => {
      const result = [];
      const dealWithData = (data) => {
        result.push(data);
        if (result.length === 4) return resolve(result);
      }

      connection.do(command, {}, (comms) => {
        comms.onData((data) => {
          dealWithData(data);
        });

        comms.data(testDataString);
        comms.data(testDataNumber);
        comms.data(testDataObject);
        comms.data(testDataArray);
      });
    });


    expect(serviceResponse).toStrictEqual([
      testDataStringResponse,
      testDataNumberResponse,
      testDataObjectResponse,
      testDataArrayResponse,
    ]);

    const clientResponse = await clientResponsePromise;
    expect(clientResponse).toStrictEqual([
      testDataString,
      testDataNumber,
      testDataObject,
      testDataArray,
    ]);
  });
});
