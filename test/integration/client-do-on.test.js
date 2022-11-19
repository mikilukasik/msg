import expect from 'expect';
import _msgService from '../../src/service';
import _msgGateway from '../../src/gateway';
import { getClient } from '../helpers';
import { msgClient } from '../../src/client';

const SHOW_CLIENT_LOGS = false;
const SHOW_GATEWAY_LOGS = false;
const SHOW_SERVICE_LOGS = false;

let client;
let msg;
let socketRoute;
let cmd;
let testDataString;
let testDataStringResponse;
let testDataNumber;
let testDataNumberResponse;
let testDataObject;
let testDataObjectResponse;
let testDataArray;
let testDataArrayResponse;

let nextPortBase = 21000;

const getLogger =
  (prefix) =>
  (...args) =>
    console.log(prefix, ...args);

describe('client .do and .on, response with comms.send()', () => {
  before(async () => {
    client = getClient();
    await client.start();
  });

  beforeEach(async function () {
    nextPortBase += 10;
    cmd = `someCommand${Math.random()}`;
    socketRoute = `/${Math.random().toString(20).substr(2, 8)}`;
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

    const { page, evaluate } = await client.getNewPage({ logger: SHOW_CLIENT_LOGS ? console : null });
    _msg.runOnClient = evaluate;
    _msg.clientPage = page;

    msg = _msg;
  });

  afterEach(async function () {
    this.timeout(10000);
    await msg.clientPage.close();
    await msg.service.close();
    await msg.gateway.close();
  });

  after(async () => {
    await client.stop();
  });

  it('client.do sends data to service.on and receives answer', async () => {
    const serviceSocket = msg.service.ws(socketRoute);
    serviceSocket.on(`${cmd}-string`, (data, comms) => {
      expect(data).toBe(testDataString);
      comms.send(testDataStringResponse);
    });
    serviceSocket.on(`${cmd}-number`, (data, comms) => {
      expect(data).toBe(testDataNumber);
      comms.send(testDataNumberResponse);
    });
    serviceSocket.on(`${cmd}-object`, (data, comms) => {
      expect(data).toStrictEqual(testDataObject);
      comms.send(testDataObjectResponse);
    });
    serviceSocket.on(`${cmd}-array`, (data, comms) => {
      expect(data).toStrictEqual(testDataArray);
      comms.send(testDataArrayResponse);
    });

    const response = await msg.runOnClient(
      ({ nextPortBase, socketRoute, cmd, testDataString, testDataNumber, testDataObject, testDataArray }) => {
        const testSocket = msgClient.ws(`ws://0.0.0.0:${nextPortBase}${socketRoute}`);
        return Promise.all([
          testSocket.do(`${cmd}-string`, testDataString),
          testSocket.do(`${cmd}-number`, testDataNumber),
          testSocket.do(`${cmd}-object`, testDataObject),
          testSocket.do(`${cmd}-array`, testDataArray),
        ]);
      },
      {
        nextPortBase,
        socketRoute,
        cmd,
        testDataString,
        testDataNumber,
        testDataObject,
        testDataArray,
      },
    );

    expect(response).toStrictEqual([
      testDataStringResponse,
      testDataNumberResponse,
      testDataObjectResponse,
      testDataArrayResponse,
    ]);
  });

  it('multiple socket routes, matching rule names client.do <--> service.on', async () => {
    const secondSocketRoute = `/${Math.random().toString(20).substr(2, 8)}`;

    const serviceSocket1 = msg.service.ws(socketRoute);
    const serviceSocket2 = msg.service.ws(secondSocketRoute);

    serviceSocket1.on(cmd, (data, comms) => {
      expect(data).toBe(testDataString);
      comms.send(testDataStringResponse);
    });

    serviceSocket2.on(cmd, (data, comms) => {
      expect(data).toBe(testDataNumber);
      comms.send(testDataNumberResponse);
    });

    const clientResponse = await msg.runOnClient(
      ({ nextPortBase, socketRoute, secondSocketRoute, cmd, testDataString, testDataNumber }) => {
        const testSocket1 = msgClient.ws(`ws://0.0.0.0:${nextPortBase}${socketRoute}`);
        const testSocket2 = msgClient.ws(`ws://0.0.0.0:${nextPortBase}${secondSocketRoute}`);
        return Promise.all([testSocket1.do(cmd, testDataString), testSocket2.do(cmd, testDataNumber)]);
      },
      {
        nextPortBase,
        socketRoute,
        secondSocketRoute,
        cmd,
        testDataString,
        testDataNumber,
      },
    );

    expect(clientResponse).toStrictEqual([testDataStringResponse, testDataNumberResponse]);
  });

  // TODO: the below only works one way. data/onData needs to work both ways
  it('client.do service.on in-flight data from service to client', async () => {
    const serviceSocket = msg.service.ws(socketRoute);

    const testData = [testDataString, testDataNumber, testDataObject, testDataArray];

    serviceSocket.on(`${cmd}`, (data, comms) => {
      testData.forEach((td) => comms.data(td));
    });

    const clientReceived = await msg.runOnClient(
      ({ nextPortBase, socketRoute, cmd }) =>
        new Promise((resolve) => {
          const result = [];
          const dealWithData = (data) => {
            result.push(data);
            if (result.length === 4) return resolve(result);
          };

          const testSocket = msgClient.ws(`ws://0.0.0.0:${nextPortBase}${socketRoute}`);
          testSocket.do(cmd, {}, (comms) => {
            comms.onData((data) => {
              dealWithData(data);
            });
          });
        }),
      {
        nextPortBase,
        socketRoute,
        cmd,
      },
    );

    expect(clientReceived).toStrictEqual([testDataString, testDataNumber, testDataObject, testDataArray]);
  });

  it('client.ws.subscribe <-- service.ws.emit', async () => {
    const eventName = `someEvent${Math.random()}`;

    const serviceSocket = msg.service.ws(socketRoute);

    const testData = [testDataString, testDataNumber, testDataObject, testDataArray];

    serviceSocket.on(cmd, () => {
      testData.forEach((td) => serviceSocket.emit(eventName, td));
    });

    const clientReceived = await msg.runOnClient(
      ({ nextPortBase, socketRoute, cmd, eventName }) =>
        new Promise(async (resolve) => {
          const result = [];
          const dealWithData = (data) => {
            result.push(data);
            if (result.length === 4) return resolve(result);
          };

          const testSocket = msgClient.ws(`ws://0.0.0.0:${nextPortBase}${socketRoute}`);

          testSocket.subscribe(eventName, dealWithData);
          await new Promise((r) => setTimeout(r, 200));
          testSocket.do(cmd, {});
        }),
      {
        nextPortBase,
        socketRoute,
        cmd,
        eventName,
      },
    );

    expect(clientReceived).toStrictEqual([testDataString, testDataNumber, testDataObject, testDataArray]);
  });

  it('service.connection.do sends data to client.on and receives answer', async () => {
    const serviceSocket = msg.service.ws(socketRoute);

    const clientResponsePromise = msg.runOnClient(
      ({
        nextPortBase,
        socketRoute,
        cmd,
        testDataStringResponse,
        testDataNumberResponse,
        testDataObjectResponse,
        testDataArrayResponse,
      }) =>
        new Promise((resolve) => {
          const result = [];
          const dealWithData = (data) => {
            result.push(data);
            if (result.length === 4) return resolve(result);
          };
          const testSocket = msgClient.ws(`ws://0.0.0.0:${nextPortBase}${socketRoute}`);
          testSocket.on(`${cmd}-string`, (data, comms) => {
            comms.send(testDataStringResponse);
            dealWithData(data);
          });
          testSocket.on(`${cmd}-number`, (data, comms) => {
            comms.send(testDataNumberResponse);
            dealWithData(data);
          });
          testSocket.on(`${cmd}-object`, (data, comms) => {
            comms.send(testDataObjectResponse);
            dealWithData(data);
          });
          testSocket.on(`${cmd}-array`, (data, comms) => {
            comms.send(testDataArrayResponse);
            dealWithData(data);
          });
        }),
      {
        nextPortBase,
        socketRoute,
        cmd,
        testDataStringResponse,
        testDataNumberResponse,
        testDataObjectResponse,
        testDataArrayResponse,
      },
    );

    const connection = await new Promise((res) => {
      const getConnection = () => {
        const c = serviceSocket.connections.pop();
        if (c) return res(c);
        setTimeout(getConnection, 20);
      };
      getConnection();
    });

    const serviceResponse = await Promise.all([
      connection.do(`${cmd}-string`, testDataString),
      connection.do(`${cmd}-number`, testDataNumber),
      connection.do(`${cmd}-object`, testDataObject),
      connection.do(`${cmd}-array`, testDataArray),
    ]);

    expect(serviceResponse).toStrictEqual([
      testDataStringResponse,
      testDataNumberResponse,
      testDataObjectResponse,
      testDataArrayResponse,
    ]);

    const clientResponse = await clientResponsePromise;
    expect(clientResponse).toStrictEqual([testDataString, testDataNumber, testDataObject, testDataArray]);
  });

  it('service.connection.do client.on in-flight data', async () => {
    const serviceSocket = msg.service.ws(socketRoute);

    const clientResponsePromise = msg.runOnClient(
      ({
        nextPortBase,
        socketRoute,
        cmd,
        testDataStringResponse,
        testDataNumberResponse,
        testDataObjectResponse,
        testDataArrayResponse,
      }) =>
        new Promise((resolve) => {
          const result = [];
          const dealWithData = (data) => {
            result.push(data);
            if (result.length === 4)
              return setTimeout(() => {
                resolve(result);
              }, 300);
          };
          const testSocket = msgClient.ws(`ws://0.0.0.0:${nextPortBase}${socketRoute}`);
          const responses = [
            testDataStringResponse,
            testDataNumberResponse,
            testDataObjectResponse,
            testDataArrayResponse,
          ];
          testSocket.on(`${cmd}`, (data, comms) => {
            comms.onData((data) => {
              dealWithData(data);
              comms.data(responses.shift());
            });
          });
        }),
      {
        nextPortBase,
        socketRoute,
        cmd,
        testDataStringResponse,
        testDataNumberResponse,
        testDataObjectResponse,
        testDataArrayResponse,
      },
    );

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
      };

      connection.do(cmd, {}, (comms) => {
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
    expect(clientResponse).toStrictEqual([testDataString, testDataNumber, testDataObject, testDataArray]);
  });
});
