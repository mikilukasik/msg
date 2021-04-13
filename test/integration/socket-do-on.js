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
    ({ err, findInLogLines }) => {
      if (err) throw err;

      expect(findInLogLines(`'socketTest'`)).toBeTruthy();
      expect(findInLogLines(`{ test: 'test' }`)).toBeTruthy();
      if (oneFinished) return done();
      oneFinished = true;
    });

    runOnMsgService(({ msgService, log, shutDown }) => {
      msgService.do('socketTest', { test: 'test' })
        .then(response => log({ response }))
        .then(shutDown);
    },
    ({ err, stdout, findInLogLines }) => {
      if (err) throw err;

      expect(findInLogLines('{ response: { success: true } }')).toBeTruthy();
      if (oneFinished) return done();
      oneFinished = true;
    });
  });
});
