var toStr = require('./toStr');

module.exports = function mgStartCreator(msgOptions){
  var log = (msgOptions || {}).log || console.log;

  return function start() {

    try{
      log('Starting ' + msgOptions.serviceLongName + ' on ' + msgOptions.getAddress());

      msgOptions.slaveFunctions.start();

      msgOptions.app.listen(msgOptions.PORT);
      log('Listening on port ' + msgOptions.PORT);

      msgOptions.app.use(msgOptions.mw);
      
      msgOptions.app.get('/', function (req, res){ res.send('Hello from ' + msgOptions.serviceName + '!'); });
      
      msgOptions.app.ws('/sockets', msgOptions.socketsRoute);
      msgOptions.app.ws('/slaveSockets', msgOptions.slaveSocketsRoute);

      msgOptions.app.get('/log', function(req, res) {
        log(function(){return 'getLog';}).then(function(logData){
          res.writeHead(200, {'Content-Type':'text/enriched'});
          res.write(logData);
          res.end();
        }, function(err){
          res.writeHead(500, {'Content-Type':'text/enriched'});
          res.write(err.message);
          res.end();
        });
      });

      msgOptions.app.get('/status', function(req, res) {
        res.writeHead(200, {'Content-Type':'text/enriched'});
        res.write(toStr(msgOptions));
        res.end();
      });

      msgOptions.emitGridStatus();

    } catch (e) {
      log('ERROR:', e );
    }
  
  };
};