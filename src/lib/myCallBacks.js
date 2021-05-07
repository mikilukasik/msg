module.exports = function myCallbacksCreator(msgOptions){
  return {
    socketOpen: function socketOpen(message){
      const connection = {
        onCloseFn: () => {},
        do: function(cmd, data, handler) {
          var argObj = { cmd, data, handler };

          var handlers = {
            dataHandler: function(){msgOptions.log('in pure datahandler!!!!!!!!!!!');},
            errorHandler: function(e){msgOptions.log(e, 'in pure errorhandler!!!!!!!!!!!');},
          };

          if(argObj.handler){
            var comms = {
              onData: function (onDataCb) {
                handlers.dataHandler = onDataCb;
              },
              // data: function (data) {
              //   msgOptions.toGtw('data', {
              //     conversationId: 
              //   });
              // },
            };
            argObj.handler(comms);
          }

          return new Promise(function(res, rej){
            handlers.errorHandler = function(e){ rej(e); };
            msgOptions.askGtw('wsDo', {
              argObj: argObj,
              key: message.key,
              route: message.route,
              clientSocketKey: message.clientSocketKey,
            }).then(function(askRes){
              msgOptions.waitingCbsByConvId[askRes.conversationId] = function(answer){ res(answer); };
              msgOptions.waitingHandlersByConvId[askRes.conversationId] = handlers;
            }, function(error){ rej(error); });
          });
        },
        
        on: (args) => 'TODO!!!!!',
        key: message.key,
        route: message.route,
        clientSocketKey: message.clientSocketKey,
        cookie: message.headers.cookie,
        headers: message.headers,
        cookies: {
          get: cName => ((message.headers.cookie || '').split(';').find(cstr => cstr.split('=')[0].trim() === cName) || '').split('=').slice(1).join('='),
          set(){return 'TODO!! not implemented, should ask client to save cookie and add new cookie here and on gtw';},
        },
        onClose: (fn) => {
          connection.onCloseFn = fn;
        },
      };
      msgOptions.wsRoutes[message.route].connections.push(connection);
      msgOptions.wsRoutes[message.route].connectionsByKey[message.clientSocketKey] = connection;
      (msgOptions.wsRoutes[message.route].evtHandlers.open || []).forEach(handler => handler(connection));
    },
    socketClose: function socketClose(message){
      var i = msgOptions.wsRoutes[message.route].connections.length;
      while (i--) {
        if (msgOptions.wsRoutes[message.route].connections[i].clientSocketKey === message.clientSocketKey) msgOptions.wsRoutes[message.route].connections.splice(i, 1);
      }
      const tempConnection = msgOptions.wsRoutes[message.route].connectionsByKey[message.clientSocketKey];
      delete msgOptions.wsRoutes[message.route].connectionsByKey[message.clientSocketKey];
      if (!tempConnection) return;
      (msgOptions.wsRoutes[message.route].evtHandlers.close || []).forEach(handler => handler(tempConnection));
      tempConnection.onCloseFn();
    },
    doStarted: function doStarted(message){
      msgOptions.waitingCbsByConvId[message.tempConversationId](message);
      delete msgOptions.waitingCbsByConvId[message.tempConversationId];
      delete msgOptions.waitingHandlersByConvId[message.tempConversationId];
      delete msgOptions.waitingErrHandlersByConvId[message.tempConversationId];
    },
    answer: function answer(message){
      (msgOptions.waitingCbsByConvId[message.conversationId] || function(){})(message.data);
      delete msgOptions.waitingCbsByConvId[message.conversationId];
      delete msgOptions.waitingHandlersByConvId[message.conversationId];
      delete msgOptions.waitingErrHandlersByConvId[message.conversationId];
    },
    data: function data(message){
      if (msgOptions.waitingHandlersByConvId[message.conversationId])
        msgOptions.waitingHandlersByConvId[message.conversationId].dataHandler(message.data);
    },
    error: function error(message){
      if (msgOptions.waitingHandlersByConvId[message.conversationId])
        msgOptions.waitingHandlersByConvId[message.conversationId].errorHandler(message.data);
      delete msgOptions.waitingCbsByConvId[message.conversationId];
      delete msgOptions.waitingHandlersByConvId[message.conversationId];
      delete msgOptions.waitingErrHandlersByConvId[message.conversationId];
    },
    do: function(message){
      var thisRule = message.route
        ? msgOptions.myPublicSocketRules[message.route][message.argObj.cmd]
        : msgOptions.mySocketRules[message.argObj.cmd];
      if (!thisRule) {
        const split = message.argObj.cmd.split('\\');
        message.argObj.$$MSG_NEW = split[1];
        message.argObj.cmd = split[0] + '_$$MSG_NEW';
        thisRule = msgOptions.mySocketRules[message.argObj.cmd];
      }

      var thisHandler = thisRule.handler;
      var newArgObj = message.argObj;

      if (Array.isArray(thisHandler)) {
        console.log('array as handler');
        throw new Error('implment array as handler');
        // return;
      }

      thisHandler(newArgObj.data, {
        key: message.clientSocketKey,
        send: function(data){
          msgOptions.toGtw('answer', data, message.conversationId);
        },
        data: (data) => {
          msgOptions.toGtw('data', {data}, message.conversationId);
        },
        onData: (onDataCb) => {
          msgOptions.waitingHandlersByConvId[message.conversationId].dataHandler = onDataCb;
        },
        error: function(err){
          msgOptions.toGtw('error', err, message.conversationId);
        },
        connection: message.clientSocketRoute ? msgOptions.wsRoutes[message.clientSocketRoute].connectionsByKey[message.clientSocketKey] : {nonClient: true},
      });
    }
  };

};