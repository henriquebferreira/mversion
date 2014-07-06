var semver = require('semver')
  , path = require('path')
  , through = require('through2')
  , fs = require('vinyl-fs')
  , fUtil = require('./lib/files')
  , git = require('./lib/git')
  ;

exports.get = function (callback) {
  var result = fUtil.loadFiles();
  var ret = {};

  result
    .on('data', function (file) {
      var contents = JSON.parse(file.contents.toString());
      ret[path.basename(file.path)] = contents.version;
    })
    .on('end', function () {
      callback(null, ret);
    });
};

exports.isPackageFile = fUtil.isPackageFile;

var updateJSON = exports.updateJSON = function (obj, ver) {
  ver = ver.toLowerCase();

  var validVer = semver.valid(ver);
  obj = obj || {};
  var currentVer = obj.version;

  if (validVer === null) {
    validVer = semver.inc(currentVer, ver);
  }

  if (validVer === null) {
    return false;
  }

  obj.version = validVer;
  return obj;
};

exports.update = function (ver, commitMessage, noPrefix, callback) {

  if (!callback && typeof noPrefix  === 'function') {
    callback = noPrefix;
    noPrefix = false;
  }
  noPrefix = !!noPrefix;

  if (!callback && typeof commitMessage  === 'function') {
    callback = commitMessage;
    commitMessage = null;
  }
  callback = callback || noop();

  (function (done) {
    if (commitMessage) {
      return git.isRepositoryClean(done);
    }
    return done(null);
  })(function(err) {
    if (err) {
      callback(err);
      return void 0;
    }

    var files = []
      , stream = fUtil.loadFiles()
      , versionList = {}
      , updated = null
      , hasSet = false
      ;
    var i = 0;
    var stored = stream.pipe(through.obj(function(file, e, next) {
      if (file == null || file.isNull()) {
        this.push(null);
        next();
      }
      var json = file.contents.toString();
      var contents = JSON.parse(json);

      if (!hasSet) {
        hasSet = true;
        updated = updateJSON(contents, ver);
      }

      if (!updated) {
        callback(new Error('No valid version given.'));
        return void 0;
      }

      contents.version = updated.version;
      file.contents = new Buffer(JSON.stringify(contents, null, fUtil.space(json)) + fUtil.getLastChar(json));
      versionList[path.basename(file.path)] = updated.version;

      this.push(file);
      next();
    }))
    .pipe(fs.dest('./'));

    stored.on('data', function (file) {
      files.push(file.path);
    });

    stored.on('end', function () {
      var ret = {
        newVersion: updated.version
        , versions: versionList
        , message: files.map(function (file) {
          return 'Updated ' + path.basename(file);
        }).join('\n')
      };

      if (!commitMessage) {
        callback(null, ret);
        return void 0;
      }

      git.commit(files, commitMessage, updated.version, noPrefix, function (err) {
        if (err) {
          callback(err, ret);
          return void 0;
        }

        ret.message += '\nCommited to git and created tag ';
        if (!noPrefix) ret.message += 'v';
        ret.message += updated.version;
        callback(null, ret);
      });
    });
  });
};

function noop () {
  return function () { };
}