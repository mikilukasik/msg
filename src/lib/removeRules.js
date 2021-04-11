
module.exports = function removeRulesCreator(msgOptions){

  var log = msgOptions.log || console.log;

  function removeRules (confobj) {
    if(!confobj) confobj = {};

    if(confobj.ownerMatch){
      var i = msgOptions.convertedDirectRules.length;
      while (i--) {
        var thisRule = msgOptions.convertedDirectRules[i];
        if (thisRule.owner.indexOf( confobj.ownerMatch ) >= 0) msgOptions.convertedDirectRules.splice(i, 1);
      }

      for (var route in msgOptions.httpRoutes) {
        var j = msgOptions.httpRoutes[route].length;
        while (j--) {
          if (msgOptions.httpRoutes[route][j].rule.owner.indexOf( confobj.ownerMatch ) >= 0) msgOptions.httpRoutes[route].splice(j, 1);
        }
      } 

      return;
    }

  }
  return removeRules;
};