module.exports = function emitCreator(msgOptions){

  return function emit(){
    var argObj = msgOptions.getArgs(arguments);
    return new Promise(function(resolve, rej){
      msgOptions.log(new Error('TODO: In blank msEmit'))




    });
  };

};