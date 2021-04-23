const getRandomId = require('./getRandomId.js');

module.exports = function doCreator(msgOptions){

  return function (cmd, data, handler){ // function do(){}
    var argObj = { cmd, data, handler };

    var handlers = {
      dataHandler: function(){msgOptions.log('in pure datahandler!!!!!!!!!!!');},
      errorHandler: function(e){msgOptions.log(e, 'in pure errorhandler!!!!!!!!!!!');},
    };

    if(argObj.handler){

      var comms = {
        // TODO: very poor comms object here
        onData: function (onDataCb) {
          handlers.dataHandler = onDataCb;
        }
      };
      argObj.handler(comms);
    }

    return new Promise(function(res, rej){
      // send the cmd to connected service(s?)
      const socketRule = msgOptions.getSocketRule(argObj.cmd);
      if (socketRule) {
        const newConversationId = 'made-on-' + msgOptions.serviceLongName + '-cid-' + getRandomId();
        msgOptions.conversations[newConversationId] = {
          startedBy: msgOptions.serviceLongName,
          argObj,
          conversationId: newConversationId,
          ws: null,
          type: 'do',
          ownHandlers: {
            resolve: res,
            reject: rej,
            dataHandler: handlers.dataHandler,
          }
        };

        socketRule.ws.send(JSON.stringify({
          cmd: 'do',
          argObj,
          conversationId: newConversationId
        }));
        return;
      }

      // send the cmd to all connected gateways
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