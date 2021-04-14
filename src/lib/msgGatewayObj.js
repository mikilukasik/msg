module.exports = function msgGatewayObjCreator(msgOptions){

  var msgGateway = {};

  // msgGateway.connect = require('./msConnect')(msgOptions)
  // msgGateway.subscribe = require('./subscribe')(msgOptions)
  // msgGateway.emit = require('./msEmit')(msgOptions)
  // msgGateway.ws = require('./msWs')(msgOptions)

  msgGateway.on = require('./mgOn')(msgOptions);
  msgGateway.do = require('./mgDo')(msgOptions);
  msgGateway.emit = require('./mgEmit')(msgOptions);

  msgGateway.subscribe = require('./subscribe')(msgOptions);
  msgGateway.sub = msgGateway.subscribe;
  msgGateway.unsubscribe = require('./unsubscribe')(msgOptions);
  msgGateway.unsub = msgGateway.unsubscribe;

  msgGateway.expose = require('./mgExpose')(msgOptions);

  msgGateway.close = () => new Promise((res) => {
    msgOptions.stopped = true;

    msgOptions.expressServer.close(() => {
      for (const key of Object.keys(msgOptions.timeoutIds)) clearTimeout(msgOptions.timeoutIds[key]);
      for (const key of Object.keys(msgOptions.intervalIds)) clearInterval(msgOptions.intervalIds[key]);
      res();
    });
    for(const client of msgOptions.expressWs.getWss().clients) client.close();
  });

  // msgGateway.do = require('./msDo')(msgOptions)

  // msgGateway.static = function(route, dirName){
  //   return msgOptions.obj.on( 'USE ' + route, msgOptions.express.static(dirName) )
  // }

  return msgGateway;
};