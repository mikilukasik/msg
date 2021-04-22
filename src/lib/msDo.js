module.exports = function doCreator(msgOptions){

  return function (command, data, handler){ // function do(){}
    var argObj = { command, data, handler };

    var handlers = {
      dataHandler: function(){msgOptions.log('in pure datahandler!!!!!!!!!!!');},
      errorHandler: function(e){msgOptions.log(e, 'in pure errorhandler!!!!!!!!!!!');},
    };

    if(argObj.handler){

      var comms = {
        onData: function (onDataCb) {
          handlers.dataHandler = onDataCb;
        },
        data: function (dataToSend) {
          throw new Error('TODO: to be implemented: msg.do comms.data in msgservice')
        }
      };

      argObj.handler(comms);

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

        }, function(error){ rej(error); });

    });
  };

};