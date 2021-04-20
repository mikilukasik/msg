import expect from 'expect';
import _msgService from '../../src/service';
import _msgGateway from '../../src/gateway';
import { getClient } from '../helpers';
import { msgClient } from '../../src/client';

const SHOW_CLIENT_LOGS = true;
const SHOW_GATEWAY_LOGS = false;
const SHOW_SERVICE_LOGS = false;

let client;
let msg;
let socketRoute;
let distObjName;

let nextPortBase = 22000;

const getLogger = (prefix) => (...args) => console.log(prefix, ...args);

describe('client .do and .on, response with comms.send()', () => {
  before(async() => {
    client = getClient();
    await client.start();
  });

  beforeEach(async function() {
    nextPortBase += 10;
    socketRoute = `/${Math.random().toString(20).substr(2, 8)}`
    distObjName = `distObj${Math.random()}`;

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

  it('service distobj picks up keys from a newly joined client', async() => {
    const serviceSocket = msg.service.ws(socketRoute);
    const serviceDistObj = serviceSocket.distObj(distObjName);

    await msg.runOnClient(async({
      nextPortBase,
      socketRoute,
      distObjName,
    }) => {
      const testSocket = msgClient.ws(`ws://0.0.0.0:${nextPortBase}${socketRoute}`);
      const store = { fromClientStrore: 'test' };
      const clientDistObj = testSocket.distObj({
        name: distObjName,
        store,
      });

      await new Promise(r => setTimeout(r, 250));
      return { store, clientDistObj };
    }, {
      nextPortBase,
      socketRoute,
      distObjName,
    });

    expect(serviceDistObj.data).toStrictEqual({ fromClientStrore: 'test' });
  });
});
