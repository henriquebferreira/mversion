var minimatch = require('minimatch');
var fs = require('vinyl-fs');
var rc = require('rc');

exports.files = [
  'package.json',
  'npm-shrinkwrap.json',
  '*.jquery.json',
  'component.json',
  'bower.json',
  'manifest.json',
  'composer.json'
];

module.exports.loadFiles = function() {
  return fs.src(exports.files, { allowEmpty: true });
};

module.exports.loadInputFiles = function(files) {
  return fs.src(files, { allowEmpty: true });
};

module.exports.getRC = function() {
  return rc('mversion');
};

module.exports.isPackageFile = function(file) {
  for (var i = 0; i < exports.files.length; i++) {
    if (minimatch(file, exports.files[i])) {
      return true;
    }
  }
  return false;
};

// Preserver new line at the end of a file
module.exports.getLastChar = function(json) {
  return json.slice(-1) === '\n' ? '\n' : '';
};

// Figured out which "space" params to be used for JSON.stringfiy.
module.exports.space = function(json) {
  var match = json.match(/^(?:(\t+)|( +))"/m);
  return match ? (match[1] ? '\t' : match[2].length) : '';
};
