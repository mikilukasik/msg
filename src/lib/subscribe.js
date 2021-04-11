module.exports = function subscribeCreator(msgOptions){

  return function subscribe(){
    var argObj = msgOptions.getArgs(arguments);

    msgOptions.subscribedTo[argObj.cmd] = {
      cmd: argObj.cmd,
      argObj: argObj,
      cb: argObj.cb
    };

    return msgOptions.obj.do('msg:subscribe -e ' + argObj.cmd, function(comms){
      comms.onData(function(data){
        msgOptions.subscribedTo[argObj.cmd].cb(data);
      });
    });
  };
};
