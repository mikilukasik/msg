module.exports = function onCreator(msgOptions){

  function on(cmd1){
    var argObj = msgOptions.getArgs(arguments);
    return new Promise(function(res, rej){
      var rule = msgOptions.createSocketRule(argObj);

      // msgOptions.mgDoHandlers[argObj.command] = argObj      


      msgOptions.log('TODO: in mgon, rule');


    });
  };

  ['get', 'post', 'put', 'delete', 'use'].forEach(method => {
    on[method] = function (cmd1){
      var argObj = msgOptions.getArgs(arguments);
      return new Promise(function(res, rej){
        var rule = msgOptions.createHttpRule(argObj, method);
  
        // msgOptions.mgDoHandlers[argObj.command] = argObj      
  
  
        msgOptions.log('TODO: in mgon, rule');
  
  
      });
    };
  });

  return on;


};