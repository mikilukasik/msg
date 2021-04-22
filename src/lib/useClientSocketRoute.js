const getRandomId = require('./getRandomId.js');

var toStr = require('./toStr');

module.exports = function slaveFunctionsCreator(msgOptions){
  var log = msgOptions.log || console.log;

  function useClientSocketRoute(route, usingWs){

    if (!msgOptions.publicSocketRoutes[route]){

      var cRules = [];
      var cConversations = {};
      var cConnectedKeys = {};
      var usingWss = [];

      var getRule = function(command){
        const index = cRules.findIndex(function(rule){ return rule.command === command || rule.command === command; });
        const rule = cRules[index];
        if (rule && rule.ws.readyState > 1) {
          cRules.splice(index, 1);
          return getRule(command);
        }
        return rule;
      };

      msgOptions.app.ws(route, function(ws, req) {

        var key = req.headers['sec-websocket-key'];
        cConnectedKeys[key] = {ws, req};
        // send around clientConnection event
        let uwsIdx = msgOptions.publicSocketRoutes[route].usingWss.length;
        while (uwsIdx--) {
          const uws = msgOptions.publicSocketRoutes[route].usingWss[uwsIdx];
          try{
            uws.send(JSON.stringify({
              command: 'socketOpen',
              route,
              key,
              clientSocketRoute: route,
              clientSocketKey: key,
              cookie: req.headers.cookie
            }));
          } catch (e) {
            if (e.message === 'not opened') {
              msgOptions.publicSocketRoutes[route].usingWss.splice(uwsIdx, 1);
              log('removed', {route, uwsIdx, remaining: msgOptions.publicSocketRoutes[route].usingWss.length})
            } else {
              log({m: e.message}, e);
            }
          }
        }       

        ws.on('close', function(vmi){
          delete cConnectedKeys[key];
          log('client socket disconnected, route: ' + route + ' key: ' + key);
  
          let uwsIdx = msgOptions.publicSocketRoutes[route].usingWss.length;
          while (uwsIdx--) {
            const uws = msgOptions.publicSocketRoutes[route].usingWss[uwsIdx];
            try{
              uws.send(JSON.stringify({
                command: 'socketClose',
                route,
                clientSocketRoute: route,
                key,
                clientSocketKey: key
              }));
            } catch (e) {
              if (e.message === 'not opened') {
                msgOptions.publicSocketRoutes[route].usingWss.splice(uwsIdx, 1);
                log('removed', {route, uwsIdx, remaining: msgOptions.publicSocketRoutes[route].usingWss.length})
              } else {
                log({m: e.message}, e);
              }
            }
          };

          // ws.send(toStr(msgOptions.publicSocketRoutes[route].rules))

        });

        ws.on('message', function(msg2) {

          var msg = JSON.parse(msg2);
          var command = msg.command;

          switch (command) {

          case 'do':
            var newConversationId = 'made-on-' + msgOptions.serviceLongName + '-cid-' + getRandomId();
              
            msgOptions.conversations[newConversationId] = {
              startedBy: msg.owner,
              argObj: msg.argObj,
              conversationId: newConversationId,
              ws,
              clientSocketKey: key,
              clientSocketRoute: route,
              route: route,
            };

            ws.send(JSON.stringify({
              command: 'doStarted',
              conversationId: newConversationId,
              tempConversationId: msg.tempConversationId,
              clientSocketRoute: route,
              clientSocketKey: key,
              route: route,
            }));

            try{
              (getRule(msg.argObj.command) || (getRule(msg.argObj.command.split('\\')[0] + '_$$MSG_NEW')) || {ws:{send: (jsStr) => {
                const message2 = 'ERROR: Unknown command from ' + msg.owner + ': ' + (jsStr);
                log(message2);
                throw new Error(message2);
              }}}).ws.send(JSON.stringify({
                command: 'do',
                argObj: msg.argObj,
                conversationId: newConversationId,
                clientSocketKey: key,
                clientSocketRoute: route,
                route: route,
              }));
            } catch (e) {
              ws.send(toStr({
                command: 'error',
                conversationId: newConversationId,
                error: e,
                message: e.message,
                stack: e.stack,
                request: msg,
                clientSocketKey: key,
                clientSocketRoute: route,
                route: route,
              }));
            }

            break;
            
          case 'answer':
            var conv = msgOptions.conversations[msg.conversationId];
            if (!conv || !conv.ws || conv.ws.readyState > 1) {
              delete msgOptions.conversations[msg.conversationId];
              break;
            }
            conv.ws.send(JSON.stringify({
              command: 'answer',
              data: msg.data,
              conversationId: msg.conversationId,
              clientSocketRoute: route,
              clientSocketKey: key
            }));
            delete msgOptions.conversations[msg.conversationId];

            break;

          case 'error':
            var convE = msgOptions.conversations[msg.conversationId];
            if (!convE || convE.ws.readyState > 1) {
              delete msgOptions.conversations[msg.conversationId];
              break;
            }
            convE.ws.send(JSON.stringify({
              command: 'error',
              data: msg.data,
              conversationId: msg.conversationId
            }));
            delete msgOptions.conversations[msg.conversationId];
            break;


          default:
            log('Unknown command on route ' + route + ': ', msg );
            break;
          }

        });
        // log('Incoming publicSocket on ' + route + ', middleware: ', req.mwMsg);
      });

      msgOptions.publicSocketRoutes[route] = {
        route: route,
        rules: cRules,
        getRule: getRule,
        conversations: cConversations,
        connectedKeys: cConnectedKeys,
        usingWss
      };
      msgOptions.slaveFunctions.publishCsRoute(route);

    }
    msgOptions.publicSocketRoutes[route].usingWss.push(usingWs);

    // let the service know about already open connections
    Object.keys(msgOptions.publicSocketRoutes[route].connectedKeys).forEach(key => {
      try{
        usingWs.send(JSON.stringify({
          command: 'socketOpen',
          route,
          key,
          clientSocketRoute: route,
          clientSocketKey: key,
          cookie: msgOptions.publicSocketRoutes[route].connectedKeys[key].req.headers.cookie
        }));
      } catch (e) {
        log({m: e.message}, e);
      }
    })
  }

  return useClientSocketRoute;

};