module.exports = function emitGridStatusCreator(msgOptions){
  var log = msgOptions.log || console.log;

  var runningInterval = null;

  function emitGridStatus(start){

    if (runningInterval) clearInterval(runningInterval);

    if (start !== false) {

      return runningInterval = msgOptions.obj.emit.interval('gridStatus', 1500, function(){

        console.log('emitting')
        return {
          status: 'RUNNING',
          address: msgOptions.getAddress(),
          gateways: Object.keys(msgOptions.gateways).map(function(gwAddr){
            return Object.assign({}, msgOptions.gateways[gwAddr], {ws: undefined, connection: undefined});
          }),
          // httpRoutes: msgOptions.httpRoutes
          rules: msgOptions.convertedDirectRules
        };

      });

    }
    
  }
  return emitGridStatus;
};