const getRandomId = require('./getRandomId.js');

module.exports = function askGtwCreator(msgOptions){

  return function askGtw(cmd, data){
    // msgOptions.log('in mgAskGtw');
    return new Promise(function(res3, rej3){
      var tempConversationId = getRandomId();
      data.cmd = cmd;
      try {

        msgOptions.waitingCbsByConvId[tempConversationId] = function(reply) {
          // msgOptions.log('in final rersolver, reply:', reply)
          delete msgOptions.waitingCbsByConvId[tempConversationId];
          delete msgOptions.waitingErrHandlersByConvId[tempConversationId];
          return res3(reply);
        };

        msgOptions.waitingErrHandlersByConvId[tempConversationId] = function(e) {
          // msgOptions.log('in final rersolver, reply:', reply)
          delete msgOptions.waitingCbsByConvId[tempConversationId];
          delete msgOptions.waitingErrHandlersByConvId[tempConversationId];
          return rej3(e);
        };

        return msgOptions.toGtw(cmd, Object.assign({
          // cmd: cmd,
          // data: data,
          // owner: msgOptions.serviceName,
          tempConversationId: tempConversationId
        }, data)).catch(msgOptions.log);
      } catch (te) {
        msgOptions.log(te.message + '\n' + te.stack);
        rej3(te);
      }
    });
  };

};