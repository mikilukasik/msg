// var JSON5 = require('json5');
var isFunction = require('./isfunction');

module.exports = function getArgsCreator(globOpts){
  if (!globOpts) globOpts = {};

  function tryParse(strObj){
    try{
      return JSON.parse(strObj);
    } catch (e) {
      return strObj;
    }
  }

  return function getArgs(a, keys){
    if (!keys) keys = globOpts.keys;
    var len = Object.keys(a).length;
    var args = [];
    for (var j = 0; j < len; j += 1){args.push(a[j]);}
    var argsLen = args.length;
    // get first string argument
    var cmdStr = null;
    var i = 0;
    do {
      cmdStr = args[i];
      i += 1;
    } while (typeof cmdStr !== 'string' && i < argsLen);
    
    //remove spaces from object-like arguments
    var insideObj = 0;
    var csI = cmdStr.length;
    while(csI--){
      if(cmdStr[csI] === '}') insideObj += 1;
      if(cmdStr[csI] === '{') insideObj -= 1;

      if (insideObj && cmdStr[csI] === ' '){
        cmdStr = cmdStr.substring(0, csI) + cmdStr.substring(csI + 1, cmdStr.length);
      } 
    }


    // break it apart
    var splitCmd = cmdStr.split(' ');
    var cmd = splitCmd[0];


    // get first Object argument
    var cmdArgs = null;
    var m = 0;
    do {
      cmdArgs = args[m];
      m += 1;
    } while (typeof cmdArgs !== 'object' && m < argsLen);
    if (typeof cmdArgs !== 'object') cmdArgs = {};

    if(!cmdArgs) cmdArgs = {};


    // parse options from string
    var splitCmdTemp = splitCmd.slice(1);
    var k = 0;
    while (splitCmdTemp[k]) {
      var part = splitCmdTemp[k];
      if (part[0] === '-') {
        var key = part.substring(1);
        var altKey = '';

        // found switch, check for long switch name
        if (keys && keys.forEach) {
          if (keys.indexOf(key) < 0){

            // switch name is not in list, look for match
            var x = keys.length;
            while (x--) {
              if(keys[x].indexOf(key) === 0 && cmdArgs[keys[x]] === undefined){
                altKey = keys[x];
              }
            }

          }
        }

        if (splitCmdTemp[k + 1] && splitCmdTemp[k + 1][0] !== '-') {
          // has value
          var thisVal = tryParse(splitCmdTemp[k + 1]);
          cmdArgs[key] = thisVal;
          if (altKey) cmdArgs[altKey] = thisVal;
          splitCmdTemp.splice(k + 1, 1);
        } else {
          // no value, means true
          cmdArgs[key] = 1;
          if (altKey) cmdArgs[altKey] = 1;
        }
      } else {
        // found default arg
        cmdArgs.param = part;
      }
      k += 1;
    }
    
    // get last function argument as cb
    var l = args.length;
    var cb;
    // while (l--) {
    for (var cbi = 0; cbi < l; cbi += 1) {
      if (isFunction(args[cbi])) {
        cb = cb ? [].concat(cb).concat(args[cbi]) : args[cbi];
      }
    }
    var cbs = [].concat(cb);
    if (!cb) cb = () => {};

    return {
      param: cmdArgs.param,
      splitCmd: splitCmd,
      cmd: splitCmd[0],
      cmdStr: cmdStr,
      cmdArgs: cmdArgs,
      args: args,
      cb: cb,
      cbs,
    };
  }; 
};