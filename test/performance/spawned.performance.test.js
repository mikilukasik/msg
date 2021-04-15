import expect from 'expect';
import { startServer } from '../helpers';

const SHOW_LOGS_ON_CLEAN_EXIT = false;
let nextPortBase = 20000;

describe.only('spawned service <--> service: performance', () => {
  beforeEach(() => {
    nextPortBase += 20;
  });

  it('Completing full service to service cycles with small string data', function(done) {
    this.timeout(20000);
    this.retries(4);
    let finishedServerCount = 0;
    const result = {};

    const validate = () => {
      console.log(`master: ${result.master}, local: ${result.local}  -->  ${(((result.local / result.master) - 1) * 100).toFixed(2)}%`)
      expect(result.local).toBeGreaterThanOrEqual(result.master);
      done();
    };

    startServer({
      type: 'localGateway',
      port: nextPortBase,
      code: ({ msgGateway }) => {
        msgGateway.on('closeGateway', () => { setTimeout(msgGateway.close, 300); });
      },
      cb: ({ err, stdout, stderr }) => {
        if (SHOW_LOGS_ON_CLEAN_EXIT) console.log(stdout);
        if (err) { console.error(stderr, stdout); throw err; }
        if (finishedServerCount === 5) return validate();
        finishedServerCount += 1;
      }
    });
    
    startServer({
      type: 'localService',
      env: { MSG_ADDRESS: `0.0.0.0:${nextPortBase}` },
      port: nextPortBase + 1,
      code: ({ msgService, log }) => {
        msgService.on('socketTest', (data, comms) => { comms.send({ success: true }); });
        msgService.on('closeService', (data, comms) => { comms.send('ok'); setTimeout(msgService.close, 300); });
      },
      cb: ({ err, stdout, stderr, findInLogLines }) => {
        if (SHOW_LOGS_ON_CLEAN_EXIT) console.log(stdout);
        if (err) { console.error(stderr, stdout); throw err; }
        if (finishedServerCount === 5) return validate();
        finishedServerCount += 1;
      }
    });

    startServer({
      type: 'localService',
      env: { MSG_ADDRESS: `0.0.0.0:${nextPortBase}` },
      port: nextPortBase + 2,
      code: ({ msgService, log }) => {
        const endBeforeTimestamp = Date.now() + 5000;
        let completedCycles = 0;
        const sendDo = () => msgService.do('socketTest', 'testDataString').then(() => {
          if (Date.now() > endBeforeTimestamp) {
            log({ completedCycles });
            msgService.do('closeService').then(() => msgService.do('closeGateway'));
            setTimeout(msgService.close, 300);
            return;
          }
          completedCycles += 1;
          sendDo();
        });
        setTimeout(sendDo, 300);
      },
      cb: ({ err, stdout, stderr, findInLogLines }) => {
        if (SHOW_LOGS_ON_CLEAN_EXIT) console.log(stdout);
        if (err) { console.error(stderr, stdout); throw err; }

        const completedCycles = findInLogLines('{ completedCycles:').match(/\d+/g).map(Number)[0];
        console.log(`local branch completed ${completedCycles} cycles.`);
        result.local = completedCycles;
        if (finishedServerCount === 5) return validate();
        finishedServerCount += 1;
      }
    });


    startServer({
      type: 'masterGateway',
      port: nextPortBase + 10,
      code: ({ msgGateway }) => {
        msgGateway.on('closeGateway', () => { setTimeout(msgGateway.close, 300); });
      },
      cb: ({ err, stdout, stderr }) => {
        if (SHOW_LOGS_ON_CLEAN_EXIT) console.log(stdout);
        if (err) { console.error(stderr, stdout); throw err; }
        if (finishedServerCount === 5) return validate();
        finishedServerCount += 1;
      }
    });
    
    startServer({
      type: 'masterService',
      env: { MSG_ADDRESS: `0.0.0.0:${nextPortBase + 10}` },
      port: nextPortBase + 11,
      code: ({ msgService, log }) => {
        msgService.on('socketTest', (data, comms) => { comms.send({ success: true }); });
        msgService.on('closeService', (data, comms) => { comms.send('ok'); setTimeout(msgService.close, 300); });
      },
      cb: ({ err, stdout, stderr, findInLogLines }) => {
        if (SHOW_LOGS_ON_CLEAN_EXIT) console.log(stdout);
        if (err) { console.error(stderr, stdout); throw err; }
        if (finishedServerCount === 5) return validate();
        finishedServerCount += 1;
      }
    });

    startServer({
      type: 'masterService',
      env: { MSG_ADDRESS: `0.0.0.0:${nextPortBase + 10}` },
      port: nextPortBase + 12,
      code: ({ msgService, log }) => {
        const endBeforeTimestamp = Date.now() + 5000;
        let completedCycles = 0;
        const sendDo = () => msgService.do('socketTest', 'testDataString').then(() => {
          if (Date.now() > endBeforeTimestamp) {
            log({ completedCycles });
            msgService.do('closeService').then(() => msgService.do('closeGateway'));
            setTimeout(msgService.close, 300);
            return;
          }
          completedCycles += 1;
          sendDo();
        });
        setTimeout(sendDo, 300);
      },
      cb: ({ err, stdout, stderr, findInLogLines }) => {
        if (SHOW_LOGS_ON_CLEAN_EXIT) console.log(stdout);
        if (err) { console.error(stderr, stdout); throw err; }

        const completedCycles = findInLogLines('{ completedCycles:').match(/\d+/g).map(Number)[0];
        console.log(`master branch completed ${completedCycles} cycles.`);
        result.master = completedCycles;
        if (finishedServerCount === 5) return validate();
        finishedServerCount += 1;
      }
    });
  });
});
