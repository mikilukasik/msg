module.exports = function subscribeCreator(msgOptions){

  return function subscribe(command, handler){
    var argObj = { command, handler };

    msgOptions.subscribedTo[argObj.command] = {
      command: argObj.command,
      argObj: argObj,
      handler: argObj.handler
    };

    return msgOptions.obj.do('msg:subscribe', { event: argObj.command }, function(comms){
      comms.onData(function(data){
        msgOptions.subscribedTo[argObj.command].handler(data);
      });
    });
  };
};
