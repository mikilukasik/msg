const getRandomId = require('./getRandomId.js');

module.exports = function connectCreator(msgOptions){
  return function connect(opts){
    return new Promise(function(connResolve, rej) {
      msgOptions.log('msg service is connecting...');
      msgOptions.ws.on('connectFailed', function(err) {
        msgOptions.log('Connect Error: connectFailed', err);
        msgOptions.timeoutIds.connectFailedRetry = setTimeout(function() {
          start('socket');
        }, 2000);
      });
      msgOptions.ws.on('connect', function(connection2) {
        msgOptions.connection = connection2;
        msgOptions.connection.on('error', function(error) {
          msgOptions.log('WS connection errir, will retry in 2s.. ERROR: ', error);
          msgOptions.timeoutIds.connetionOnErrorRetry = setTimeout(function() {
            start('socket');
          }, 2000);
        });
        msgOptions.connection.on('close', function() {
          msgOptions.log('WS connection closed, retry in 2s...');

          // TODO: this is some hack, i think we shouldn't have multiple concurrent timeouts here
          const timeoutIdSuffix = getRandomId(); 
          if (!msgOptions.stopped) msgOptions.timeoutIds[`connetionOnCloseRetry-${timeoutIdSuffix}`] = setTimeout(function() {
            delete msgOptions.timeoutIds[`connetionOnCloseRetry-${timeoutIdSuffix}`];
            start('socket');
          }, 2000);
        });
        msgOptions.connection.on('message', function(msg2) {
          var message;
          try {
            message = JSON.parse(msg2.utf8Data);
          } catch (e) {
            message = msg2.utf8Data;
            return;
          }
          var callBack = msgOptions.myCallBacks[message.cmd];
          if (!callBack) {
            msgOptions.log('No callback found, message:', message, msgOptions.myCallBacks);
            return;
          }
          callBack(message);
        });
        
        msgOptions.log(`WebSocket Client Connected to ${msgOptions.ws.url.host}`);
        msgOptions.connected = true;

        // send wsRoutes (like '/authSocket') to gtw
        Object.keys(msgOptions.wsRoutes).forEach(function(route){ msgOptions.toGtw('wsRoute', route); });
        
        // send all my subscriptions to gtw
        Object.keys(msgOptions.subscribedTo).forEach(function(sub){
          msgOptions.obj.do('msg:subscribe', { event: sub.cmd }, function(comms){
            comms.onData(function(data){ sub.handler(data); });
          });
        });

        // send all my rules to gtw
        Promise.all( Object.keys(msgOptions.myRules).map(function(key){return msgOptions.sendRule(msgOptions.myRules[key].rule);}) ).then(function(){
          // msgOptions.log('rules sent to MSG on connection: ' + Object.keys(msgOptions.myRules).length);
        });
      });

      function start(onlyStartSocket, secondTry) {
        if (msgOptions.stopped) return;
        try{
          if (!onlyStartSocket) {
            msgOptions.log('Starting ' + msgOptions.serviceName + ' on ' + msgOptions.ip.public + ':' + msgOptions.PORT);
            msgOptions.expressServer = msgOptions.app.listen(msgOptions.PORT);
            
            msgOptions.log('Express is listening on ' + msgOptions.PORT);
          }
          const gatewayAddress = 'ws://' + (msgOptions.gatewayAddress || process.env.MSG_ADDRESS || (process.env.MSG_PORT && process.env.MSG_PORT.replace('tcp://', '')) || msgOptions.ip.public) + '/sockets';
          msgOptions.log(`Connecting websocket to MSG on ${gatewayAddress}`);
          msgOptions.ws.connect(gatewayAddress);
        } catch (e) {
          if (secondTry) return rej(e);
          log(e, 'Error starting express, will try again in 2s');
          msgOptions.timeoutIds.expressStartErrorRetry = setTimeout(() => {
            start(onlyStartSocket, true);
          }, 2000);
        }
      };
      msgOptions.getIps('private, public, gateway', {maxTries: 5, optional: 'gateway', ip: msgOptions.ip}).then(
        function(ips){ msgOptions.log('ips: ', ips); msgOptions.gotIp = true; return start(); },
        function(err){ msgOptions.log(err); throw err; }
      ).then(() => {}, msgOptions.log);
      msgOptions.callWhenConnected(connResolve);
    });
  };

};