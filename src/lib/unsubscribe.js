module.exports = function unsubscribeCreator(msgOptions){

  return function unsubscribe(){
    var argObj = msgOptions.getArgs(arguments);

    return new Promise(function(resolve, rej){
      if (!msgOptions.subscribedTo[argObj.command]) return rej('Tried to unsub from ' + argObj.command + ', but was not subscribed.');
      msgOptions.obj.do('msg:unsubscribe', { event: argObj.command }).then(
        function(r){
          delete msgOptions.subscribedTo[argObj.command];
          return resolve(r);
        },
        function(e){return rej(e);}
      );
    });

  };
};