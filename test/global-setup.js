const execa = require('execa');

/**
 * Create the tmp directory in which our `.git` directory
 * under test will live, and all the temp files will be
 * created and updated.
 */
module.exports = () => execa.sync('mkdir', ['./tmp']);
