module.exports = function handlerCreator(msgOptions, route) {
  var log = msgOptions.log || console.log;
  
  var cmd = 'msg:subscribe';

  var handler = function(data, comms){
    var event = data.event;
    if (!event || event === 'undefined') log( new Error('event cannot be undefined') )

    if(!msgOptions.wsRoutes[route].subscriptions[event]) {
      msgOptions.wsRoutes[route].subscriptions[event] = [];
    }
    msgOptions.wsRoutes[route].subscriptions[event].push({
      comms,
      key: comms.key
    });
  };

  return [cmd, handler];
};
