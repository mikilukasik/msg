const getRandomId = require('./getRandomId.js');

module.exports = function askGtwCreator(msgOptions){

  return function askGtw(command, data){
    // msgOptions.log('in mgAskGtw');
    return new Promise(function(res3, rej3){
      var tempConversationId = getRandomId();
      data.command = command;
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

        return msgOptions.toGtw(command, Object.assign({
          // command: command,
          // data: data,
          // owner: msgOptions.serviceName,
          tempConversationId: tempConversationId
        }, data)).then(() => {}, msgOptions.log);
      } catch (te) {
        msgOptions.log(te.message + '\n' + te.stack);
        rej3(te);
      }
    });
  };

};