module.exports = function unsubscribeCreator(msgOptions){

  return function unsubscribe(cmd, handler){
    var argObj = { cmd, handler };

    return new Promise(function(resolve, rej){
      if (!msgOptions.subscribedTo[argObj.cmd]) return rej('Tried to unsub from ' + argObj.cmd + ', but was not subscribed.');
      msgOptions.obj.do('msg:unsubscribe', { event: argObj.cmd }).then(
        function(r){
          delete msgOptions.subscribedTo[argObj.cmd];
          return resolve(r);
        },
        function(e){return rej(e);}
      );
    });

  };
};