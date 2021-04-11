module.exports = function registerRuleCreator(msgOptions){

  return function registerRule(rule, argObj){
    msgOptions.cacheRule(rule, argObj);
    if (msgOptions.connected && msgOptions.gotIp) return msgOptions.sendRule(rule);
    return Promise.resolve('Not connected or no ip, rule cached only.');
  };

};