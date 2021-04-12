var toStr = require('./toStr');

module.exports = function mgSocketRouteCreator(msgOptions) {
  var log = (msgOptions || {}).log || console.log;

  return function socketRouteHandler(ws, req) {
    var key = req.headers['sec-websocket-key'];

    var thisSocket = {
      serviceLongName: ''
    };

    ws.on('close', function() {
      msgOptions.removeRules({
        ownerMatch: thisSocket.serviceLongName
      });
    });

    ws.on('message', function(msg2) {
      var message = JSON.parse(msg2);

      if (!thisSocket.serviceLongName && message.serviceLongName) thisSocket.serviceLongName = message.serviceLongName;

      switch (message.command) {
      case 'setRules':
        // log('rules received over WS from ' + message.owner);
        message.data.rules.forEach(rule => {
          try {
            if (rule.rule) {
              rule = rule.rule;
              log('resolving ERROR rule in rule: ', message, message.command, message.rule);
            }
            rule.ws = ws;
            rule.gateway = {
              address: msgOptions.getAddress(),
              serviceLongName: msgOptions.serviceLongName
            };
            msgOptions.setRule(rule);
          } catch (e) {
            log('ERROR: MSG GATEWAY COULD NOT SET RULE', e.message, e.stack);
          }
        });
        break;

      case 'wsRoute':
        log('wsRoute received over WS from ' + message.owner + ': ' + message.data);
        var route = message.data;
        msgOptions.useClientSocketRoute(route, ws);
        break;

      case 'do':
        var newConversationId = 'made-on-' + msgOptions.serviceLongName + '-cid-' + Math.random() * Math.random();

        msgOptions.conversations[newConversationId] = {
          startedBy: message.owner,
          argObj: message.argObj,
          conversationId: newConversationId,
          ws,
          type: 'do',
        };
        ws.send(JSON.stringify({
          command: 'doStarted',
          conversationId: newConversationId,
          tempConversationId: message.tempConversationId
        }));

        if (msgOptions.mySocketRules[message.argObj.cmd]) {
          // log('gateway received do cmd ' + message.argObj.cmd + ' from ' + message.owner);

          var thisHandler = msgOptions.mySocketRules[message.argObj.cmd].cb;
          var newArgObj = msgOptions.getArgs(message.argObj.args, msgOptions.mySocketRules[message.argObj.cmd].cmdArgs.keys);

          thisHandler(newArgObj, {
            key: key,
            serviceName: message.serviceName,
            serviceLongName: message.serviceLongName,
            owner: message.owner,
            ws: ws,

            data: function(data) {
              ws.send(toStr({
                command: 'data',
                conversationId: newConversationId,
                data: data,
                owner: msgOptions.serviceLongName,
                serviceName: msgOptions.serviceName,
                serviceLongName: msgOptions.serviceLongName,
              }));
            },

            send: function(data) {
              ws.send(JSON.stringify({
                command: 'answer',
                conversationId: newConversationId,
                data: data,
                owner: msgOptions.serviceLongName,
                serviceName: msgOptions.serviceName,
                serviceLongName: msgOptions.serviceLongName,
              }));
            },

            error: function(data) {

              ws.send(msgOptions.stringify({
                command: 'error',
                conversationId: newConversationId,
                data: data,
                owner: msgOptions.serviceLongName,
                serviceName: msgOptions.serviceName,
                serviceLongName: msgOptions.serviceLongName,
              }));
            },
          });

          break;

        }

        try {
          (msgOptions.getSocketRule(message.argObj.cmd) ||
            {
              ws: {
                send: (jsStr) => {
                  const message2 = 'ERROR: Unknown command from ' + message.owner + ': ' + (jsStr);
                  log(message2);
                  throw new Error(message2);
                }
              }
            }).ws.send(JSON.stringify({
              command: 'do',
              argObj: message.argObj,
              conversationId: newConversationId
            }));
        } catch (e) {
            // ws.send(JSON.stringify({ERROR: e}))
          ws.send(toStr({
            command: 'error',
            conversationId: newConversationId,
            error: e,
            message: e.message,
            stack: e.stack,
            request: message
          }));
        }

        break;

      case 'wsDo':
        var newWsConversationId = 'made-on-' + msgOptions.serviceLongName + '-cid-' + Math.random() * Math.random();

        var clientConnection = msgOptions.publicSocketRoutes[message.route].connectedKeys[message.clientSocketKey]
        
        if (!clientConnection) {
          ws.send(JSON.stringify({
            command: 'error',
            message: 'no connection with clienSocketKey ' + message.clientSocketKey,
            conversationId: message.tempConversationId,
            clientSocketKey: message.clientSocketKey,
            clientSocketRoute: message.route,
            route: message.route,
            key: message.clientSocketKey,
          }));
          break;
        }
        
        var clientWs = clientConnection.ws;

        msgOptions.conversations[newWsConversationId] = {
          startedBy: message.owner,
          argObj: message.argObj,
          conversationId: newWsConversationId,
          ws,
          type: 'wsDo',
          clientWs,
          clientSocketKey: message.clientSocketKey,
          clientSocketRoute: message.route,
          route: message.route,
          key: message.clientSocketKey,
        };

        if (!clientWs || clientWs.readyState > 1) {
          ws.send(JSON.stringify({
            command: 'error',
            message: 'clientWs does not exists or is not open. readyState: ' + (clientWs && clientWs.readyState),
            conversationId: message.tempConversationId,
            tempConversationId: message.tempConversationId,
            clientSocketKey: message.clientSocketKey,
            clientSocketRoute: message.route,
            route: message.route,
            key: message.clientSocketKey,
          }));
          break;
        }

        clientWs.send(JSON.stringify({
          command: 'do',
          argObj: message.argObj,
          conversationId: newWsConversationId
        }));

        ws.send(JSON.stringify({
          command: 'doStarted',
          conversationId: newWsConversationId,
          tempConversationId: message.tempConversationId,
          clientSocketKey: message.clientSocketKey,
          clientSocketRoute: message.route,
          route: message.route,
          key: message.clientSocketKey,
        }));

        break;

      case 'answer': {
        var conv = msgOptions.conversations[message.conversationId];
        if (!conv || conv.ws.readyState > 1) break;
        conv.ws.send(JSON.stringify({
          command: 'answer',
          data: message.data,
          conversationId: message.conversationId
        }));
        delete msgOptions.conversations[message.conversationId];
        break;
      }

      case 'data': {
        var convd = msgOptions.conversations[message.conversationId];
        if (!convd || convd.ws.readyState > 1) break;

        convd.ws.send(JSON.stringify({
          command: 'data',
          data: message.data,
          conversationId: message.conversationId
        }));
        break;
      }
        
      case 'error':
        var convE = msgOptions.conversations[message.conversationId];
        if (!convE || convE.ws.readyState > 1) {
          delete msgOptions.conversations[message.conversationId];
          break;
        }
        convE.ws.send(JSON.stringify({
          command: 'error',
          data: message.data,
          conversationId: message.conversationId
        }));
        delete msgOptions.conversations[message.conversationId];
        break;

      default:
        log('Unknown command', message);
        break;
      }
    });
    // log('Incoming client socket, middleware: ', req.mwMsg);
  };
};