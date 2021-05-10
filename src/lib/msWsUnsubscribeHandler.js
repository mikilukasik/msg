module.exports = function handlerCreator(msgOptions, route) {
  var log = msgOptions.log || console.log;
  
  var cmd = 'msg:unsubscribe';

  var handler = function(data, comms){
    var event = data.event;
    if (!event || event === 'undefined') log( new Error('event cannot be undefined') )

    if (!msgOptions.wsRoutes[route].subscriptions[event]) return;

    const indexToRemove = msgOptions.wsRoutes[route].subscriptions[event].findIndex(({ key }) => key === comms.key);
    const subscribeHandler = msgOptions.wsRoutes[route].subscriptions[event][indexToRemove];
    // TODO: subscribehandler sometimes is undefined. wonder why..

    msgOptions.wsRoutes[route].subscriptions[event].splice(indexToRemove, 1);
    if (subscribeHandler && subscribeHandler.comms) subscribeHandler.comms.send('unsubscribed');
    comms.send('ok')
  };

  return [cmd, handler];
};
