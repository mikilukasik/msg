module.exports = function emitCreator(msgOptions){

  return function emit(cmd, data, handler){
    var argObj = { cmd, data, handler };
    return new Promise(function(resolve, rej){
      msgOptions.log(new Error('TODO: In blank msEmit'))




    });
  };

};