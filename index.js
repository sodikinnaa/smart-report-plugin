// Compatibility entry for OpenClaw loaders across versions.
// Always expose register/activate as direct CommonJS exports.
const mod = require('./dist/index.js');

const register =
  mod.register ||
  mod.activate ||
  (mod.default && (mod.default.register || mod.default.activate)) ||
  (typeof mod === 'function' ? mod : undefined);

if (typeof register !== 'function') {
  throw new Error('smart-report-plugin: register/activate export not found');
}

module.exports = register;
module.exports.register = register;
module.exports.activate = register;
