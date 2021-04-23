module.exports = function handlerCreator(msgOptions) {
  var log = msgOptions.log || console.log;
  
  var command = 'msg:subscribe';
  
  // var configObj = {
  //   keys: [
  //     'event',
  //   ],
  // };

  var processedEmitIds = {};
  var isNewEmitId = function (id) {
    if (processedEmitIds[id]) return false;
    
    processedEmitIds[id] = true;
    msgOptions.timeoutIds[`deleteProcessedEmitIds-${id}`] = setTimeout(function() {
      delete msgOptions.timeoutIds[`deleteProcessedEmitIds-${id}`];
      delete processedEmitIds[id];
    }, 10000);
    return true;
  };

  var handler = function(data, comms){
    var event = data.event;
    if (!event || event === 'undefined') log( new Error('event cannot be undefined') )

    if(!msgOptions.subscriptions[event]) {
      msgOptions.subscriptions[event] = [];

      msgOptions.obj.sub(event, function(data){
        // msgOptions.log('emit data received from ' + comms.owner, Object.keys(data))

        if (isNewEmitId(data.emitId)) {
          msgOptions.subscriptions[event].forEach(function(s) {
            s.comms.data(data);
          });
          // msgOptions.log('emit data distributed to ' + msgOptions.subscriptions[event].length + ' subscribers')
        }
          
      }).then(() => {}, log);

    }
    msgOptions.subscriptions[event].push({
      // argObj,
      event,
      comms,
      ws: comms.ws,
      key: comms.key
    });

    // TODO: comms.send or comms.destroy should be called on unsub or connection error to delete handlers (memleak issue)

    log('service ' + comms.serviceLongName + ' subscribed to event ' + event + ' (key: ' + comms.key + ')');

  };

  return [command, handler];
};
