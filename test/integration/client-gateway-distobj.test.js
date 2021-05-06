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
let distObjName;

let nextPortBase = 22000;

const getLogger = (prefix) => (...args) => console.log(prefix, ...args);

describe('client <--> service distObj', () => {
  it('client distobj gets initial state from service', async() => {
    const serviceSocket = msg.service.ws(socketRoute);
    const serviceDistObj = serviceSocket.distObj(distObjName);
    serviceDistObj.data.testKey = 'testData';

    const clientResponse = await msg.runOnClient(async({
      nextPortBase,
      socketRoute,
      distObjName,
    }) => {
      const testSocket = msgClient.ws(`ws://0.0.0.0:${nextPortBase}${socketRoute}`);
      const store = {};
      testSocket.distObj({
        name: distObjName,
        store,
      });

      await new Promise(r => setTimeout(r, 250));
      return store;
    }, {
      nextPortBase,
      socketRoute,
      distObjName,
    });

    expect(clientResponse).toStrictEqual({ testKey: 'testData' });
  });

  it('client distobj picks up change from service', async() => {
    const serviceSocket = msg.service.ws(socketRoute);
    const serviceDistObj = serviceSocket.distObj(distObjName);
    serviceDistObj.data.testKey = 'testData';

    const clientFirstResponse = await msg.runOnClient(async({
      nextPortBase,
      socketRoute,
      distObjName,
    }) => {
      const testSocket = msgClient.ws(`ws://0.0.0.0:${nextPortBase}${socketRoute}`);
      window.store = {};
      testSocket.distObj({
        name: distObjName,
        store,
      });

      await new Promise(r => setTimeout(r, 250));
      return store;
    }, {
      nextPortBase,
      socketRoute,
      distObjName,
    });

    expect(clientFirstResponse).toStrictEqual({ testKey: 'testData' });

    serviceDistObj.data.secondKey = 'secondData';

    const clientSecondResponse = await msg.runOnClient(async() => {
      await new Promise(r => setTimeout(r, 250));
      return store;
    });

    expect(clientSecondResponse).toStrictEqual({ testKey: 'testData', secondKey: 'secondData' });
  });

  xit('client distobj picks up nested change from service', async() => {
    const serviceSocket = msg.service.ws(socketRoute);
    const serviceDistObj = serviceSocket.distObj(distObjName);
    serviceDistObj.data.testKey = { root: { deepData: 5 }};

    await new Promise(r => setTimeout(r, 250));

    const clientFirstResponse = await msg.runOnClient(async({
      nextPortBase,
      socketRoute,
      distObjName,
    }) => {
      const testSocket = msgClient.ws(`ws://0.0.0.0:${nextPortBase}${socketRoute}`);
      window.store = {};
      testSocket.distObj({
        name: distObjName,
        store,
      });

      await new Promise(r => setTimeout(r, 250));
      return store;
    }, {
      nextPortBase,
      socketRoute,
      distObjName,
    });

    // TODO: this already fails here
    expect(clientFirstResponse).toStrictEqual({ testKey: { root: { deepData: 5 } } });

    serviceDistObj.data.testKey.root.deepData = 'secondData';

    const clientSecondResponse = await msg.runOnClient(async() => {
      await new Promise(r => setTimeout(r, 250));
      return store;
    });

    expect(clientSecondResponse).toStrictEqual({ root: { deepData: 'secondData' }});
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
      testSocket.distObj({
        name: distObjName,
        store,
      });

      await new Promise(r => setTimeout(r, 250));
    }, {
      nextPortBase,
      socketRoute,
      distObjName,
    });

    expect(serviceDistObj.data).toStrictEqual({ fromClientStrore: 'test' });
  });

  it('service distobj picks up change from client', async() => {
    const serviceSocket = msg.service.ws(socketRoute);
    const serviceDistObj = serviceSocket.distObj(distObjName);

    await msg.runOnClient(async({
      nextPortBase,
      socketRoute,
      distObjName,
    }) => {
      const testSocket = msgClient.ws(`ws://0.0.0.0:${nextPortBase}${socketRoute}`);
      const store = { fromClientStrore: 'test' };
      window.clientDistObj = testSocket.distObj({
        name: distObjName,
        store,
      });

      await new Promise(r => setTimeout(r, 250));
    }, {
      nextPortBase,
      socketRoute,
      distObjName,
    });

    expect(serviceDistObj.data).toStrictEqual({ fromClientStrore: 'test' });

    await msg.runOnClient(async() => {
      window.clientDistObj.data.secondKey = 'secondData'
      await new Promise(r => setTimeout(r, 250));
    });

    expect(serviceDistObj.data).toStrictEqual({ fromClientStrore: 'test', secondKey: 'secondData' });
  });

  it(`service can create distobj that can't be modified from the client`, async() => {
    const serviceSocket = msg.service.ws(socketRoute);
    const serviceDistObj = serviceSocket.distObj({
      name: distObjName,
      readOnlyClients: true,
    });
    serviceDistObj.data.testKey = 'testData';

    const firstClientData = await msg.runOnClient(async({
      nextPortBase,
      socketRoute,
      distObjName,
    }) => new Promise(async(resolve) => {
      const testSocket = msgClient.ws(`ws://0.0.0.0:${nextPortBase}${socketRoute}`);
      window.distObjStore = {};
      window.clientDistObj = testSocket.distObj({
        name: distObjName,
        store: window.distObjStore,
      });

      await window.clientDistObj.waitForReady();
      return resolve(window.distObjStore)
    }), {
      nextPortBase,
      socketRoute,
      distObjName,
    });

    expect(firstClientData).toStrictEqual({ testKey: 'testData' });

    await msg.runOnClient(async() => {
      window.clientDistObj.data.secondKey = 'secondData'
      await new Promise(r => setTimeout(r, 250));
    });

    expect(serviceDistObj.data).toStrictEqual({ testKey: 'testData' });
  });

  it('service distobj picks up nested change from client', async() => {
    const serviceSocket = msg.service.ws(socketRoute);
    const serviceDistObj = serviceSocket.distObj(distObjName);

    await msg.runOnClient(async({
      nextPortBase,
      socketRoute,
      distObjName,
    }) => {
      const testSocket = msgClient.ws(`ws://0.0.0.0:${nextPortBase}${socketRoute}`);
      const store = { fromClientStrore: { rootKey: { deepKey: 'test'} } };
      window.clientDistObj = testSocket.distObj({
        name: distObjName,
        store,
      });

      await new Promise(r => setTimeout(r, 250));
    }, {
      nextPortBase,
      socketRoute,
      distObjName,
    });

    expect(serviceDistObj.data).toStrictEqual({ fromClientStrore: { rootKey: { deepKey: 'test'} } });

    await msg.runOnClient(async() => {
      window.clientDistObj.data.fromClientStrore.rootKey.deepKey = 'secondData';
      await new Promise(r => setTimeout(r, 250));
    });

    expect(serviceDistObj.data).toStrictEqual({ fromClientStrore: { rootKey: { deepKey: 'secondData'} } });
  });


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
});
