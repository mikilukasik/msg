module.exports = function subscribeCreator(msgOptions){

  return function subscribe(cmd, handler){
    var argObj = { cmd, handler };

    msgOptions.subscribedTo[argObj.cmd] = {
      cmd,
      argObj: argObj,
      handler,
    };

    return msgOptions.obj.do('msg:subscribe', { event: cmd }, function(comms){
      comms.onData(function(data){
        msgOptions.subscribedTo[cmd].handler(data);
      });
    });
  };
};
