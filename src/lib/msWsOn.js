module.exports = function wsOnCreator(msgOptions, route){

  return function on(cmd1){
    var argObj = msgOptions.getArgs(arguments);
    return new Promise(function(res, rej){
      argObj.publicSocket = {
        route: route
      };
      var rule = msgOptions.createRule(argObj);
      msgOptions.registerRule(rule, argObj).then(function(result){
        var message = 'msg.ws().on service registered new rule';
        res({
          status: 'OK',
          message: message,
          result: result,
          rule: rule
        });
      }, function(err){
        var message = 'msg.ws().on service could not register rule';
        if (!err.messages) err.messages = [];
        err.messages.push(message);
        msgOptions.log(message, err, argObj, rule);
        rej(err);
      });
    });
  };
};