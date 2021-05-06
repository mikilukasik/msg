module.exports = function handlerCreator(msgOptions, route) {
  var log = msgOptions.log || console.log;
  
  var cmd = 'msg:unsubscribe';

  var handler = function(data, comms){
    var event = data.event;
    if (!event || event === 'undefined') log( new Error('event cannot be undefined') )

    const indexToRemove = msgOptions.wsRoutes[route].subscriptions[event].findIndex(({ key }) => key === comms.key);
    const subscribeHandlerComms = msgOptions.wsRoutes[route].subscriptions[event][indexToRemove].comms;
    msgOptions.wsRoutes[route].subscriptions[event].splice(indexToRemove, 1);
    subscribeHandlerComms.send('unsubscribed');
    comms.send('ok')
  };

  return [cmd, handler];
};
