module.exports = function doCreator(msgOptions) {
  return function (cmd, data, handler) {
    let conversationId;
    const conversationIdAwaiters = [];

    const sendDataNow = () => {
      while (conversationIdAwaiters.length) {
        conversationIdAwaiters.shift()(conversationId);
      }
    };

    var argObj = { cmd, data, handler };

    var handlers = {
      dataHandler: function (args) {
        msgOptions.log('in pure datahandler!!!!!bbbrrr!!!!!!', args);
      },
      errorHandler: function (e) {
        msgOptions.log(e, 'in pure errorhandler!!!!!!!!!!!');
      },
    };

    if (argObj.handler) {
      var comms = {
        onData: function (onDataCb) {
          handlers.dataHandler = onDataCb;
        },
        data: function (data) {
          return new Promise((resolve4, reject4) => {
            if (conversationId) {
              return msgOptions.toGtw('dataAfterDo', { data }, conversationId).then(resolve4).catch(reject4);
            }

            conversationIdAwaiters.push((cId) => {
              msgOptions.toGtw('dataAfterDo', { data }, cId).then(resolve4).catch(reject4);
            });
          });
        },
      };

      argObj.handler(comms);
    }

    return new Promise(function (res, rej) {
      msgOptions.askGtw('do', { argObj: argObj }).then(
        function (askRes) {
          conversationId = askRes.conversationId;
          sendDataNow();

          handlers.errorHandler = function (e) {
            delete msgOptions.waitingCbsByConvId[askRes.conversationId];
            delete msgOptions.waitingHandlersByConvId[askRes.conversationId];
            return rej(e);
          };

          msgOptions.waitingCbsByConvId[askRes.conversationId] = function (answer) {
            delete msgOptions.waitingCbsByConvId[askRes.conversationId];
            delete msgOptions.waitingHandlersByConvId[askRes.conversationId];
            return res(answer);
          };

          if (msgOptions.waitingHandlersByConvId[askRes.conversationId])
            msgOptions.waitingHandlersByConvId[askRes.conversationId] = handlers;
        },
        function (error) {
          rej(error);
        },
      );
    });
  };
};
