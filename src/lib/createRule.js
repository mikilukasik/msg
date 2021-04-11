module.exports = function createRuleCreator(msgOptions){

  return function createRule(argObj){
    var rule = {};
    if( msgOptions.createHttpRule(argObj, rule) ) return rule;
    if( msgOptions.createSocketRule(argObj, rule) ) return rule;
    throw new Error('Could not create rule from argObj :' + JSON.stringify(argObj));
  };
};