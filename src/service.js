module.exports = function createMsgService(optionalOptions){
  var DEV = ['development', 'dev'].indexOf( process.env.NODE_ENV ) >= 0 

  var log = console.log;
  // process.on('unhandledRejection', ur => {
  //   log('unhandledRejection', ur);
  // });
  
  var fs = require('fs');
  var path = require('path');
  
  var shareFile = () => log('!!!PURE FUNCTION shareFile');
  // if (!DEV) {
  //   log('Starting memwatch, will dump and serve heapfiles on memory leaks.');
  //   var memwatch = require('memwatch-next');
  //   var heapdump = require('heapdump');  
  
  
  //   memwatch.on('leak', function(info) {
  //     log('!!!!! MEMORY LEAK IN MSG GATEWAY !!!!!', info, 'Dumping heap in file...');
  //     heapdump.writeSnapshot(function(err, _filename) {  
  //       if (err) return log(err);
  //       const filename = path.resolve(_filename);
  //       log('dump written to', filename);
  //       shareFile(filename);
  //     });
  //   });
  // }
  
  var express = require('express');
  var cookieParser = require('cookie-parser');
  var bodyParser = require('body-parser');
  var WebSocketClient = require('websocket').client;

  var getArgsCreator = require('./lib/getargs');
  
  var app = express();
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cookieParser());

  if (typeof optionalOptions === 'undefined') optionalOptions = {};
  if (typeof optionalOptions !== 'object') throw new Error('msgService string constructor not implemented: ' + optionalOptions);

  var msgOptions = {
    startedAt: new Date(),
    DEV: ['development', 'dev'].indexOf( process.env.NODE_ENV ) >= 0,
    log: log,
    express:express,
    app: app,
    getArgs: getArgsCreator(),
    ws: new WebSocketClient(),
    PORT: 5000,
    serviceName: 'msgService',
    serviceId: Math.random() * Math.random(),
    myRules: {},
    mySocketRules: {},
    wsRoutes: {},
    waitingCbsByConvId: {},
    waitingErrHandlersByConvId: {},
    waitingHandlersByConvId: {},
    timeoutIds: {},
    intervalIds: {},
    stopped: false,

    connection: { send: function(){ log('pure method: connection.send'); } },
    ip: {
      private: '',
      public: '',
      gateway: ''
    },
    gotIp: false,
    retryCount: {},
    connected: false,
    subscribedTo: {},
  };

  Object.keys(optionalOptions).forEach(function(key){
    msgOptions[key] = optionalOptions[key];
    if(key === 'log') log = optionalOptions.log;
  });

  msgOptions.callWhenConnected = (confirmConnect) => {
    if (msgOptions.connected && msgOptions.gotIp) {
      return confirmConnect();
    }
    msgOptions.timeoutIds.callWhenConnected = setTimeout(function(){msgOptions.callWhenConnected(confirmConnect);}, 200);   // TODO: trigger this on connection instead of setTimeout
  }

  msgOptions.waitForConnection = function(){
    return new Promise(function(res4, rej4){
      msgOptions.callWhenConnected(res4);
    });
  };

  msgOptions.serviceLongName = msgOptions.serviceName + '-' + msgOptions.serviceId;

  msgOptions.getIps = require('./lib/getIps')(msgOptions);
  msgOptions.toGtw = require('./lib/toGtw')(msgOptions); 
  msgOptions.myCallBacks = require('./lib/myCallBacks')(msgOptions); 
  msgOptions.askGtw = require('./lib/askGtw')(msgOptions); 
  msgOptions.sendRule = require('./lib/sendRule')(msgOptions); 
  msgOptions.cacheRule = require('./lib/cacheRule')(msgOptions); 
  msgOptions.registerRule = require('./lib/registerRule')(msgOptions); 
  msgOptions.createHttpRule = require('./lib/createHttpRule')(msgOptions); 
  msgOptions.createSocketRule = require('./lib/createSocketRule')(msgOptions); 
  msgOptions.createRule = require('./lib/createRule')(msgOptions); 

  msgOptions.obj = require('./lib/msgServiceObj')(msgOptions); 
  msgOptions.obj.app = app;

  shareFile = function(filename){
    msgOptions.obj.on(
      'GET /dumps' + filename,
      function(req, res){
        res.send(fs.readFileSync(filename));
      }
    );
    log('Serving dump file on /dumps' + filename);
  };

  log('MSG Service created.');

  return msgOptions.obj;
};
