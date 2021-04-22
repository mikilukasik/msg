import expect from 'expect';
import { spawnServer } from '../helpers';

const TEST_LENGTH = Number(process.env.PERFORMANCE_TEST_LENGTH) || 5000;
const SHOW_LOGS_ON_CLEAN_EXIT = false;
const THRESHOLD = Number(process.env.PERFORMANCE_TEST_THRESHOLD) || -0.015;

let nextPortBase = 20000;

describe('spawned service <--> service: performance', () => {
  beforeEach(() => {
    nextPortBase += 20;
  });

  it('Completing full service to service cycles with small string data', function(done) {
    this.timeout(TEST_LENGTH + 5000);
    this.retries(4);
    let finishedServerCount = 0;
    const result = {};

    const validate = () => {
      const percentageDiff = (result.local / result.master) - 1;
      console.log(`master: ${result.master}, local: ${result.local}  -->  ${percentageDiff > 0 ? '+' : ''}${(percentageDiff * 100).toFixed(2)}%`);
      expect(percentageDiff).toBeGreaterThanOrEqual(THRESHOLD);
      done();
    };

    spawnServer({
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
    
    spawnServer({
      type: 'localService',
      env: { MSG_ADDRESS: `0.0.0.0:${nextPortBase}` },
      port: nextPortBase + 1,
      code: ({ msgService }) => {
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

    spawnServer({
      type: 'localService',
      env: { MSG_ADDRESS: `0.0.0.0:${nextPortBase}`, TEST_LENGTH },
      port: nextPortBase + 2,
      code: ({ msgService, log, TEST_LENGTH }) => {
        const endBeforeTimestamp = Date.now() + TEST_LENGTH;
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
        setTimeout(sendDo, 1000);
      },
      cb: ({ err, stdout, stderr, findInLogLines }) => {
        if (SHOW_LOGS_ON_CLEAN_EXIT) console.log(stdout);
        if (err) { console.error(stderr, stdout); throw err; }

        const completedCycles = findInLogLines('{ completedCycles:').match(/\d+/g).map(Number)[0];
        result.local = completedCycles;
        if (finishedServerCount === 5) return validate();
        finishedServerCount += 1;
      }
    });


    spawnServer({
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
    
    spawnServer({
      type: 'masterService',
      env: { MSG_ADDRESS: `0.0.0.0:${nextPortBase + 10}` },
      port: nextPortBase + 11,
      code: ({ msgService }) => {
        msgService.on('socketTest', (data, comms) => { comms.send({ success: true }); });
        msgService.on('closeService', (data, comms) => { comms.send('ok'); setTimeout(msgService.close, 300); });
      },
      cb: ({ err, stdout, stderr }) => {
        if (SHOW_LOGS_ON_CLEAN_EXIT) console.log(stdout);
        if (err) { console.error(stderr, stdout); throw err; }
        if (finishedServerCount === 5) return validate();
        finishedServerCount += 1;
      }
    });

    spawnServer({
      type: 'masterService',
      env: { MSG_ADDRESS: `0.0.0.0:${nextPortBase + 10}`, TEST_LENGTH },
      port: nextPortBase + 12,
      code: ({ msgService, log, TEST_LENGTH }) => {
        const endBeforeTimestamp = Date.now() + TEST_LENGTH;
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
        setTimeout(sendDo, 1000);
      },
      cb: ({ err, stdout, stderr, findInLogLines }) => {
        if (SHOW_LOGS_ON_CLEAN_EXIT) console.log(stdout);
        if (err) { console.error(stderr, stdout); throw err; }

        const completedCycles = findInLogLines('{ completedCycles:').match(/\d+/g).map(Number)[0];
        result.master = completedCycles;
        if (finishedServerCount === 5) return validate();
        finishedServerCount += 1;
      }
    });
  });
});
