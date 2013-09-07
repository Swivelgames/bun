var stream = require("stream");

var bun = module.exports = function bun(streams, options) {
  options = options || {};

  if (typeof options.bubbleErrors === "undefined") {
    options.bubbleErrors = true;
  }

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
      var c = outer.continue;
      delete outer.continue;
      c();
    }
  };

  inner.once("finish", function onFinish() {
    outer.push(null);
  });

  inner.once("end", function onEnd() {
    outer.end();
  });

  if (!!options.bubbleErrors) {
    inner._emit = inner.emit;
    inner.emit = function emit(event) {
      if (event === "error") {
        return outer._emit.apply(outer, arguments);
      } else {
        return this._emit.apply(this, arguments);
      }
    };
  }

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
      var c = inner.continue;
      delete inner.continue;
      c();
    }
  };

  outer.once("finish", function onFinish() {
    inner.push(null);
  });

  outer.once("end", function onFinish() {
    inner.end();
  });

  if (!!options.bubbleErrors) {
    outer._emit = outer.emit;
    outer.emit = function emit(event) {
      if (event === "error") {
        return inner._emit.apply(inner, arguments);
      } else {
        return this._emit.apply(this, arguments);
      }
    };
  }

  // piping time
  var s = inner;
  streams.concat([inner]).forEach(function(other) {
    if (s !== inner && options.bubbleErrors) {
      s.on("error", inner.emit.bind(inner, "error"));
    }

    s = s.pipe(other);
  });

  return outer;
};
