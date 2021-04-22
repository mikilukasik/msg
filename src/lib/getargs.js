const isfunction = require('./isfunction');

module.exports = function getArgsCreator(){
  return function getArgs(args){

    const command = args[0];
    if (isfunction(args[1])) {
      const handler = args[1];

      return {
        command,
        handler,
      };
    };

    const data = args[1];
    const handler = args[2];
    return {
      command,
      data,
      handler,
    };
  };
};