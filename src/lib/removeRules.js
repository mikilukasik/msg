
module.exports = function removeRulesCreator(msgOptions){

  var log = msgOptions.log || console.log;

  function removeRules (confobj) {
    if(!confobj) confobj = {};

    // the below removes the disconnected sockets from the rule's usingWss array
    Object.keys(msgOptions.publicSocketRoutes).forEach(route => {
      let uwssI = msgOptions.publicSocketRoutes[route].usingWss.length;
      while (uwssI--) {
        if (msgOptions.publicSocketRoutes[route].usingWss[uwssI].readyState > 1) {
          msgOptions.publicSocketRoutes[route].usingWss.splice(uwssI, 1);
        }
      }
    });

    if(confobj.ownerMatch){
      var i = msgOptions.convertedDirectRules.length;
      while (i--) {
        var thisRule = msgOptions.convertedDirectRules[i];
        if (thisRule.owner.indexOf( confobj.ownerMatch ) >= 0) {
          msgOptions.convertedDirectRules.splice(i, 1);

          // store uncompleted .do -> .on tasks for res-sending them
          const requiredHandler = {
            publicSocketRoute: thisRule.publicSocketRoute,
            cmd: thisRule.cmd,
            serviceName: thisRule.serviceName,
          };

          const pendingConversations = Object.keys(msgOptions.conversations)
            .map(key => msgOptions.conversations[key])
            .filter(({ clientSocketRoute, argObj: { cmd } }) => clientSocketRoute === requiredHandler.publicSocketRoute && cmd === requiredHandler.cmd);
          if (!pendingConversations.length) continue;

          if (!msgOptions.suspendedConversationsPerRoute[requiredHandler.publicSocketRoute]) {
            msgOptions.suspendedConversationsPerRoute[requiredHandler.publicSocketRoute] = {};
          }
          
          if (!msgOptions.suspendedConversationsPerRoute[requiredHandler.publicSocketRoute][requiredHandler.cmd]) {
            msgOptions.suspendedConversationsPerRoute[requiredHandler.publicSocketRoute][requiredHandler.cmd] = [];
          }

          msgOptions.suspendedConversationsPerRoute[requiredHandler.publicSocketRoute][requiredHandler.cmd].push(...pendingConversations);
        }
      }

      for (var route in msgOptions.httpRoutes) {
        var j = msgOptions.httpRoutes[route].length;
        while (j--) {
          if (msgOptions.httpRoutes[route][j].rule.owner.indexOf( confobj.ownerMatch ) >= 0) msgOptions.httpRoutes[route].splice(j, 1);
        }
      } 
    }
  }
  return removeRules;
};