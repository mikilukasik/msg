var debug = process.env.NODE_ENV !== 'production';
var webpack = require('webpack');

module.exports = [{
  context: __dirname,
  // devtool: debug ? 'inline-source-map' : null,
  entry: './src/client.js',
  output: {
    // path: __dirname + '/js',
    filename: process.env.NODE_ENV === 'test' ? '../test/helpers/clientHoster/public/msgClient.js' : './msgClient.js'
  },
  plugins: debug ? [] : [
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.optimize.UglifyJsPlugin({ mangle: false, sourcemap: false }),
  ],
  module: {
    // loaders: [
    //   { test: /\.css$/, loader: 'style-loader!css-loader' }
    // ]
  }
}];