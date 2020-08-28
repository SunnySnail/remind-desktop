/**
 * Webpack config for production electron main process
 */
const { merge } = require('webpack-merge');
const baseConfig = require('./webpack.config.base');

module.exports = merge(baseConfig, {
  devtool: process.env.DEBUG_PROD === 'true' ? 'source-map' : 'none',

  target: 'electron-main',

  entry: './app/main/main.dev.ts',

  /**
   * Disables webpack processing of __dirname and __filename.
   * If you run the bundle in node.js it falls back to these values of node.js.
   * https://github.com/webpack/webpack/issues/2010
   */
  node: {
    __dirname: false,
    __filename: false,
  },
});
