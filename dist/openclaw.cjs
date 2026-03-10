const mod = require('./index.js');

const register =
  mod.register ||
  mod.activate ||
  (mod.default && (mod.default.register || mod.default.activate));

if (typeof register !== 'function') {
  throw new Error('smart-report-plugin: register/activate export not found');
}

module.exports = register;
module.exports.register = register;
module.exports.activate = register;
