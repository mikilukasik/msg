module.exports = function isFunction(functionToCheck) {
  var getType = {};
  return functionToCheck && ['[object Function]', '[object AsyncFunction]'].includes(getType.toString.call(functionToCheck));
};
