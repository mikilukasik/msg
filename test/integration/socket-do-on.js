import expect from 'expect';
import { runOnMsgGateway, runOnMsgService } from '../harness';

describe('msg.on & msg.do', () => {
  it('msgService.do can call msgGateway.on and gets the response', function(done) {
    this.timeout(10000);
    let oneFinished = false;

    runOnMsgGateway(({ msgGateway, log, shutDown }) => {
      msgGateway.on('socketTest', (data, comms) => {
        log({ data });
        comms.send({ success: true });
        shutDown();
      });
    },
    ({ err, stdout, stderr, findInLogLines }) => {
      if (err) { console.error(stderr, stdout); throw err; }
      expect(findInLogLines(`'socketTest'`)).toBeTruthy();
      expect(findInLogLines(`{ test: 'service-to-gateway-test' }`)).toBeTruthy();
      if (oneFinished) return done();
      oneFinished = true;
    });

    runOnMsgService(({ msgService, log, shutDown }) => {
      msgService.do('socketTest', { test: 'service-to-gateway-test' })
        .then(response => log({ response }))
        .then(shutDown);
    },
    ({ err, stdout, stderr, findInLogLines }) => {
      if (err) { console.error(stderr, stdout); throw err; }
      expect(findInLogLines('{ response: { success: true } }')).toBeTruthy();
      if (oneFinished) return done();
      oneFinished = true;
    });
  });

  it('msgGateway.do can call msgService.on and gets the response', function(done) {
    this.timeout(15000);
    let oneFinished = false;

    runOnMsgGateway(({ msgGateway, log, shutDown }) => {
      // TODO: gateway should provide a method to wait for socket rule to be created. this timeout is a nasty hack here
      setTimeout(() => {
        msgGateway.do('g2s_socketTest', { test: 'gateway-to-service-test' })
          .then(response => log({ response }))
          .then(shutDown);
      }, 2000);
    },
    ({ err, stdout, stderr, findInLogLines }) => {
      if (err) { console.error(stderr, stdout); throw err; }
      expect(findInLogLines('{ response: { g2s_success: true } }')).toBeTruthy();
      if (oneFinished) return done();
      oneFinished = true;
    });

    runOnMsgService(({ msgService, log, shutDown }) => {
      msgService.on('g2s_socketTest', (data, comms) => {
        log({ data, comms });
        comms.send({ g2s_success: true });
        
        // TODO: comms.send should return a promise that resolves once the data is sent out
        setTimeout(shutDown, 500);
      });
    },
    ({ err, stdout, stderr, findInLogLines }) => {
      if (err) { console.error(stderr, stdout); throw err; }
      expect(findInLogLines(`'g2s_socketTest'`)).toBeTruthy();
      expect(findInLogLines(`{ test: 'gateway-to-service-test' }`)).toBeTruthy();
      if (oneFinished) return done();
      oneFinished = true;
    });
  });
});
