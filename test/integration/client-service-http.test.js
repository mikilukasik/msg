import expect from 'expect';
import cors from 'cors';
import path from 'path';
import _msgService from '../../src/service';
import _msgGateway from '../../src/gateway';
import { getClient } from '../helpers';

const SHOW_CLIENT_LOGS = false;
const SHOW_GATEWAY_LOGS = false;
const SHOW_SERVICE_LOGS = false;

let client;
let msg;
let testPath;

let nextPortBase = 26000;

const getLogger = (prefix) => (...args) => console.log(prefix, ...args);

describe('client to service http', () => {
  it('service handles GET request routed through the gateway', async() => {
    msg.service.app.use(cors());
    msg.service.on.get(testPath, (req, res) => {
      res.send({ test: 'test' });
    });

    const clientResponse = await msg.runOnClient(async({
      nextPortBase,
      testPath,
    }) => {
      return await (await fetch(`http://0.0.0.0:${nextPortBase}${testPath}`)).json();
    }, {
      nextPortBase,
      testPath,
    });

    expect(clientResponse).toStrictEqual({ test: 'test' });
  });
  
  it('service can serve static assets through the gateway', async() => {
    msg.service.app.use(cors());
    msg.service.static(`${testPath}`, path.resolve('.'));

    const clientResponse = await msg.runOnClient(async({
      nextPortBase,
      testPath,
    }) => ({
      package: await (await fetch(`http://0.0.0.0:${nextPortBase}${testPath}/package.json`)).text(),
      thisTest: await (await fetch(`http://0.0.0.0:${nextPortBase}${testPath}/test/integration/client-service-http.test.js`)).text(),
    }), {
      nextPortBase,
      testPath,
    });
    
    expect(/"name": "msg",/.test(clientResponse.package)).toBeTruthy();
    expect(/we will match this line/.test(clientResponse.thisTest)).toBeTruthy();
  });
  

  before(async() => {
    client = getClient();
    await client.start();
  });

  beforeEach(async function() {
    nextPortBase += 10;
    testPath = `/${Math.random().toString(20).substr(2, 8)}`
    
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
});
