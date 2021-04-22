module.exports = function cacheRuleCreator(msgOptions){

  return function cacheRule(rule, argObj){
    msgOptions.myRules[rule.command] = {
      rule: rule,
      creator: argObj
    };
  };
};