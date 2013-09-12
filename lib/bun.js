var stream = require("stream");

var bun = module.exports = function bun(options, streams) {
  if (Array.isArray(options)) {
    var tmp = streams;
    streams = options;
    options = tmp;
  }

  options = options || {};

  options.objectMode = true;

  var res = new stream.Duplex(options);

  // default to true
  options.bubbleErrors = !!options.bubbleErrors || (typeof options.bubbleErrors === "undefined");

  // special-case for no streams
  if (!streams.length) {
    res._transform = function _transform(input, encoding, done) {
      this.push(input);

      return done();
    };

    return res;
  }

  // error bubbling! yay!
  if (options.bubbleErrors) {
    for (var i=0;i<streams.length;++i) {
      streams[i].on("error", function(e) {
        return res.emit("error", e);
      });
    }
  }

  // 0 -> 1 -> ... -> n-1
  for (var i=0;i<streams.length-1;++i) {
    streams[i].pipe(streams[i+1]);
  }

  // these might actually be the same. that's ok.
  var first = streams[0],
      last = streams[streams.length-1];

  // .on("data") is supported again in 0.11 and has always worked in 0.10
  last.on("data", function(e) {
    if (!res.push(e)) {
      last.pause();
    }
  });

  // this is the readable side of our pipe ending
  last.on("end", function() {
    res.push(null);
  });

  // and here's the writable side finishing
  first.on("finish", function() {
    res.end();
  });

  // proxy through the .end() action
  res.on("finish", function() {
    first.end();
  });

  // this -> streams[0]
  res._write = function _write(input, encoding, done) {
    return first.write(input, done);
  };

  // when our buffer runs out, start up the chain again
  res._read = function _read(n) {
    last.resume();
  };

  return res;
};
