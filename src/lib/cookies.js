const cookies = {
  set(cname, cvalue, exdays = 365) {
    if (!exdays) return document.cookie = cname + '=' + cvalue;
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = 'expires=' + d.toUTCString();
    document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/';
  },

  delete(cname) {
    var d = new Date(2000, 1, 1);
    var expires = 'expires=' + d.toUTCString();
    document.cookie = cname + '=' + ';' + expires + ';path=/';  },

  get(cname) {
    var name = cname + '=';
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i += 1) {
      var c = ca[i];
      while (c.charAt(0) === ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) === 0) {
        return c.substring(name.length, c.length);
      }
    }
    return '';
  }
};

module.exports = cookies;
