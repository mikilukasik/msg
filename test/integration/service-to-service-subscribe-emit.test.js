import expect from 'expect';
import _msgService from '../../src/service';
import _msgGateway from '../../src/gateway';

const SHOW_LOGS = false;

let msg;
let command;
let testDataString;

let nextPortBase = 23000;

const getLogger = (prefix) => (...args) => SHOW_LOGS ? console.log(prefix, ...args) : null;

describe('service <--> service: .subscribe and .emit', () => {
  beforeEach(async function() {
    nextPortBase += 10;
    command = `someCommand${Math.random()}`;
    testDataString = `some string ${Math.random()}`;
   
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

  afterEach(async() => {
    await msg.service1.close();
    await msg.service2.close();
    await msg.gateway.close();
  });

  xit('service.emit sends data that service.subscribe receives', (done) => {
    msg.service1.subscribe(command, (data) => {
      expect(data.argObj.data).toBe(testDataString);
      done();
    });

    setTimeout(() => msg.service2.emit(command, testDataString), 50);
  });

  it('gateway.emit sends data that service.subscribe receives', (done) => {
    msg.service1.subscribe(command, (data) => {
      expect(data.argObj.data).toBe(testDataString);
      done();
    });

    setTimeout(() => msg.gateway.emit(command, testDataString), 50);
  });

  it('gateway.emit sends data that multiple service.subscribe handlers receive', (done) => {
    let receivedCount = 0;
    const registerCall = () => {
      receivedCount += 1;
      if (receivedCount === 2) done();
    };
    
    msg.service1.subscribe(command, (data) => {
      expect(data.argObj.data).toBe(testDataString);
      registerCall();
    });

    msg.service2.subscribe(command, (data) => {
      expect(data.argObj.data).toBe(testDataString);
      registerCall();
    });

    setTimeout(() => msg.gateway.emit(command, testDataString), 50);
  });
});
