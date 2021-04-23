var toStr = require('./toStr');

module.exports = function toGtwCreator(msgOptions){

  return function toGtw(cmd, data, conversationId){
    // msgOptions.log('in mgToGtw');
    return Promise.all(
      Object.keys(msgOptions.gateways).filter(function(addr){
        return msgOptions.gateways[addr].toGtw;
      }).map(function(addr){
        // msgOptions.log('sending ' + cmd + ' to ' + addr);
        try {
          return msgOptions.gateways[addr].toGtw(cmd, data, conversationId);

        } catch (e) {
          msgOptions.log(e.message + '\n' + e.stack);
        }
      })
    ).then(
      function (resArr) {msgOptions.log(cmd + ' sent to ' + resArr.length + ' gateways.');},
      function (errArr) {msgOptions.log('ERROR: failed to send ' + cmd + ' to ' + errArr.length + ' gateways: ' + toStr(errArr));}
    );

    // send stuff to all connected gateways


    // return new Promise(function(res3, rej3){
    //   try {
    //     msgOptions.waitForConnection()
    //       .then(function(){
            
    //         msgOptions.connection.send(JSON.stringify(Object.assign({
    //           cmd: cmd,
    //           data: data,
    //           owner: msgOptions.serviceLongName,
    //           conversationId: conversationId,            
    //           serviceName: msgOptions.serviceName,
    //           serviceLongName: msgOptions.serviceLongName,
    //         }, data)))
          
    //       }, rej3 ).then(res3, rej3)
    //   } catch (te) {
    //     rej3(te)
    //   }
    // })
  };

};