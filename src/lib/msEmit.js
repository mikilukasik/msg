module.exports = function emitCreator(msgOptions){

  return function emit(command, data, handler){
    var argObj = { command, data, handler };
    return new Promise(function(resolve, rej){
      msgOptions.log(new Error('TODO: In blank msEmit'))




    });
  };

};