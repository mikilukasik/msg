const getRandomId = require('./getRandomId.js');

var toStr = require('./toStr');

module.exports = function mgSlaceSocketRouteCreator(msgOptions){
  var log = (msgOptions || {}).log || console.log;

  return function slaveSocketRouteHandler(ws, req) {
    var key = req.headers['sec-websocket-key'];

    var thisRoute = {

    };

    ws.on('close', function(){
      msgOptions.removeRules({
        ownerMatch: thisRoute.msgLongName
      });
    });

    ws.on('message', function(msg2) {
      var message = JSON.parse(msg2);
      log('slave message received: ', msg2);
      switch (message.command) {
      case 'setRules':
        log('slave rules received over WS from ' + message.owner);
        message.data.rules.forEach(rule => {
          try{
            rule.ws = ws;
            if(rule.owner.indexOf( msgOptions.serviceLongName ) < 0) msgOptions.setRule(rule);
          } catch (e) {
            log('ERROR: MSG GATEWAY COULD NOT SET SLAVE RULE', e.message, e.stack);
          }
        });
        break;

      case 'wsRoute':
        log('slve wsRoute received over WS from ' + message.owner);
        msgOptions.useClientSocketRoute(message.data, ws, 'grid');
        break;


      case 'gatewayDetails':
        log('gatewayDetails received from ' + message.owner + ': ', message.data);
          
        var senderAddress = message.data.address;
        var receivedGateways = message.data.gateways;
        thisRoute.msgLongName = message.data.msgLongName;
        thisRoute.address = message.data.address;



        receivedGateways.forEach(function(g){ msgOptions.slaveFunctions.connect(g.address); });

        msgOptions.gateways[senderAddress].serviceLongName = message.data.serviceLongName;

        break;

      case 'do':
        var newConversationId = 'made-on-' + msgOptions.serviceLongName + '-' + getRandomId();
          
        msgOptions.conversations[newConversationId] = {
          startedBy: message.owner,
          argObj: message.data.argObj,
          conversationId: newConversationId,
          ws,
          clientSocketKey: message.clientSocketKey,
          clientSocketRoute: message.clientSocketRoute,
          route: message.route,
          key,
        };
          // msgOptions.log('buuuuuuuuuuuuu', message)
        ws.send(JSON.stringify({
          command: 'doStarted',
          conversationId: newConversationId,
          tempConversationId: message.data.tempConversationId,
          clientSocketKey: message.clientSocketKey,
          clientSocketRoute: message.clientSocketRoute,
          route: message.route,
          key,
        }));

        if (msgOptions.mySocketRules[message.data.argObj.cmd]) {

          var thisHandler = msgOptions.mySocketRules[message.data.argObj.cmd].cb;
          var newArgObj = msgOptions.getArgs(message.data.argObj.args, msgOptions.mySocketRules[message.data.argObj.cmd].cmdArgs.keys);

          thisHandler(newArgObj, {

            key: key,
            serviceName: message.serviceName,
            serviceLongName: message.serviceLongName,
            owner: message.owner,
            ws: ws,

            clientSocketKey: message.clientSocketKey,
            clientSocketRoute: message.clientSocketRoute,
            route: message.route,

            data: function(data){
              try {
                ws.send(toStr({
                  command: 'data',
                  conversationId: newConversationId,
                  data: data,
                  owner: msgOptions.serviceLongName,
                  serviceName: msgOptions.serviceName,
                  serviceLongName: msgOptions.serviceLongName,
                }));
              } catch (e) { msgOptions.log(e.message + '\n' + e.stack); }
            },

            send: function(data){
              ws.send(JSON.stringify({
                command: 'answer',
                conversationId: newConversationId,
                data: data,
                owner: msgOptions.serviceLongName,

                serviceName: msgOptions.serviceName,
                serviceLongName: msgOptions.serviceLongName,
              }));
            }
          });

          break;
        } 

        try{
          (msgOptions.getSocketRule(message.argObj.cmd) || {ws:{send: (jsStr) => {
            log('ERROR: Unknown slave command from ' + message.owner + ': ', JSON.parse(jsStr));
          }}}).ws.send(JSON.stringify({
            command: 'do',
            argObj: message.argObj,
            conversationId: newConversationId,
            clientSocketKey: message.clientSocketKey,
            clientSocketRoute: message.route,
            route: message.route,
            key: message.clientSocketKey,
          }));
        } catch (e) {
          ws.send(JSON.stringify({ERROR: e}));
        }
        break;
        
      case 'answer':
        var conv = msgOptions.conversations[message.conversationId];
        conv.ws.send(JSON.stringify({
          command: 'answer',
          data: message.data,
          conversationId: message.conversationId
        }));
        delete msgOptions.conversations[message.conversationId];
        break;

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
        log('Unknown slave command', message );
        break;
      }
    });
    log('Incoming slave socket, middleware: ', req.mwMsg);
    
  };
};