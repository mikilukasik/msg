module.exports = function subscribeCreator(msgOptions){

  return function subscribe(){
    var argObj = msgOptions.getArgs(arguments);

    msgOptions.subscribedTo[argObj.command] = {
      cmd: argObj.command,
      argObj: argObj,
      cb: argObj.handler
    };

    return msgOptions.obj.do('msg:subscribe', { event: argObj.command }, function(comms){
      comms.onData(function(data){
        msgOptions.subscribedTo[argObj.command].cb(data);
      });
    });
  };
};
