module.exports = function wsOnEvtCreator(msgOptions, route){
  return function onEvt(eventStr, cb){
    msgOptions.wsRoutes[route].evtHandlers[eventStr] = (msgOptions.wsRoutes[route].evtHandlers[eventStr] || []).concat(cb);
  };
};
