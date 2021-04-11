module.exports = function mwCreator(msgOptions) {
  return function mgMw(req, res, next) {
  // log('In middleware...', {
  //   url: req.url,
  //   originalUrl: req.originalUrl
    // });
    req.mwMsg = 'PASS';
    return next();
  };
};