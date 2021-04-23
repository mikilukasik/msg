module.exports = function onCreator(msgOptions){

  function on(cmd, handler){
    var argObj = { cmd, handler };
    return new Promise(function(res, rej){
      var rule = msgOptions.createSocketRule(argObj);

      // msgOptions.mgDoHandlers[argObj.cmd] = argObj      


      msgOptions.log('TODO: in mgon, rule');


    });
  };

  ['get', 'post', 'put', 'delete', 'use'].forEach(method => {
    on[method] = function (cmd, handler){
      var argObj = { cmd, handler };
      return new Promise(function(res, rej){
        var rule = msgOptions.createHttpRule(argObj, method);
  
        // msgOptions.mgDoHandlers[argObj.cmd] = argObj      
  
  
        msgOptions.log('TODO: in mgon, rule');
  
  
      });
    };
  });

  return on;


};