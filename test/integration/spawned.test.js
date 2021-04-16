import expect from 'expect';
import { spawnServer } from '../helpers';

let nextPortBase = 19000;

describe('test on multiple spawned processes', () => {
  beforeEach(() => {
    nextPortBase += 10;
  });

  it('msgService.do can call msgGateway.on and gets the response', function(done) {
    this.timeout(10000);
    let oneFinished = false;

    spawnServer({
      type: 'localGateway',
      port: nextPortBase,
      code: ({ msgGateway, log }) => {
        msgGateway.on('socketTest', (data, comms) => {
          log({ data });
          comms.send({ success: true });
          msgGateway.close();
        });
      },
      cb: ({ err, stdout, stderr, findInLogLines }) => {
        if (err) { console.error(stderr, stdout); throw err; }
        expect(findInLogLines(`'socketTest'`)).toBeTruthy();
        expect(findInLogLines(`{ test: 'service-to-gateway-test' }`)).toBeTruthy();
        if (oneFinished) return done();
        oneFinished = true;
      }
    });
    
    spawnServer({
      type: 'localService',
      env: { MSG_ADDRESS: `0.0.0.0:${nextPortBase}` },
      port: nextPortBase + 1,
      code: ({ msgService, log }) => {
        msgService.do('socketTest', { test: 'service-to-gateway-test' })
          .then(response => log({ response }))
          .then(msgService.close);
      },
      cb: ({ err, stdout, stderr, findInLogLines }) => {
        if (err) { console.error(stderr, stdout); throw err; }
        expect(findInLogLines('{ response: { success: true } }')).toBeTruthy();
        if (oneFinished) return done();
        oneFinished = true;
      }
    });
  });

  it('msgGateway.do can call msgService.on and gets the response', function(done) {
    this.timeout(10000);
    let oneFinished = false;

    spawnServer({
      type: 'localGateway',
      port: nextPortBase,
      code: ({ msgGateway, log }) => {
        msgGateway.waitForRule('socketTest')
          .then(() => msgGateway.do('socketTest', { test: 'service-to-gateway-test' }))
          .then(response => log({ response }))
          .then(msgGateway.close);
      },
      cb: ({ err, stdout, stderr, findInLogLines }) => {
        if (err) { console.error(stderr, stdout); throw err; }
        expect(findInLogLines('{ response: { success: true } }')).toBeTruthy();

        
        if (oneFinished) return done();
        oneFinished = true;
      }
    });
    
    spawnServer({
      type: 'localService',
      env: { MSG_ADDRESS: `0.0.0.0:${nextPortBase}` },
      port: nextPortBase + 1,
      code: ({ msgService, log }) => {
        msgService.on('socketTest', (data, comms) => {
          log({ data });
          comms.send({ success: true });
          msgService.close();
        });
      },
      cb: ({ err, stdout, stderr, findInLogLines }) => {
        if (err) { console.error(stderr, stdout); throw err; }
        expect(findInLogLines(`'socketTest'`)).toBeTruthy();
        expect(findInLogLines(`{ test: 'service-to-gateway-test' }`)).toBeTruthy();
        if (oneFinished) return done();
        oneFinished = true;
      }
    });
  });
});
