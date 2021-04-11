module.exports = function handlerCreator(msgOptions) {
  var log = msgOptions.log || console.log;
  
  var cmd = 'msg:unsubscribe';
  
  var configObj = {
    keys: [
      'event',
    ],
  };

  var handler = function(argObj, comms){
    var event = argObj.cmdArgs.event;
    
    var i = (msgOptions.subscriptions[event] || []).length;
    while (i--) {
      if (msgOptions.subscriptions[event][i].key === comms.key) msgOptions.subscriptions[event].splice(i, 1);  // TODO: should break the loop if surely one only
    }
    

    log('service ' + comms.serviceLongName + ' unsubscribed from event ' + event + ' (key: ' + comms.key + ')');

    if(msgOptions.subscriptions[event] && msgOptions.subscriptions[event].length === 0) {
      msgOptions.obj.unsub(event);
      msgOptions.subscriptions[event] = undefined;  // garbage collection
    }

    comms.send({subscribed: false, echo: argObj});

  };

  return [cmd, configObj, handler];
};
