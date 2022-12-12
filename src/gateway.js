const getRandomId = require('./lib/getRandomId.js');

// set my public address to process.env.MSG_SLAVE_PUBLIC_ADDRESS
module.exports = function createMsgGateway(options) {
  // msgGateway
  var DEV = ['development', 'dev'].indexOf(process.env.NODE_ENV) >= 0;

  // var log = require('./logger')({alias: 'msg-gateway'});  // TODO: get logger from process, dont won it!!
  // var log = console.log;
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
  var app = express();
  var expressWs = require('express-ws')(app, undefined, { wsOptions: { maxPayload: 320000000 } });

  // var PORT = 3030

  var serviceName = options.serviceName || 'msg-gateway';
  var serviceId = getRandomId();

  var msgOptions = {
    ips: options.ips,
    app: app,
    express: express,
    expressWs,
    log: options.log || console.log,

    serviceName: serviceName,
    serviceId: serviceId,
    serviceLongName: serviceName + '-' + serviceId,

    ip: { public: '', private: '', gateway: '' },
    PORT: options.port || options.PORT || 3030,
    port: {
      public: process.env.MSG_PUBLIC_PORT || 80,
      private: options.port || 3030,
    },

    // TODO: make the below a proxy with setTimeout delete when inactive!!!!!! LEAK!!
    conversations: {}, // all active conversations we are part of (LEAK???!!!!!!!)
    suspendedConversationsPerRoute: { serviceToService: [] }, // client sent a .do, but service disconnected before answering. these will be resent when handler reconnects (all .subscribe will reopen then)
    gateways: {},
    timeoutIds: {},
    intervalIds: {},
    stopped: false,
    waitForRuleResolvers: {},
    // this should always have one of each rule, on the current fastest route
    httpRoutes: {}, // keys are like "GET /admin"
    socketRules: [], // keys are like "mongo"

    // to use. from the below we create the above, watching the fastest
    // gridSocketRules: [],            // rules received from other gateways. should exclude all direct
    // directSocketRules: [],          // to services connected to this gateway

    // to publish
    convertedDirectRules: [], // owner and routes changed to point to this gateway instead of service
    convertedGridRules: [], // owner and routes changed to point to this gateway instead of source

    publicSocketRoutes: {}, // keys are like "/authSockets"
    // gridPublicSocketRoutes: {},

    started: false,

    mySocketRules: {}, // msg.on on this gateway
    // mgDoHandlers: {}

    subscriptions: {},

    waitingHandlersByConvId: {},
    waitingTargetHandlersByConvId: {},
    waitingCbsByConvId: {},
    waitingErrHandlersByConvId: {},
    subscribedTo: {},
  };

  msgOptions.getSocketRule = function (cmd) {
    // TODO: this is a hack. sockets in this array should always be ready, if not, we should report an error
    // disconnected services stay in this array, they should not
    return msgOptions.socketRules.find(function (rule) {
      return rule.cmd === cmd && rule.ws.readyState === 1;
    });
  };

  msgOptions.getAddress = function () {
    return (
      (process.env.MSG_PUBLIC_ADDRESS || 'http://' + msgOptions.ip.public) +
      ':' +
      msgOptions.port.public
    ).replace(':80', '');
  };

  msgOptions.slaveFunctions = require('./lib/slaveFunctions')(msgOptions);
  msgOptions.emitGridStatus = require('./lib/emitGridStatus')(msgOptions);

  msgOptions.useClientSocketRoute = require('./lib/useClientSocketRoute')(msgOptions);
  msgOptions.setRule = require('./lib/setRule')(msgOptions);
  msgOptions.askGtw = require('./lib/mgAskGtw')(msgOptions);
  msgOptions.toGtw = require('./lib/mgToGtw')(msgOptions);
  msgOptions.removeRules = require('./lib/removeRules')(msgOptions);
  msgOptions.rejectOpenConversations = require('./lib/rejectOpenConversations')(msgOptions);

  msgOptions.getIps = require('./lib/getIps')(msgOptions);
  msgOptions._start = require('./lib/mgStart')(msgOptions);
  msgOptions.mw = require('./lib/mgMw')(msgOptions);
  msgOptions.socketsRoute = require('./lib/mgSocketsRoute')(msgOptions);
  msgOptions.slaveSocketsRoute = require('./lib/mgSlaveSocketsRoute')(msgOptions);
  msgOptions.createHttpRule = require('./lib/createHttpRule')(msgOptions);
  msgOptions.createSocketRule = require('./lib/createSocketRule')(msgOptions);
  msgOptions.createRule = require('./lib/createRule')(msgOptions);

  msgOptions.obj = require('./lib/msgGatewayObj')(msgOptions);

  var mgSubscribeHandler = require('./lib/mgSubscribeHandler')(msgOptions);
  msgOptions.obj.on.apply(this, mgSubscribeHandler);
  var mgUnsubscribeHandler = require('./lib/mgUnsubscribeHandler')(msgOptions);
  msgOptions.obj.on.apply(this, mgUnsubscribeHandler);

  // shareFile = function(filename){
  //   msgOptions.obj.on(
  //     'GET dumps/' + filename,
  //     function(req, res){
  //       res.send(fs.readFileSync(filename));
  //     }
  //   );
  //   log('Serving dump file on /dumps/' + filename);
  // };

  msgOptions.obj.start = () =>
    msgOptions.getIps('private, public, gateway', { maxTries: 5, optional: 'gateway', ip: msgOptions.ip }).then(
      function (ips) {
        // msgOptions.log('ips: ', ips);
        msgOptions.gotIp = true;
        return msgOptions._start();
      },
      function (err) {
        throw err;
      },
    );

  return msgOptions.obj;
};
