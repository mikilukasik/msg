module.exports = function createHttpRuleCreator(msgOptions){

  return function createHttpRule(argObj, method, rule = {}){
    rule.method = method;
    var pOptions = {
      url: argObj.cmd
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
      var thisFunc = msgOptions.app[ method ];

      // TODO: multiple handlers (mw) should be implemented
      thisFunc.bind(msgOptions.app)(rule.outPath, argObj.handler); //app.get(url, (req, res) => {})
    } catch(e){msgOptions.log('EXPRESS could not create route: ' + rule.outPath, e.message, e.stack);}
    return rule;
  };
};