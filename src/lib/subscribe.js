module.exports = function subscribeCreator(msgOptions){

  return function subscribe(command, handler){
    var argObj = { command, handler };

    msgOptions.subscribedTo[argObj.command] = {
      command,
      argObj: argObj,
      handler,
    };

    return msgOptions.obj.do('msg:subscribe', { event: command }, function(comms){
      comms.onData(function(data){
        msgOptions.subscribedTo[command].handler(data);
      });
    });
  };
};
