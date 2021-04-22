module.exports = function exposeCreator(msgOptions){
  console.warn('msg.expose is deprecated')
  return () => {};

  // return function expose(){
  //   var argObj = msgOptions.getArgs(arguments);
  //   return new Promise(function(resolve, rej){

  //     switch (argObj.cmd) {
  //     case 'status':

  //       msgOptions.obj.on('GET ' + argObj.param, function(req,res){
  //         res.writeHead(200, {'Content-Type':'text/enriched'});
  //         res.write(
  //             'STATUS from msg-service on '
  //             + msgOptions.serviceName
  //             + '\n'
  //             + Object.keys(msgOptions.ip).map(function(ipName){return '\n' + ipName + ' ip: ' + msgOptions.ip[ipName];}).join('')
  //           );
  //         res.end();
  //       }).then(resolve, rej);
      
  //       break;

  //     case 'log':

  //       msgOptions.obj.on('GET ' + argObj.param, function(req,res){
  //         msgOptions.log(function(){return 'getLog';}).then(function(logData){
  //           res.writeHead(200, {'Content-Type':'text/enriched'});
  //           res.write(logData);
  //           res.end();
  //         }, function(err){
  //           res.writeHead(500, {'Content-Type':'text/enriched'});
  //           res.write('Could not get log.' + err.message);
  //           res.end();
  //         });
  //       });

  //       break;
      
  //     default:
  //       var message = 'msg.expose could not resolve command: ' + argObj.cmd;  
  //       msgOptions.log(message, argObj);
  //       rej({
  //         status: 'ERROR',
  //         message: message,
  //         data: argObj
  //       });
  //       break;
  //     }
  //   });
  // };

};