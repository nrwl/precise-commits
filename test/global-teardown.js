const execa = require('execa');

/**
 * Destroy the tmp directory that was created in global-setup.js
 */
module.exports = () => execa.sync('rm', ['-rf', './tmp']);
