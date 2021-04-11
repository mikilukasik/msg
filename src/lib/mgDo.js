module.exports = function doCreator(msgOptions){

  return function (cmd1){ // function do(){}
    var argObj = msgOptions.getArgs(arguments);

    var handlers = {
      dataHandler: function(){msgOptions.log('in pure datahandler!!!!!!!!!!!');},
      errorHandler: function(e){msgOptions.log(e, 'in pure errorhandler!!!!!!!!!!!');},
    };

    if(argObj.cb){

      var comms = {
        onData: function (onDataCb) {
          handlers.dataHandler = onDataCb;
        }
      };
      argObj.cb(comms);
    }

    return new Promise(function(res, rej){
      

      msgOptions.askGtw('do', {argObj: argObj})
          .then(function(askRes){

            handlers.errorHandler = function(e){
              delete msgOptions.waitingCbsByConvId[askRes.conversationId];
              delete msgOptions.waitingHandlersByConvId[askRes.conversationId];
              return rej(e);
            };

            msgOptions.waitingCbsByConvId[askRes.conversationId] = function(answer){
              delete msgOptions.waitingCbsByConvId[askRes.conversationId];
              delete msgOptions.waitingHandlersByConvId[askRes.conversationId];
              return res(answer);
            };

            msgOptions.waitingHandlersByConvId[askRes.conversationId] = handlers;
          }, (e) => {throw e;});

    });
  };

};