module.exports = function msgServiceObjCreator(msgOptions){

  var msgService = {};

  msgService.connect = require('./msConnect')(msgOptions);
  msgService.expose = require('./msExpose')(msgOptions);

  msgService.subscribe = require('./subscribe')(msgOptions);
  msgService.sub = msgService.subscribe;
  msgService.unsubscribe = require('./unsubscribe')(msgOptions);
  msgService.unsub = msgService.unsubscribe;

  msgService.emit = require('./msEmit')(msgOptions);

  msgService.on = require('./msOn')(msgOptions);
  msgService.do = require('./msDo')(msgOptions);

  msgService.ws = require('./msWs')(msgOptions);

  msgService.static = function(route, dirName){
    return msgOptions.obj.on.use(route, msgOptions.express.static(dirName) );
  };

  msgService.close = () => new Promise((res) => {
    msgOptions.log(`Closing msg service ${msgOptions.serviceName}.`);
    // TODO: we could shut down more gracefully than this
    msgOptions.stopped = true;
    msgOptions.ws.abort();
    msgOptions.expressServer.close(() => {
      for (const key of Object.keys(msgOptions.timeoutIds)) clearTimeout(msgOptions.timeoutIds[key]);
      for (const key of Object.keys(msgOptions.intervalIds)) clearInterval(msgOptions.intervalIds[key]);
      msgOptions.log(`Msg service ${msgOptions.serviceName} closed.`);
    res();
    });
    setImmediate(function(){msgOptions.expressServer.emit('close')});

  });

  return msgService;
};