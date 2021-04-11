module.exports = function createHttpRuleCreator(msgOptions){

  return function createHttpRule(argObj, rule){
    if ((['GET', 'POST', 'PUT', 'DELETE', 'USE']).indexOf(argObj.cmd) >= 0) {
      rule.method = argObj.cmd;
      var pOptions = {
        url: argObj.param
      };

      if (pOptions.url[0] === '/'){
        rule.type = 'httpRedirect';
        rule.inPath = pOptions.url;
        rule.outPath = pOptions.url;
        rule.alias = pOptions.alias;
        rule.cmd = pOptions.cmd || pOptions.url;
      } else {
        rule.type = 'httpPrivate';
        rule.outPath = '/' + pOptions.url;
        rule.cmd = pOptions.cmd || pOptions.url;
      }

      // register hhtp rule in local express
      try{
        var thisFunc = msgOptions.app[ argObj.cmd.toLowerCase() ];
        thisFunc.bind(msgOptions.app)(rule.outPath, ...argObj.cbs); //app.get(url, (req, res) => {})
      } catch(e){msgOptions.log('EXPRESS could not create route: ' + rule.outPath, e.message, e.stack);}
      return rule;
    }
    return null;
  };
};