module.exports = function unsubscribeCreator(msgOptions){

  return function unsubscribe(){
    var argObj = msgOptions.getArgs(arguments);

    return new Promise(function(resolve, rej){
      if (!msgOptions.subscribedTo[argObj.cmd]) return rej('Tried to unsub from ' + argObj.cmd + ', but was not subscribed.');
      msgOptions.obj.do('msg:unsubscribe -e ' + argObj.cmd).then(
        function(r){
          delete msgOptions.subscribedTo[argObj.cmd];
          return resolve(r);
        },
        function(e){return rej(e);}
      );
    });

  };
};