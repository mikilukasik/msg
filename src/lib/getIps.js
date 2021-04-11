var network = require('network');

module.exports = function getIpsCreator(msgOptions){
  var log = (msgOptions || {}).log || console.log;


  return function getIps(ipNames, confObj, maxTries){
    function getIpFunc(ipName){
      switch (ipName) {
      case 'private': return network.get_private_ip;
      case 'public': return network.get_public_ip;
      case 'gateway': return network.get_gateway_ip;
      default: throw new Error('unknown ipName: ' + ipName);
      }
    }
    
    try {
      if (!ipNames) ipNames = ['private', 'public', 'gateway'];
      if (typeof ipNames === 'string') ipNames = ipNames.replace(new RegExp(' ', 'g'), '').split(',');

      if (!confObj) confObj= {};
      if (typeof confObj === 'string') confObj = { optional: confObj };
      if (typeof confObj === 'number') confObj = { maxTries: confObj };

      if (!confObj.optional) confObj.optional = [];
      if (typeof confObj.optional === 'string') confObj.optional = confObj.optional.replace(new RegExp(' '), '').split(',');

      if (maxTries) confObj.maxTries = maxTries;
      if (!confObj.ip) confObj.ip = {};


      var getIp = function(ipName, maxTries){
        if(!maxTries) maxTries = 1;
        return new Promise(function (res, rej){
          var tries = 0;
          function tryIt(){
            tries += 1;
            getIpFunc(ipName)(function(err, ip){
              if (err) {
                if (tries < maxTries) return tryIt();
                confObj.ip[ipName] = err;
                return rej(err);
              }
              return res(ip);
            });
          }
          tryIt();
        });
      };

      if (ipNames.length === 1) return getIp(ipNames[0], confObj.maxTries);

      confObj.optional.forEach(function(optName){
        var i = ipNames.length;
        while (i--) {
          if (ipNames[i] === optName){
            ipNames.splice(i, 1);
            getIp(optName, confObj.maxTries).then(
              function(ip){ confObj.ip[optName] = ip; },
              function(err){ log('ERROR: Could not get ' + optName + ' ip: ' + err.message, err.stack); }
            );
          }
        }
      });
      
      var promises = ipNames.map(function(ipName){
        return getIp(ipName, confObj.maxTries).then(
          function(ip){ confObj.ip[ipName] = ip; return { name: ipName, ip: ip }; },
          function(err){ log('ERROR: Could not get ' + ipName + ' ip: ' + err.message, err.stack); return err; }
        );
      });
      //**console.log('@@@@@@@@@@@@@@@@@@@@@@@', promises.length, promises[1].then(() => {}, console.log))
      return Promise.all(promises);
    } catch (e) {log (e);}  
  };
};