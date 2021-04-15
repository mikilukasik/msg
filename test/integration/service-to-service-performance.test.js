import expect from 'expect';
import _msgService from '../../src/service';
import _msgGateway from '../../src/gateway';

const MAX_TEST_LENGTH = 2000;
const MIN_ACCEPTED_CYCLES = {
  service2serviceDoOnSmallString: 7400,
  service2serviceDoOnSmallObject: 8900,
  service2serviceDoOnLargeString: 95,
  service2serviceDoOnLargeObject: 190,
};

let msg;
let command;
let testDataString;
let testDataStringResponse;
let testDataObject;
let testDataObjectResponse;

let nextPortBase = 18000;

const generateSmallData = () => {
  testDataString = `some string ${Math.random()}`;
  testDataStringResponse = `some string ${Math.random()}`;
  testDataObject = { [testDataString]: testDataString };
  testDataObjectResponse = { [testDataStringResponse]: testDataStringResponse };
};

const generateLargeData = () => {
  testDataString = [...new Array(1000)].map(() => `some string ${Math.random()}`).join(' ');
  testDataStringResponse = [...new Array(1000)].map(() => `some string ${Math.random()}`).join(' ');
  testDataObject = [...new Array(1000)].reduce((result, e, index) => { result[`key${index}${Math.random()}`] = Math.random(); return result; }, {});
  testDataObjectResponse = [...new Array(1000)].reduce((result, e, index) => { result[`key${index}${Math.random()}`] = Math.random(); return result; }, {});
};

const getLogger = (prefix) => (...args) => {}; // console.log(prefix, ...args);

describe('service <--> service: performance', function() {
  this.timeout(MAX_TEST_LENGTH + 1500);
  this.retries(2);

  beforeEach(async function() {
    nextPortBase += 10;
    command = `someCommand${Math.random()}`;

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

  it(`Completes at least ${MIN_ACCEPTED_CYCLES.service2serviceDoOnSmallString} full service to service cycles with small string data`, async() => {
    generateSmallData();
    msg.service1.on(command, (data, comms) => {
      comms.send(testDataStringResponse);
    });
    await msg.gateway.waitForRule(command);

    const endBeforeTimestamp = Date.now() + MAX_TEST_LENGTH;
    let completedCyclesCount = 0;

    const sendDo = () => msg.service2.do(command, testDataString)
      .then(() => {
        if (Date.now() > endBeforeTimestamp) return;
        completedCyclesCount += 1;
        return sendDo();
      });
    await sendDo();

    console.log(`Completed ${completedCyclesCount} full do-on cycles with small string data.`)
    expect(completedCyclesCount).toBeGreaterThan(MIN_ACCEPTED_CYCLES.service2serviceDoOnSmallString);
  });

  it(`Completes at least ${MIN_ACCEPTED_CYCLES.service2serviceDoOnSmallObject} full service to service cycles with small object data`, async() => {
    generateSmallData();
    msg.service1.on(command, (data, comms) => {
      comms.send(testDataObjectResponse);
    });
    await msg.gateway.waitForRule(command);

    const endBeforeTimestamp = Date.now() + MAX_TEST_LENGTH;
    let completedCyclesCount = 0;

    const sendDo = () => msg.service2.do(command, testDataObject)
      .then(() => {
        if (Date.now() > endBeforeTimestamp) return;
        completedCyclesCount += 1;
        return sendDo();
      });
    await sendDo();

    console.log(`Completed ${completedCyclesCount} full do-on cycles with small object data.`)
    expect(completedCyclesCount).toBeGreaterThan(MIN_ACCEPTED_CYCLES.service2serviceDoOnSmallObject);
  });

  it(`Completes at least ${MIN_ACCEPTED_CYCLES.service2serviceDoOnLargeString} full service to service cycles with large string data`, async() => {
    generateLargeData();
    msg.service1.on(command, (data, comms) => {
      comms.send(testDataStringResponse);
    });
    await msg.gateway.waitForRule(command);

    const endBeforeTimestamp = Date.now() + MAX_TEST_LENGTH;
    let completedCyclesCount = 0;

    const sendDo = () => msg.service2.do(command, testDataString)
      .then(() => {
        if (Date.now() > endBeforeTimestamp) return;
        completedCyclesCount += 1;
        return sendDo();
      });
    await sendDo();

    console.log(`Completed ${completedCyclesCount} full do-on cycles with large string data.`)
    expect(completedCyclesCount).toBeGreaterThan(MIN_ACCEPTED_CYCLES.service2serviceDoOnLargeString);
  });

  it(`Completes at least ${MIN_ACCEPTED_CYCLES.service2serviceDoOnLargeObject} full service to service cycles with large object data`, async() => {
    generateLargeData;
    msg.service1.on(command, (data, comms) => {
      comms.send(testDataObjectResponse);
    });
    await msg.gateway.waitForRule(command);

    const endBeforeTimestamp = Date.now() + MAX_TEST_LENGTH;
    let completedCyclesCount = 0;

    const sendDo = () => msg.service2.do(command, testDataObject)
      .then(() => {
        if (Date.now() > endBeforeTimestamp) return;
        completedCyclesCount += 1;
        return sendDo();
      });
    await sendDo();

    console.log(`Completed ${completedCyclesCount} full do-on cycles with large object data.`)
    expect(completedCyclesCount).toBeGreaterThan(MIN_ACCEPTED_CYCLES.service2serviceDoOnLargeObject);
  });


  
  // it('.do sends number data to .on and receives number answer', async() => {
  //   msg.service1.on(command, (data, comms) => {
  //     expect(data.args[1]).toBe(testDataNumber);
  //     comms.send(testDataNumberResponse);
  //   });
  //   return msg.service2.do(command, testDataNumber)
  //     .then(response => {
  //       expect(response).toStrictEqual(testDataNumberResponse);
  //     });
  // });

  

  // it('.do sends object data to .on and receives object answer', async() => {
  //   msg.service1.on(command, (data, comms) => {
  //     expect(data.args[1]).toStrictEqual(testDataObject);
  //     comms.send(testDataObjectResponse);
  //   });
  //   return msg.service2.do(command, testDataObject)
  //     .then(response => {
  //       expect(response).toStrictEqual(testDataObjectResponse);
  //     });
  // });

  

  // it('.do sends array data to .on and receives array answer', async() => {
  //   msg.service1.on(command, (data, comms) => {
  //     expect(data.args[1]).toStrictEqual(testDataArray);
  //     comms.send(testDataArrayResponse);
  //   });
  //   return msg.service2.do(command, testDataArray)
  //     .then(response => {
  //       expect(response).toStrictEqual(testDataArrayResponse);
  //     });
  // });

  
});
