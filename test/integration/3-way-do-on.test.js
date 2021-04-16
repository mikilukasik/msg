import expect from 'expect';
import _msgService from '../../src/service';
import _msgGateway from '../../src/gateway';
import { getClient } from '../helpers';

const SHOW_CLIENT_LOGS = false;
const SHOW_GATEWAY_LOGS = false;
const SHOW_SERVICE_LOGS = false;

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

describe('3 way .do and .on, response with comms.send()', () => {
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

    _msg.runOnClient = await client.getRunner({ logger: SHOW_CLIENT_LOGS ? console : null });

    msg = _msg;
  });

  afterEach(async function() {
    this.timeout(10000);
    await msg.service.close();
    await msg.gateway.close();
  });

  after(async() => {
    await client.stop();
  });

  it('client.do sends string data to gateway.on and receives string answer', async function() {
    const serviceSocket = msg.service.ws(socketRoute);
    serviceSocket.on(command, (data, comms) => {
      comms.send({ echo: data.cmdArgs });
    });

    const response = await msg.runOnClient(({
      nextPortBase,
      socketRoute,
      command
    }) => new Promise((resolve, reject) => {
      const testSocket = msgClient.ws(`ws://0.0.0.0:${nextPortBase}${socketRoute}`);
      testSocket.do(command, { test: true }).then(resolve, reject);
    }), {
      nextPortBase,
      socketRoute,
      command
    });

    expect(response).toStrictEqual({ echo: { test: true }});
  });
});
