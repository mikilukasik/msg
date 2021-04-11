module.exports = function toGtwCreator(msgOptions){

  return function toGtw(command, data, conversationId){
    return new Promise(function(res3, rej3){
      try {
        msgOptions.waitForConnection()
          .then(function(){
            
            return msgOptions.connection.send(JSON.stringify(Object.assign({
              command: command,
              data: data,
              owner: msgOptions.serviceLongName,
              conversationId: conversationId,            
              serviceName: msgOptions.serviceName,
              serviceLongName: msgOptions.serviceLongName,
            }, data)));
          
          }, rej3 ).then(res3, rej3);
      } catch (te) {
        rej3(te);
      }
    });
  };

};