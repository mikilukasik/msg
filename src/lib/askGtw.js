module.exports = function askGtwCreator(msgOptions){

  return function askGtw(command, data){
    // msgOptions.log('in askGtw');
    return new Promise(function(res3, rej3){
      var tempConversationId = Math.random().toString();
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
        msgOptions.toGtw(command, Object.assign({
          // command: command,
          // data: data,
          // owner: msgOptions.serviceName,
          tempConversationId: tempConversationId
        }, data));
      } catch (te) {
        rej3(te);
      }
    });
  };

};