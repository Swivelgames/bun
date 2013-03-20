var stream = require("stream");

var bun = module.exports = function bun(streams) {
  var inner = new stream.Duplex({objectMode: true}),
      outer = new stream.Duplex({objectMode: true});

  // inner
  inner._write = function _write(input, encoding, done) {
    if (outer.push(input)) {
      return done();
    }
    else {
      this.continue = done;
    }
  };

  inner._read = function _read(size) {
    if (outer.continue) {
      outer.continue();
      delete outer.continue;
    }
  };

  inner.once("error", function onError(err) {
    outer.emit("error", err);
  });

  inner.once("finish", function onFinish() {
    outer.push(null);
  });

  // outer
  outer._write = function _write(input, encoding, done) {
    if (inner.push(input)) {
      return done();
    }
    else {
      this.continue = done;
    }
  };

  outer._read = function _read(size) {
    if (inner.continue) {
      inner.continue();
      delete inner.continue;
    }
  };

  outer.once("error", function onError(err) {
    inner.emit("error", err);
  });

  outer.once("finish", function onFinish() {
    inner.push(null);
  });

  // piping time
  var s = inner;
  streams.concat([inner]).forEach(function(other) {
    s = s.pipe(other);
  });

  return outer;
};
