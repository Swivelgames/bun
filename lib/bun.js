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

  options.bubbleErrors = !!options.bubbleErrors || (typeof options.bubbleErrors === "undefined");

  if (streams.length) {
    if (options.bubbleErrors) {
      for (var i=0;i<streams.length;++i) {
        streams[i].on("error", function(e) {
          return res.emit("error", e);
        });
      }
    }

    for (var i=0;i<streams.length-1;++i) {
      streams[i].pipe(streams[i+1]);
    }

    var first = streams[0],
        last = streams[streams.length-1];

    last.on("data", function(e) {
      if (!res.push(e)) {
        last.pause();

        res.once("drain", function() {
          last.resume();
        });
      }
    });

    last.on("end", function() {
      res.push(null);
    });

    first.on("finish", function() {
      res.end();
    });

    res._transform = function _transform(input, encoding, done) {
      return first.write(input, done);
    };

    res._flush = function _flush(done) {
      return first.end(done);
    };
  } else {
    res._transform = function _transform(input, encoding, done) {
      this.push(input);

      return done();
    };
  }

  return res;
};
