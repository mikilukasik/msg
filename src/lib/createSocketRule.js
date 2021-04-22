module.exports = function createSocketRuleCreator(msgOptions){

  return function createSocketRule(argObj, rule = {}){
    rule.type = argObj.publicSocket ? 'publicSocket' : 'socket';
    rule.publicSocketRoute = argObj.publicSocket ? argObj.publicSocket.route : undefined;
    rule.command = argObj.command;
    msgOptions.mySocketRules[rule.command] = argObj;
    return rule;
  };
};