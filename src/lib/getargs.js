const isfunction = require('./isfunction');

module.exports = function getArgsCreator(){
  return function getArgs(args){

    const command = args[0];
    if (isfunction(args[1])) {
      const handler = args[1];

      return {
        splitCmd: [ command ],
        cmd: command,
        cmdStr: command,
        cmdArgs: {},
        args: [command, handler],
        cb: handler,
        cbs: [handler],
      };
    };

    const data = args[1];
    const handler = args[2];
    return {
      splitCmd: [ command ],
      cmd: command,
      cmdStr: command,
      cmdArgs: data,
      args: [command, data, handler],
      cb: handler,
      cbs: [handler],
    };
  };
};