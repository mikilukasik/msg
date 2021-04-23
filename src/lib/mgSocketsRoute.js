const getRandomId = require('./getRandomId.js');

var toStr = require('./toStr');

const handleDo = ({ msgOptions, message, ws, key }) => {
  const newConversationId = 'made-on-' + msgOptions.serviceLongName + '-cid-' + getRandomId();
  msgOptions.conversations[newConversationId] = {
    startedBy: message.owner,
    argObj: message.argObj,
    conversationId: newConversationId,
    ws,
    type: 'do',
  };
  if (ws) ws.send(JSON.stringify({
    cmd: 'doStarted',
    conversationId: newConversationId,
    tempConversationId: message.tempConversationId
  }));

  if (msgOptions.mySocketRules[message.argObj.cmd]) {
    // log('gateway received do cmd ' + message.argObj.cmd + ' from ' + message.owner);

    var thisHandler = msgOptions.mySocketRules[message.argObj.cmd].handler;
    var newArgObj = message.argObj;

    thisHandler(newArgObj.data, {
      key: key,
      serviceName: message.serviceName,
      serviceLongName: message.serviceLongName,
      owner: message.owner,
      ws: ws,

      data: function(data) {
        if (ws) ws.send(toStr({
          cmd: 'data',
          conversationId: newConversationId,
          data: data,
          owner: msgOptions.serviceLongName,
          serviceName: msgOptions.serviceName,
          serviceLongName: msgOptions.serviceLongName,
        }));
      },

      send: function(data) {
        if (ws) ws.send(JSON.stringify({
          cmd: 'answer',
          conversationId: newConversationId,
          data: data,
          owner: msgOptions.serviceLongName,
          serviceName: msgOptions.serviceName,
          serviceLongName: msgOptions.serviceLongName,
        }));
      },

      error: function(data) {
        if (ws) ws.send(msgOptions.stringify({
          cmd: 'error',
          conversationId: newConversationId,
          data: data,
          owner: msgOptions.serviceLongName,
          serviceName: msgOptions.serviceName,
          serviceLongName: msgOptions.serviceLongName,
        }));
      },
    });

    return;
  }

  try {
    (msgOptions.getSocketRule(message.argObj.cmd) ||
      {
        ws: {
          send: (jsStr) => {
            const message2 = 'ERROR: Unknown cmd from ' + message.owner + ': ' + (jsStr);
            msgOptions.log(message2);
            throw new Error(message2);
          }
        }
      }).ws.send(JSON.stringify({
        cmd: 'do',
        argObj: message.argObj,
        conversationId: newConversationId
      }));
  } catch (e) {
    console.log(e)
    if (ws) ws.send(toStr({
      cmd: 'error',
      conversationId: newConversationId,
      error: e,
      message: e.message,
      stack: e.stack,
      request: message
    }));
  }
}

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

      switch (message.cmd) {
      case 'setRules':
        // log('rules received over WS from ' + message.owner);
        message.data.rules.forEach(rule => {
          try {
            if (rule.rule) {
              rule = rule.rule;
              log('resolving ERROR rule in rule: ', message, message.cmd, message.rule);
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
        handleDo({ msgOptions, message, ws, key });
        break;

      case 'wsDo':
        var newWsConversationId = 'made-on-' + msgOptions.serviceLongName + '-cid-' + getRandomId();

        var clientConnection = msgOptions.publicSocketRoutes[message.route].connectedKeys[message.clientSocketKey]
        
        if (!clientConnection) {
          ws.send(JSON.stringify({
            cmd: 'error',
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
            cmd: 'error',
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
          cmd: 'do',
          argObj: message.argObj,
          conversationId: newWsConversationId
        }));

        ws.send(JSON.stringify({
          cmd: 'doStarted',
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
        if (!conv) {
          // TODO: shouldn't we throw an error here?
          break;
        }
        
        if (!conv.ws) {
          // this happens when we started the do on this gateway
          conv.ownHandlers.resolve(message.data);
          delete msgOptions.conversations[message.conversationId];
          break;
        }

        if (conv.ws.readyState > 1) {
          // TODO: shouldn't we throw an error here?
          break;
        }

        conv.ws.send(JSON.stringify({
          cmd: 'answer',
          data: message.data,
          conversationId: message.conversationId
        }));
        delete msgOptions.conversations[message.conversationId];
        break;
      }

      case 'data': {
        var convd = msgOptions.conversations[message.conversationId];
        if (!convd) {
          // TODO: throw error here maybe?
          delete msgOptions.conversations[message.conversationId];
          break;
        }

        if (!convd.ws) {
          // this happens when we started the do on this gateway
          convd.ownHandlers.dataHandler(message.data);
          break;
        }

        if (convd.ws.readyState > 1) {
          // TODO: throw error here maybe?
          delete msgOptions.conversations[message.conversationId];
          break;
        }


        convd.ws.send(JSON.stringify({
          cmd: 'data',
          data: message.data,
          conversationId: message.conversationId
        }));
        break;
      }
        
      case 'error':
        var convE = msgOptions.conversations[message.conversationId];
        if (!convE) {
          // TODO: throw error here maybe?
          delete msgOptions.conversations[message.conversationId];
          break;
        }

        if (!convE.ws) {
          // this happens when we started the do on this gateway
          convE.ownHandlers.reject(message.data);
          delete msgOptions.conversations[message.conversationId];
          break;
        }

        if (convE.ws.readyState > 1) {
          // TODO: throw error here maybe?
          delete msgOptions.conversations[message.conversationId];
          break;
        }

        convE.ws.send(JSON.stringify({
          cmd: 'error',
          data: message.data,
          conversationId: message.conversationId
        }));
        delete msgOptions.conversations[message.conversationId];
        break;

      default:
        log('Unknown cmd', message);
        break;
      }
    });
    // log('Incoming client socket, middleware: ', req.mwMsg);
  };
};