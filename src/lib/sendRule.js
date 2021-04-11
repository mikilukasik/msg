module.exports = function sendRuleCreator(msgOptions){

  return function sendRule(rule) {
    rule.owner = msgOptions.serviceLongName,

    rule.serviceLongName = msgOptions.serviceLongName,
    rule.serviceName = msgOptions.serviceName,

    rule.outHost = msgOptions.ip.private;
    rule.outPort = msgOptions.PORT;

    var data = {
      owner: msgOptions.serviceName,
      rules: [rule]
    };

    return msgOptions.toGtw('setRules', data).then(function(result){
      var message = 'Rule sent to MSG';
      return message;
    }, function(err){
      msgOptions.log('ERROR: failed sending rule to msg', err.message + '\n' + err.stack, rule);
      return 'ERROR in toGtw';
    });
  };

};