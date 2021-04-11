module.exports = function onCreator(msgOptions){

  return function on(cmd1){
    var argObj = msgOptions.getArgs(arguments);
    return new Promise(function(res, rej){
      var rule = msgOptions.createRule(argObj);

      // msgOptions.mgDoHandlers[argObj.cmd] = argObj      


      msgOptions.log('TODO: in mgon, rule');


    });
  };


};