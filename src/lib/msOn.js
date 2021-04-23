module.exports = function onCreator(msgOptions){

  function on(cmd, handler){
    var argObj = { cmd, handler };
    return new Promise(function(res, rej){
      var rule = msgOptions.createSocketRule(argObj);
      msgOptions.registerRule(rule, argObj).then(function(result){
        var message = 'register new rule result: ' + result;
        res({
          status: 'OK',
          message: message,
          result: result,
          rule: rule
        });
      }, function(err){
        var message = 'msg.on service could not register rule';
        if (!err.messages) err.messages = [];
        err.messages.push(message);
        msgOptions.log(message, err, argObj, rule);
        rej(err);
      });
    });
  };

  ['get', 'post', 'put', 'delete', 'use'].forEach(method => {
    on[method] = function (cmd, handler){
      var argObj = { cmd, handler };
      return new Promise(function(res, rej){
        var rule = msgOptions.createHttpRule(argObj, method);
        msgOptions.registerRule(rule, argObj).then(function(result){
          var message = 'register new rule result: ' + result;
          res({
            status: 'OK',
            message: message,
            result: result,
            rule: rule
          });
        }, function(err){
          var message = 'msg.on service could not register rule';
          if (!err.messages) err.messages = [];
          err.messages.push(message);
          msgOptions.log(message, err, argObj, rule);
          rej(err);
        });
      });
    };
  })

  return on;



};