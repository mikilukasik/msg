module.exports = function emitCreator(msgOptions){

  function emit(cmd1){
    var argObj = msgOptions.getArgs(arguments);
    if (!argObj.emitId) argObj.emitId = 'emit' + (Math.random() * Math.random());
    return new Promise(function(res, rej){
      var rule = msgOptions.createRule(argObj);
      var subscribers = (msgOptions.subscriptions[argObj.cmd] || []);

      let subI = subscribers.length;
      while (subI--) {
        try{
          subscribers[subI].comms.data({
            emitId: argObj.emitId,
            argObj: argObj
          });
        } catch (e) {
          if (e.message === 'not opened') {
            subscribers.splice(subI, 1);
          } else {
            msgOptions.log({m: e.message}, e);
          }
        }
      };
    });
  };

  emit.interval = function(emitName, interval, emitFunc) {
    return setInterval(() => {
      if ((msgOptions.subscriptions[emitName] || []).length) {
        emit(emitName, emitFunc());
      }
    }, interval);
  }

  return emit;
  
};