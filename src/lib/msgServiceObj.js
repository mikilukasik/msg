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
    return msgOptions.obj.on( 'USE ' + route, msgOptions.express.static(dirName) );
  };

  return msgService;
};