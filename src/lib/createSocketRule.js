module.exports = function createSocketRuleCreator(msgOptions){

  return function createSocketRule(argObj, rule = {}){
    rule.type = argObj.publicSocket ? 'publicSocket' : 'socket';
    rule.publicSocketRoute = argObj.publicSocket ? argObj.publicSocket.route : undefined;
    rule.cmd = argObj.cmd;
    if (rule.publicSocketRoute) {
      if (!msgOptions.myPublicSocketRules[rule.publicSocketRoute]) msgOptions.myPublicSocketRules[rule.publicSocketRoute] = {};
      msgOptions.myPublicSocketRules[rule.publicSocketRoute][rule.cmd] = argObj;
    }
    msgOptions.mySocketRules[rule.cmd] = argObj;
    return rule;
  };
};