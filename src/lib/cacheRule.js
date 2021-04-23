module.exports = function cacheRuleCreator(msgOptions){

  return function cacheRule(rule, argObj){
    msgOptions.myRules[rule.cmd] = {
      rule: rule,
      creator: argObj
    };
  };
};