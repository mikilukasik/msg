module.exports = function toStr(data) {
  if (typeof data === 'object') {
    if (data.message && data.stack) return `ERROR: ${data.message + data.stack}`;
    var cache = [];
    return JSON.stringify(data, function(key, value) {
      if (typeof value === 'object' && value !== null) {
        if (cache.indexOf(value) !== -1) {
          return;
        }
        cache.push(value);
      }
      return value;
    }, 2);
  }
  if (typeof data === 'undefined') return 'undefined';
  return data.toString();
};
