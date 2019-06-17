const path = require('path')

module.exports = {
  entry: './lib/server/index',
  target: 'node',
  mode: 'none',
  output: {
    path: path.resolve(__dirname, '.release/lib/server'),
    filename: 'index.js'
  },
  plugins: [
  ],
  node: {
    __filename: false,
    __dirname: false
  }
}
