import expect from 'expect';
import _msgService from '../../src/service';
import _msgGateway from '../../src/gateway';

let msg;
let cmd
let testDataString;
let testDataNumber;
let testDataObject;
let testDataArray;

let nextPortBase = 16000;

const getLogger = (prefix) => (...args) => {}; // console.log(prefix, ...args);

describe('gateway <--> service: .data & .onData', () => {
  beforeEach(async function() {
    nextPortBase += 10;
    cmd = `someCommand${Math.random()}`;
    testDataString = `some string ${Math.random()}`;
    testDataNumber = Math.random();
    testDataObject = { [testDataString]: testDataNumber };
    testDataArray = [testDataString, testDataObject];
    

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

  it('service.do -> gateway.on, mid-flight data from gateway', (done) => {
    const dataCache = [];

    msg.gateway.on(cmd, (data, comms) => {
      comms.data(testDataString);
      comms.data(testDataNumber);
      comms.data(testDataObject);
      comms.data(testDataArray);
    });
    
    msg.service.do(cmd, testDataString, (comms) => {
      comms.onData((data) => {
        dataCache.push(data);
        if (dataCache.length === 4) {
          expect(dataCache).toStrictEqual([
            testDataString,
            testDataNumber,
            testDataObject,
            testDataArray,
          ]);
          done();
        }
      });
    });
  });

  // TODO: not yet implemented
  xit('service.do -> gateway.on, mid-flight data from service', (done) => {
    const dataCache = [];

    msg.gateway.on(cmd, (data, comms) => {
      comms.onData((data) => {
        dataCache.push(data);
        if (dataCache.length === 4) {
          expect(dataCache).toStrictEqual([
            testDataString,
            testDataNumber,
            testDataObject,
            testDataArray,
          ]);
          done();
        }
      });
    });
    
    msg.service.do(cmd, testDataString, (comms) => {
      comms.data(testDataString);
      comms.data(testDataNumber);
      comms.data(testDataObject);
      comms.data(testDataArray);
    });
  });

  // TODO: doesn't work..
  xit('gateway.do -> service.on, mid-flight data from gateway', (done) => {
    const dataCache = [];
    msg.service.on(cmd, (data, comms) => {
      comms.onData((data) => {
        dataCache.push(data);
        if (dataCache.length === 4) {
          expect(dataCache).toStrictEqual([
            testDataString,
            testDataNumber,
            testDataObject,
            testDataArray,
          ]);
          done();
        }
      });
    });
    
    msg.gateway.waitForRule(cmd).then(() => {
      msg.gateway.do(cmd, testDataString, (comms) => {
        comms.data(testDataString);
        comms.data(testDataNumber);
        comms.data(testDataObject);
        comms.data(testDataArray);
      });
    });
  });

  it('gateway.do -> service.on, mid-flight data from service', (done) => {
    const dataCache = [];
    msg.service.on(cmd, (data, comms) => {
      comms.data(testDataString);
      comms.data(testDataNumber);
      comms.data(testDataObject);
      comms.data(testDataArray);
    });
    
    msg.gateway.waitForRule(cmd).then(() => {
      msg.gateway.do(cmd, testDataString, (comms) => {
        comms.onData((data) => {
          dataCache.push(data);
          if (dataCache.length === 4) {
            expect(dataCache).toStrictEqual([
              testDataString,
              testDataNumber,
              testDataObject,
              testDataArray,
            ]);
            done();
          }
        });
      });
    });
  });
});
