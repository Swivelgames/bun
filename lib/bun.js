var stream = require("stream");

var bun = module.exports = function bun(options, streams) {
  if (Array.isArray(options)) {
    var tmp = streams;
    streams = options;
    options = tmp;
  }

  options = options || {};

  options.objectMode = true;

  var res = new stream.Transform(options);

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

      res.once("drain", function() {
        last.resume();
      });
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

  // this -> streams[0]
  res._transform = function _transform(input, encoding, done) {
    return first.write(input, done);
  };

  // this -> streams[0]
  res._flush = function _flush(done) {
    return first.end(done);
  };

  return res;
};
