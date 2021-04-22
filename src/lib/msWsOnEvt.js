module.exports = function wsOnEvtCreator(msgOptions, route){
  return function onEvt(eventStr, handler){
    msgOptions.wsRoutes[route].evtHandlers[eventStr] = (msgOptions.wsRoutes[route].evtHandlers[eventStr] || []).concat(handler);
  };
};
