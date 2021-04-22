const getRandomId = require('./getRandomId.js');

module.exports = function emitCreator(msgOptions){

  function emit(command, data, handler){
    var argObj = { command, data, handler };
    if (!argObj.emitId) argObj.emitId = 'emit' + (getRandomId());
    return new Promise(function(res, rej){
      var rule = msgOptions.createRule(argObj);
      var subscribers = (msgOptions.subscriptions[argObj.command] || []);

      let subI = subscribers.length;
      while (subI--) {
        try{
          subscribers[subI].comms.data(data);
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
    msgOptions.intervalIds[`emit-interval-${emitName}`] = setInterval(() => {
      if ((msgOptions.subscriptions[emitName] || []).length) {
        emit(emitName, emitFunc());
      }
    }, interval);
    return msgOptions.intervalIds[`emit-interval-${emitName}`];
  };

  return emit;
  
};