module.exports = function slaveFunctionsCreator(msgOptions){
  var log = msgOptions.log || console.log;

  var WebSocketClient = require('websocket').client;

  function connectToGateway(address){
    if (!address) return log('no msg address to connect to...');
    if (Object.keys(msgOptions.gateways).indexOf(address) >= 0) return log('gateway tried to connect on same route twice: ' + address);
    
    var thisGateway = {
      address: address
    };
    msgOptions.gateways[address] = thisGateway;

    if (address.replace(':80', '') === msgOptions.getAddress()){
      thisGateway.sendRule = function(){
        // log('in blank sendRule');
      };
      thisGateway.sendCsRoute = function(){
        log('in blank sendCsRoute');
      };
      return log('gateway tried to connect to itself...');
    }
    thisGateway.ws = new WebSocketClient();

    thisGateway.waitForConnection = function () {
      return new Promise((ress, rejj) => {
        function checkIt(){
          if (thisGateway.ws.socket && thisGateway.ws.socket.writable) return ress();
          msgOptions.timeoutIds.waitForConnectionRetry = setTimeout(function() {
            checkIt();
          }, 200);
        }
        checkIt();
      });
    };

    thisGateway.toGtw = function(command, data, conversationId){
      return new Promise(function(res3, rej3){
        try { 
          thisGateway.waitForConnection().then(function(){
            thisGateway.connection.send(JSON.stringify({
              command: command,
              data: data,
              owner: msgOptions.serviceLongName,
              conversationId: conversationId
            }));
            res3();
          }, rej3).catch(rej3);
        } catch (te) {
          rej3(te);
        }
      });
    };

    thisGateway.sendGatewayDetails = function(){
      var details = {
        msgLongName: msgOptions.serviceLongName,
        address: msgOptions.getAddress(),
        gateways: Object.keys( msgOptions.gateways ).map(function(k){
          return Object.assign({}, msgOptions.gateways[k], {ws: undefined, connection: undefined});
        })
      };
      log('sending this gateway\'s details to gateway on ' +  address + ': ', details);
      return thisGateway.toGtw('gatewayDetails', details).then(() => {}, log);
    };
    log('should be 1st', {EZZZZZ: thisGateway.sendGatewayDetails, MEGEEEZZZ: typeof thisGateway.sendGatewayDetails});
    
    thisGateway.sendRule = function(rule){
      log('sending rule to gateway on ' + address + ': ', rule);
      var data = {
        owner: rule.owner,
        rules: [rule]
      };
      return thisGateway.toGtw('setRules', data).then(() => {}, log);
    };

    thisGateway.sendCsRoute = function(route){
      log('sending wsRuote to gateway on address ' + address + ': ' + route);
      return thisGateway.toGtw('wsRoute', route);
    };

    thisGateway.ws.on('connectFailed', function(err) {
      log('Connect Error: connectFailed', address, err);
      delete msgOptions.gateways[address];
      
      if (thisGateway.reconnectTimeoutId) clearTimeout(thisGateway.reconnectTimeoutId);
      thisGateway.reconnectTimeoutId = setTimeout(function() {
        connectToGateway(address);
      }, 2000);
      msgOptions.timeoutIds.thisGatewayReconnectTimeoutId1 = thisGateway.reconnectTimeoutId;
    });

    thisGateway.ws.on('connect', function(connection) {
      thisGateway.connection = connection;
      thisGateway.isConnected = true;
      connection.on('error', function(error) {
        log('slave WS connection ERROR: ', address, error);
      });
      connection.on('close', function() {
        log('slave WS connection on ' + address + ' closed, retry in 2s...');
        thisGateway.isConnected = false;

        delete msgOptions.gateways[address];

        if (thisGateway.reconnectTimeoutId) clearTimeout(thisGateway.reconnectTimeoutId);
        thisGateway.reconnectTimeoutId = setTimeout(function() {
          connectToGateway(address);
        }, 2000);
        msgOptions.timeoutIds.thisGatewayReconnectTimeoutId2 = thisGateway.reconnectTimeoutId;
      });
      connection.on('message', function(msg2) {
        var message = JSON.parse(msg2.utf8Data);

        if (message.command === 'doStarted'){
          // msgOptions.log('blaaaaaa',message);
          msgOptions.waitingCbsByConvId[message.tempConversationId](message);
          delete msgOptions.waitingCbsByConvId[message.tempConversationId];
        }

        // msgOptions.log('################~~~~~~~~~~~~~~~~~~################', message)
        if (message.command === 'data') {
          // msgOptions.log('ccccccccccccccc' + message.conversationId)
          // msgOptions.log('cccccccccccwaitingHandlersByConvIdcccc' + msgOptions.waitingHandlersByConvId)
          msgOptions.waitingHandlersByConvId[message.conversationId].dataHandler(message.data);
          // delete msgOptions.waitingCbsByConvId[message.conversationId]
        }

        if (message.command === 'error') {
          // msgOptions.log('ccccccccccccccc' + message.conversationId)
          // msgOptions.log('cccccccccccwaitingHandlersByConvIdcccc' + msgOptions.waitingHandlersByConvId)
          msgOptions.waitingHandlersByConvId[message.conversationId].errorHandler(message.data);
          delete msgOptions.waitingCbsByConvId[message.conversationId]
        }

        if (message.command === 'do'){
          var command = message.argObj.command;
          var clientSocketRoute = message.clientSocketRoute;

          msgOptions.conversations[message.conversationId] = {
            startedBy: message.owner,
            argObj: message.argObj,
            conversationId: message.conversationId,
            ws: connection,
            clientSocketKey: message.clientSocketKey
          };

          try{
            if (message.clientSocketRoute){
              msgOptions.publicSocketRoutes[message.clientSocketRoute].getRule(command).ws.send(msg2.utf8Data); 
            } else {
              msgOptions.getSocketRule(command).ws.send(msg2.utf8Data);      
            }
          } catch (e){
            log('ERROR forwarding slave socket:', e.message, e.stack, {address, command, message, clientSocketRoute, publicSocketRoutes: msgOptions.publicSocketRoutes});
          }
          return;
        }

        if(message.command === 'updateGatewayList'){
          return log('Gateway list received from new to-msg connection, NOT IMPLEMENTED:', message.data);
        }
      });
      
      var message = 'slave WebSocket Client Connected: ' + address;
      
      try {
        // log({EZZZZZ: thisGateway.sendGatewayDetails, MEGEEEZZZ: typeof thisGateway.sendGatewayDetails})
        thisGateway.sendGatewayDetails().then(() => {}, log);  //!!!!!!!!!!!! include here the below two
        
        // send public socket routes we use
        Object.keys(msgOptions.publicSocketRoutes).forEach(function(route){ thisGateway.sendCsRoute( route ).then(() => {}, log); });
        
        // send the rules we know of
        Promise.all( msgOptions.convertedDirectRules.map(function(rule){return thisGateway.sendRule(rule).then(() => {}, log);}) ).then(function(){
          log('Number of slave rules sent to MSG on connection (' + address + '): ' + msgOptions.convertedDirectRules.length);
        });
      } catch (e) {
        log('ERROR: ' + e.message + '\n' + e.stack, address, {thisGateway});
      }
        
    });

    log('trying to connect to gateway on ' + address + '...');
    thisGateway.ws.connect(address + '/slaveSockets');
    
  }

  function publishCsRoute(route){
    Object.keys( msgOptions.gateways ).forEach(function(address){
      msgOptions.gateways[address].sendCsRoute(route);
    });
  }

  function publishRule(rule) {
    if (rule.owner.indexOf(msgOptions.serviceLongName) < 0){
      var owner = rule.owner + '-on-' + msgOptions.serviceLongName + '-at-' + msgOptions.getAddress();
      var convertedRule = Object.assign({}, rule, { owner, outHost: msgOptions.ip.public, outPort: msgOptions.port.public });
      delete convertedRule.ws;
      
      msgOptions.convertedDirectRules.push(convertedRule);
      Object.keys( msgOptions.gateways ).forEach(function(address){
        msgOptions.gateways[address].sendRule(convertedRule);
      });
    }
  }

  var gridEntryAddress = process.env.MSG_GRID_ENTRY_ADDRESS;
  if (!gridEntryAddress) log('No entry address in env --> MASTER MSG'); 
  
  function start(){
    log('Starting slave', msgOptions.gateways);
    connectToGateway(gridEntryAddress);
    connectToGateway(msgOptions.getAddress());
  }

  return {
    start: start,
    connect: connectToGateway,
    publishCsRoute: publishCsRoute,
    publishRule: publishRule
  };

};