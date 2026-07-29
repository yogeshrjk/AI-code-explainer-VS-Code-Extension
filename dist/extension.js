"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/ws/lib/constants.js
var require_constants = __commonJS({
  "node_modules/ws/lib/constants.js"(exports2, module2) {
    "use strict";
    var BINARY_TYPES = ["nodebuffer", "arraybuffer", "fragments"];
    var hasBlob = typeof Blob !== "undefined";
    if (hasBlob) BINARY_TYPES.push("blob");
    module2.exports = {
      BINARY_TYPES,
      CLOSE_TIMEOUT: 3e4,
      EMPTY_BUFFER: Buffer.alloc(0),
      GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
      hasBlob,
      kForOnEventAttribute: Symbol("kIsForOnEventAttribute"),
      kListener: Symbol("kListener"),
      kStatusCode: Symbol("status-code"),
      kWebSocket: Symbol("websocket"),
      NOOP: () => {
      }
    };
  }
});

// node_modules/ws/lib/buffer-util.js
var require_buffer_util = __commonJS({
  "node_modules/ws/lib/buffer-util.js"(exports2, module2) {
    "use strict";
    var { EMPTY_BUFFER } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    function concat(list, totalLength) {
      if (list.length === 0) return EMPTY_BUFFER;
      if (list.length === 1) return list[0];
      const target = Buffer.allocUnsafe(totalLength);
      let offset = 0;
      for (let i = 0; i < list.length; i++) {
        const buf = list[i];
        target.set(buf, offset);
        offset += buf.length;
      }
      if (offset < totalLength) {
        return new FastBuffer(target.buffer, target.byteOffset, offset);
      }
      return target;
    }
    function _mask(source, mask, output, offset, length) {
      for (let i = 0; i < length; i++) {
        output[offset + i] = source[i] ^ mask[i & 3];
      }
    }
    function _unmask(buffer, mask) {
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] ^= mask[i & 3];
      }
    }
    function toArrayBuffer(buf) {
      if (buf.length === buf.buffer.byteLength) {
        return buf.buffer;
      }
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
    }
    function toBuffer(data) {
      toBuffer.readOnly = true;
      if (Buffer.isBuffer(data)) return data;
      let buf;
      if (data instanceof ArrayBuffer) {
        buf = new FastBuffer(data);
      } else if (ArrayBuffer.isView(data)) {
        buf = new FastBuffer(data.buffer, data.byteOffset, data.byteLength);
      } else {
        buf = Buffer.from(data);
        toBuffer.readOnly = false;
      }
      return buf;
    }
    module2.exports = {
      concat,
      mask: _mask,
      toArrayBuffer,
      toBuffer,
      unmask: _unmask
    };
    if (!process.env.WS_NO_BUFFER_UTIL) {
      try {
        const bufferUtil = require("bufferutil");
        module2.exports.mask = function(source, mask, output, offset, length) {
          if (length < 48) _mask(source, mask, output, offset, length);
          else bufferUtil.mask(source, mask, output, offset, length);
        };
        module2.exports.unmask = function(buffer, mask) {
          if (buffer.length < 32) _unmask(buffer, mask);
          else bufferUtil.unmask(buffer, mask);
        };
      } catch (e) {
      }
    }
  }
});

// node_modules/ws/lib/limiter.js
var require_limiter = __commonJS({
  "node_modules/ws/lib/limiter.js"(exports2, module2) {
    "use strict";
    var kDone = Symbol("kDone");
    var kRun = Symbol("kRun");
    var Limiter = class {
      /**
       * Creates a new `Limiter`.
       *
       * @param {Number} [concurrency=Infinity] The maximum number of jobs allowed
       *     to run concurrently
       */
      constructor(concurrency) {
        this[kDone] = () => {
          this.pending--;
          this[kRun]();
        };
        this.concurrency = concurrency || Infinity;
        this.jobs = [];
        this.pending = 0;
      }
      /**
       * Adds a job to the queue.
       *
       * @param {Function} job The job to run
       * @public
       */
      add(job) {
        this.jobs.push(job);
        this[kRun]();
      }
      /**
       * Removes a job from the queue and runs it if possible.
       *
       * @private
       */
      [kRun]() {
        if (this.pending === this.concurrency) return;
        if (this.jobs.length) {
          const job = this.jobs.shift();
          this.pending++;
          job(this[kDone]);
        }
      }
    };
    module2.exports = Limiter;
  }
});

// node_modules/ws/lib/permessage-deflate.js
var require_permessage_deflate = __commonJS({
  "node_modules/ws/lib/permessage-deflate.js"(exports2, module2) {
    "use strict";
    var zlib = require("zlib");
    var bufferUtil = require_buffer_util();
    var Limiter = require_limiter();
    var { kStatusCode } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    var TRAILER = Buffer.from([0, 0, 255, 255]);
    var kPerMessageDeflate = Symbol("permessage-deflate");
    var kTotalLength = Symbol("total-length");
    var kCallback = Symbol("callback");
    var kBuffers = Symbol("buffers");
    var kError = Symbol("error");
    var zlibLimiter;
    var PerMessageDeflate2 = class {
      /**
       * Creates a PerMessageDeflate instance.
       *
       * @param {Object} [options] Configuration options
       * @param {(Boolean|Number)} [options.clientMaxWindowBits] Advertise support
       *     for, or request, a custom client window size
       * @param {Boolean} [options.clientNoContextTakeover=false] Advertise/
       *     acknowledge disabling of client context takeover
       * @param {Number} [options.concurrencyLimit=10] The number of concurrent
       *     calls to zlib
       * @param {Boolean} [options.isServer=false] Create the instance in either
       *     server or client mode
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {(Boolean|Number)} [options.serverMaxWindowBits] Request/confirm the
       *     use of a custom server window size
       * @param {Boolean} [options.serverNoContextTakeover=false] Request/accept
       *     disabling of server context takeover
       * @param {Number} [options.threshold=1024] Size (in bytes) below which
       *     messages should not be compressed if context takeover is disabled
       * @param {Object} [options.zlibDeflateOptions] Options to pass to zlib on
       *     deflate
       * @param {Object} [options.zlibInflateOptions] Options to pass to zlib on
       *     inflate
       */
      constructor(options) {
        this._options = options || {};
        this._threshold = this._options.threshold !== void 0 ? this._options.threshold : 1024;
        this._maxPayload = this._options.maxPayload | 0;
        this._isServer = !!this._options.isServer;
        this._deflate = null;
        this._inflate = null;
        this.params = null;
        if (!zlibLimiter) {
          const concurrency = this._options.concurrencyLimit !== void 0 ? this._options.concurrencyLimit : 10;
          zlibLimiter = new Limiter(concurrency);
        }
      }
      /**
       * @type {String}
       */
      static get extensionName() {
        return "permessage-deflate";
      }
      /**
       * Create an extension negotiation offer.
       *
       * @return {Object} Extension parameters
       * @public
       */
      offer() {
        const params = {};
        if (this._options.serverNoContextTakeover) {
          params.server_no_context_takeover = true;
        }
        if (this._options.clientNoContextTakeover) {
          params.client_no_context_takeover = true;
        }
        if (this._options.serverMaxWindowBits) {
          params.server_max_window_bits = this._options.serverMaxWindowBits;
        }
        if (this._options.clientMaxWindowBits) {
          params.client_max_window_bits = this._options.clientMaxWindowBits;
        } else if (this._options.clientMaxWindowBits == null) {
          params.client_max_window_bits = true;
        }
        return params;
      }
      /**
       * Accept an extension negotiation offer/response.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Object} Accepted configuration
       * @public
       */
      accept(configurations) {
        configurations = this.normalizeParams(configurations);
        this.params = this._isServer ? this.acceptAsServer(configurations) : this.acceptAsClient(configurations);
        return this.params;
      }
      /**
       * Releases all resources used by the extension.
       *
       * @public
       */
      cleanup() {
        if (this._inflate) {
          this._inflate.close();
          this._inflate = null;
        }
        if (this._deflate) {
          const callback = this._deflate[kCallback];
          this._deflate.close();
          this._deflate = null;
          if (callback) {
            callback(
              new Error(
                "The deflate stream was closed while data was being processed"
              )
            );
          }
        }
      }
      /**
       *  Accept an extension negotiation offer.
       *
       * @param {Array} offers The extension negotiation offers
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsServer(offers) {
        const opts = this._options;
        const accepted = offers.find((params) => {
          if (opts.serverNoContextTakeover === false && params.server_no_context_takeover || params.server_max_window_bits && (opts.serverMaxWindowBits === false || typeof opts.serverMaxWindowBits === "number" && opts.serverMaxWindowBits > params.server_max_window_bits) || typeof opts.clientMaxWindowBits === "number" && !params.client_max_window_bits) {
            return false;
          }
          return true;
        });
        if (!accepted) {
          throw new Error("None of the extension offers can be accepted");
        }
        if (opts.serverNoContextTakeover) {
          accepted.server_no_context_takeover = true;
        }
        if (opts.clientNoContextTakeover) {
          accepted.client_no_context_takeover = true;
        }
        if (typeof opts.serverMaxWindowBits === "number") {
          accepted.server_max_window_bits = opts.serverMaxWindowBits;
        }
        if (typeof opts.clientMaxWindowBits === "number") {
          accepted.client_max_window_bits = opts.clientMaxWindowBits;
        } else if (accepted.client_max_window_bits === true || opts.clientMaxWindowBits === false) {
          delete accepted.client_max_window_bits;
        }
        return accepted;
      }
      /**
       * Accept the extension negotiation response.
       *
       * @param {Array} response The extension negotiation response
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsClient(response) {
        const params = response[0];
        if (this._options.clientNoContextTakeover === false && params.client_no_context_takeover) {
          throw new Error('Unexpected parameter "client_no_context_takeover"');
        }
        if (!params.client_max_window_bits) {
          if (typeof this._options.clientMaxWindowBits === "number") {
            params.client_max_window_bits = this._options.clientMaxWindowBits;
          }
        } else if (this._options.clientMaxWindowBits === false || typeof this._options.clientMaxWindowBits === "number" && params.client_max_window_bits > this._options.clientMaxWindowBits) {
          throw new Error(
            'Unexpected or invalid parameter "client_max_window_bits"'
          );
        }
        return params;
      }
      /**
       * Normalize parameters.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Array} The offers/response with normalized parameters
       * @private
       */
      normalizeParams(configurations) {
        configurations.forEach((params) => {
          Object.keys(params).forEach((key) => {
            let value = params[key];
            if (value.length > 1) {
              throw new Error(`Parameter "${key}" must have only a single value`);
            }
            value = value[0];
            if (key === "client_max_window_bits") {
              if (value !== true) {
                const num = +value;
                if (!Number.isInteger(num) || num < 8 || num > 15) {
                  throw new TypeError(
                    `Invalid value for parameter "${key}": ${value}`
                  );
                }
                value = num;
              } else if (!this._isServer) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else if (key === "server_max_window_bits") {
              const num = +value;
              if (!Number.isInteger(num) || num < 8 || num > 15) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
              value = num;
            } else if (key === "client_no_context_takeover" || key === "server_no_context_takeover") {
              if (value !== true) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else {
              throw new Error(`Unknown parameter "${key}"`);
            }
            params[key] = value;
          });
        });
        return configurations;
      }
      /**
       * Decompress data. Concurrency limited.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      decompress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._decompress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Compress data. Concurrency limited.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      compress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._compress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Decompress data.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _decompress(data, fin, callback) {
        const endpoint = this._isServer ? "client" : "server";
        if (!this._inflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._inflate = zlib.createInflateRaw({
            ...this._options.zlibInflateOptions,
            windowBits
          });
          this._inflate[kPerMessageDeflate] = this;
          this._inflate[kTotalLength] = 0;
          this._inflate[kBuffers] = [];
          this._inflate.on("error", inflateOnError);
          this._inflate.on("data", inflateOnData);
        }
        this._inflate[kCallback] = callback;
        this._inflate.write(data);
        if (fin) this._inflate.write(TRAILER);
        this._inflate.flush(() => {
          const err = this._inflate[kError];
          if (err) {
            this._inflate.close();
            this._inflate = null;
            callback(err);
            return;
          }
          const data2 = bufferUtil.concat(
            this._inflate[kBuffers],
            this._inflate[kTotalLength]
          );
          if (this._inflate._readableState.endEmitted) {
            this._inflate.close();
            this._inflate = null;
          } else {
            this._inflate[kTotalLength] = 0;
            this._inflate[kBuffers] = [];
            if (fin && this.params[`${endpoint}_no_context_takeover`]) {
              this._inflate.reset();
            }
          }
          callback(null, data2);
        });
      }
      /**
       * Compress data.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _compress(data, fin, callback) {
        const endpoint = this._isServer ? "server" : "client";
        if (!this._deflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._deflate = zlib.createDeflateRaw({
            ...this._options.zlibDeflateOptions,
            windowBits
          });
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          this._deflate.on("data", deflateOnData);
        }
        this._deflate[kCallback] = callback;
        this._deflate.write(data);
        this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
          if (!this._deflate) {
            return;
          }
          let data2 = bufferUtil.concat(
            this._deflate[kBuffers],
            this._deflate[kTotalLength]
          );
          if (fin) {
            data2 = new FastBuffer(data2.buffer, data2.byteOffset, data2.length - 4);
          }
          this._deflate[kCallback] = null;
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          if (fin && this.params[`${endpoint}_no_context_takeover`]) {
            this._deflate.reset();
          }
          callback(null, data2);
        });
      }
    };
    module2.exports = PerMessageDeflate2;
    function deflateOnData(chunk) {
      this[kBuffers].push(chunk);
      this[kTotalLength] += chunk.length;
    }
    function inflateOnData(chunk) {
      this[kTotalLength] += chunk.length;
      if (this[kPerMessageDeflate]._maxPayload < 1 || this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload) {
        this[kBuffers].push(chunk);
        return;
      }
      this[kError] = new RangeError("Max payload size exceeded");
      this[kError].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH";
      this[kError][kStatusCode] = 1009;
      this.removeListener("data", inflateOnData);
      this.reset();
    }
    function inflateOnError(err) {
      this[kPerMessageDeflate]._inflate = null;
      if (this[kError]) {
        this[kCallback](this[kError]);
        return;
      }
      err[kStatusCode] = 1007;
      this[kCallback](err);
    }
  }
});

// node_modules/ws/lib/validation.js
var require_validation = __commonJS({
  "node_modules/ws/lib/validation.js"(exports2, module2) {
    "use strict";
    var { isUtf8 } = require("buffer");
    var { hasBlob } = require_constants();
    var tokenChars = [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 0 - 15
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 16 - 31
      0,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      1,
      1,
      0,
      1,
      1,
      0,
      // 32 - 47
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      // 48 - 63
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 64 - 79
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      1,
      1,
      // 80 - 95
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 96 - 111
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      1,
      0,
      1,
      0
      // 112 - 127
    ];
    function isValidStatusCode(code) {
      return code >= 1e3 && code <= 1014 && code !== 1004 && code !== 1005 && code !== 1006 || code >= 3e3 && code <= 4999;
    }
    function _isValidUTF8(buf) {
      const len = buf.length;
      let i = 0;
      while (i < len) {
        if ((buf[i] & 128) === 0) {
          i++;
        } else if ((buf[i] & 224) === 192) {
          if (i + 1 === len || (buf[i + 1] & 192) !== 128 || (buf[i] & 254) === 192) {
            return false;
          }
          i += 2;
        } else if ((buf[i] & 240) === 224) {
          if (i + 2 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || buf[i] === 224 && (buf[i + 1] & 224) === 128 || // Overlong
          buf[i] === 237 && (buf[i + 1] & 224) === 160) {
            return false;
          }
          i += 3;
        } else if ((buf[i] & 248) === 240) {
          if (i + 3 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || (buf[i + 3] & 192) !== 128 || buf[i] === 240 && (buf[i + 1] & 240) === 128 || // Overlong
          buf[i] === 244 && buf[i + 1] > 143 || buf[i] > 244) {
            return false;
          }
          i += 4;
        } else {
          return false;
        }
      }
      return true;
    }
    function isBlob(value) {
      return hasBlob && typeof value === "object" && typeof value.arrayBuffer === "function" && typeof value.type === "string" && typeof value.stream === "function" && (value[Symbol.toStringTag] === "Blob" || value[Symbol.toStringTag] === "File");
    }
    module2.exports = {
      isBlob,
      isValidStatusCode,
      isValidUTF8: _isValidUTF8,
      tokenChars
    };
    if (isUtf8) {
      module2.exports.isValidUTF8 = function(buf) {
        return buf.length < 24 ? _isValidUTF8(buf) : isUtf8(buf);
      };
    } else if (!process.env.WS_NO_UTF_8_VALIDATE) {
      try {
        const isValidUTF8 = require("utf-8-validate");
        module2.exports.isValidUTF8 = function(buf) {
          return buf.length < 32 ? _isValidUTF8(buf) : isValidUTF8(buf);
        };
      } catch (e) {
      }
    }
  }
});

// node_modules/ws/lib/receiver.js
var require_receiver = __commonJS({
  "node_modules/ws/lib/receiver.js"(exports2, module2) {
    "use strict";
    var { Writable } = require("stream");
    var PerMessageDeflate2 = require_permessage_deflate();
    var {
      BINARY_TYPES,
      EMPTY_BUFFER,
      kStatusCode,
      kWebSocket
    } = require_constants();
    var { concat, toArrayBuffer, unmask } = require_buffer_util();
    var { isValidStatusCode, isValidUTF8 } = require_validation();
    var FastBuffer = Buffer[Symbol.species];
    var GET_INFO = 0;
    var GET_PAYLOAD_LENGTH_16 = 1;
    var GET_PAYLOAD_LENGTH_64 = 2;
    var GET_MASK = 3;
    var GET_DATA = 4;
    var INFLATING = 5;
    var DEFER_EVENT = 6;
    var Receiver2 = class extends Writable {
      /**
       * Creates a Receiver instance.
       *
       * @param {Object} [options] Options object
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {String} [options.binaryType=nodebuffer] The type for binary data
       * @param {Object} [options.extensions] An object containing the negotiated
       *     extensions
       * @param {Boolean} [options.isServer=false] Specifies whether to operate in
       *     client or server mode
       * @param {Number} [options.maxBufferedChunks=0] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=0] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       */
      constructor(options = {}) {
        super();
        this._allowSynchronousEvents = options.allowSynchronousEvents !== void 0 ? options.allowSynchronousEvents : true;
        this._binaryType = options.binaryType || BINARY_TYPES[0];
        this._extensions = options.extensions || {};
        this._isServer = !!options.isServer;
        this._maxBufferedChunks = options.maxBufferedChunks | 0;
        this._maxFragments = options.maxFragments | 0;
        this._maxPayload = options.maxPayload | 0;
        this._skipUTF8Validation = !!options.skipUTF8Validation;
        this[kWebSocket] = void 0;
        this._bufferedBytes = 0;
        this._buffers = [];
        this._compressed = false;
        this._payloadLength = 0;
        this._mask = void 0;
        this._fragmented = 0;
        this._masked = false;
        this._fin = false;
        this._opcode = 0;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._numFragments = 0;
        this._fragments = [];
        this._errored = false;
        this._loop = false;
        this._state = GET_INFO;
      }
      /**
       * Implements `Writable.prototype._write()`.
       *
       * @param {Buffer} chunk The chunk of data to write
       * @param {String} encoding The character encoding of `chunk`
       * @param {Function} cb Callback
       * @private
       */
      _write(chunk, encoding, cb) {
        if (this._opcode === 8 && this._state == GET_INFO) return cb();
        if (this._maxBufferedChunks > 0 && this._buffers.length >= this._maxBufferedChunks) {
          cb(
            this.createError(
              RangeError,
              "Too many buffered chunks",
              false,
              1008,
              "WS_ERR_TOO_MANY_BUFFERED_PARTS"
            )
          );
          return;
        }
        this._bufferedBytes += chunk.length;
        this._buffers.push(chunk);
        this.startLoop(cb);
      }
      /**
       * Consumes `n` bytes from the buffered data.
       *
       * @param {Number} n The number of bytes to consume
       * @return {Buffer} The consumed bytes
       * @private
       */
      consume(n) {
        this._bufferedBytes -= n;
        if (n === this._buffers[0].length) return this._buffers.shift();
        if (n < this._buffers[0].length) {
          const buf = this._buffers[0];
          this._buffers[0] = new FastBuffer(
            buf.buffer,
            buf.byteOffset + n,
            buf.length - n
          );
          return new FastBuffer(buf.buffer, buf.byteOffset, n);
        }
        const dst = Buffer.allocUnsafe(n);
        do {
          const buf = this._buffers[0];
          const offset = dst.length - n;
          if (n >= buf.length) {
            dst.set(this._buffers.shift(), offset);
          } else {
            dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
            this._buffers[0] = new FastBuffer(
              buf.buffer,
              buf.byteOffset + n,
              buf.length - n
            );
          }
          n -= buf.length;
        } while (n > 0);
        return dst;
      }
      /**
       * Starts the parsing loop.
       *
       * @param {Function} cb Callback
       * @private
       */
      startLoop(cb) {
        this._loop = true;
        do {
          switch (this._state) {
            case GET_INFO:
              this.getInfo(cb);
              break;
            case GET_PAYLOAD_LENGTH_16:
              this.getPayloadLength16(cb);
              break;
            case GET_PAYLOAD_LENGTH_64:
              this.getPayloadLength64(cb);
              break;
            case GET_MASK:
              this.getMask();
              break;
            case GET_DATA:
              this.getData(cb);
              break;
            case INFLATING:
            case DEFER_EVENT:
              this._loop = false;
              return;
          }
        } while (this._loop);
        if (!this._errored) cb();
      }
      /**
       * Reads the first two bytes of a frame.
       *
       * @param {Function} cb Callback
       * @private
       */
      getInfo(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        const buf = this.consume(2);
        if ((buf[0] & 48) !== 0) {
          const error = this.createError(
            RangeError,
            "RSV2 and RSV3 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_2_3"
          );
          cb(error);
          return;
        }
        const compressed = (buf[0] & 64) === 64;
        if (compressed && !this._extensions[PerMessageDeflate2.extensionName]) {
          const error = this.createError(
            RangeError,
            "RSV1 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_1"
          );
          cb(error);
          return;
        }
        this._fin = (buf[0] & 128) === 128;
        this._opcode = buf[0] & 15;
        this._payloadLength = buf[1] & 127;
        if (this._opcode === 0) {
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (!this._fragmented) {
            const error = this.createError(
              RangeError,
              "invalid opcode 0",
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._opcode = this._fragmented;
        } else if (this._opcode === 1 || this._opcode === 2) {
          if (this._fragmented) {
            const error = this.createError(
              RangeError,
              `invalid opcode ${this._opcode}`,
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._compressed = compressed;
        } else if (this._opcode > 7 && this._opcode < 11) {
          if (!this._fin) {
            const error = this.createError(
              RangeError,
              "FIN must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_FIN"
            );
            cb(error);
            return;
          }
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (this._payloadLength > 125 || this._opcode === 8 && this._payloadLength === 1) {
            const error = this.createError(
              RangeError,
              `invalid payload length ${this._payloadLength}`,
              true,
              1002,
              "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH"
            );
            cb(error);
            return;
          }
        } else {
          const error = this.createError(
            RangeError,
            `invalid opcode ${this._opcode}`,
            true,
            1002,
            "WS_ERR_INVALID_OPCODE"
          );
          cb(error);
          return;
        }
        if (!this._fin && !this._fragmented) this._fragmented = this._opcode;
        this._masked = (buf[1] & 128) === 128;
        if (this._isServer) {
          if (!this._masked) {
            const error = this.createError(
              RangeError,
              "MASK must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_MASK"
            );
            cb(error);
            return;
          }
        } else if (this._masked) {
          const error = this.createError(
            RangeError,
            "MASK must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_MASK"
          );
          cb(error);
          return;
        }
        if (this._payloadLength === 126) this._state = GET_PAYLOAD_LENGTH_16;
        else if (this._payloadLength === 127) this._state = GET_PAYLOAD_LENGTH_64;
        else this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+16).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength16(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        this._payloadLength = this.consume(2).readUInt16BE(0);
        this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+64).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength64(cb) {
        if (this._bufferedBytes < 8) {
          this._loop = false;
          return;
        }
        const buf = this.consume(8);
        const num = buf.readUInt32BE(0);
        if (num > Math.pow(2, 53 - 32) - 1) {
          const error = this.createError(
            RangeError,
            "Unsupported WebSocket frame: payload length > 2^53 - 1",
            false,
            1009,
            "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH"
          );
          cb(error);
          return;
        }
        this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
        this.haveLength(cb);
      }
      /**
       * Payload length has been read.
       *
       * @param {Function} cb Callback
       * @private
       */
      haveLength(cb) {
        if (this._payloadLength && this._opcode < 8) {
          this._totalPayloadLength += this._payloadLength;
          if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
            const error = this.createError(
              RangeError,
              "Max payload size exceeded",
              false,
              1009,
              "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
            );
            cb(error);
            return;
          }
        }
        if (this._masked) this._state = GET_MASK;
        else this._state = GET_DATA;
      }
      /**
       * Reads mask bytes.
       *
       * @private
       */
      getMask() {
        if (this._bufferedBytes < 4) {
          this._loop = false;
          return;
        }
        this._mask = this.consume(4);
        this._state = GET_DATA;
      }
      /**
       * Reads data bytes.
       *
       * @param {Function} cb Callback
       * @private
       */
      getData(cb) {
        let data = EMPTY_BUFFER;
        if (this._payloadLength) {
          if (this._bufferedBytes < this._payloadLength) {
            this._loop = false;
            return;
          }
          data = this.consume(this._payloadLength);
          if (this._masked && (this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3]) !== 0) {
            unmask(data, this._mask);
          }
        }
        if (this._opcode > 7) {
          this.controlMessage(data, cb);
          return;
        }
        if (this._maxFragments > 0 && ++this._numFragments > this._maxFragments) {
          const error = this.createError(
            RangeError,
            "Too many message fragments",
            false,
            1008,
            "WS_ERR_TOO_MANY_BUFFERED_PARTS"
          );
          cb(error);
          return;
        }
        if (this._compressed) {
          this._state = INFLATING;
          this.decompress(data, cb);
          return;
        }
        if (data.length) {
          this._messageLength = this._totalPayloadLength;
          this._fragments.push(data);
        }
        this.dataMessage(cb);
      }
      /**
       * Decompresses data.
       *
       * @param {Buffer} data Compressed data
       * @param {Function} cb Callback
       * @private
       */
      decompress(data, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        perMessageDeflate.decompress(data, this._fin, (err, buf) => {
          if (err) return cb(err);
          if (buf.length) {
            this._messageLength += buf.length;
            if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
              const error = this.createError(
                RangeError,
                "Max payload size exceeded",
                false,
                1009,
                "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
              );
              cb(error);
              return;
            }
            this._fragments.push(buf);
          }
          this.dataMessage(cb);
          if (this._state === GET_INFO) this.startLoop(cb);
        });
      }
      /**
       * Handles a data message.
       *
       * @param {Function} cb Callback
       * @private
       */
      dataMessage(cb) {
        if (!this._fin) {
          this._state = GET_INFO;
          return;
        }
        const messageLength = this._messageLength;
        const fragments = this._fragments;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._fragmented = 0;
        this._numFragments = 0;
        this._fragments = [];
        if (this._opcode === 2) {
          let data;
          if (this._binaryType === "nodebuffer") {
            data = concat(fragments, messageLength);
          } else if (this._binaryType === "arraybuffer") {
            data = toArrayBuffer(concat(fragments, messageLength));
          } else if (this._binaryType === "blob") {
            data = new Blob(fragments);
          } else {
            data = fragments;
          }
          if (this._allowSynchronousEvents) {
            this.emit("message", data, true);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", data, true);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        } else {
          const buf = concat(fragments, messageLength);
          if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
            const error = this.createError(
              Error,
              "invalid UTF-8 sequence",
              true,
              1007,
              "WS_ERR_INVALID_UTF8"
            );
            cb(error);
            return;
          }
          if (this._state === INFLATING || this._allowSynchronousEvents) {
            this.emit("message", buf, false);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", buf, false);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        }
      }
      /**
       * Handles a control message.
       *
       * @param {Buffer} data Data to handle
       * @return {(Error|RangeError|undefined)} A possible error
       * @private
       */
      controlMessage(data, cb) {
        if (this._opcode === 8) {
          if (data.length === 0) {
            this._loop = false;
            this.emit("conclude", 1005, EMPTY_BUFFER);
            this.end();
          } else {
            const code = data.readUInt16BE(0);
            if (!isValidStatusCode(code)) {
              const error = this.createError(
                RangeError,
                `invalid status code ${code}`,
                true,
                1002,
                "WS_ERR_INVALID_CLOSE_CODE"
              );
              cb(error);
              return;
            }
            const buf = new FastBuffer(
              data.buffer,
              data.byteOffset + 2,
              data.length - 2
            );
            if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
              const error = this.createError(
                Error,
                "invalid UTF-8 sequence",
                true,
                1007,
                "WS_ERR_INVALID_UTF8"
              );
              cb(error);
              return;
            }
            this._loop = false;
            this.emit("conclude", code, buf);
            this.end();
          }
          this._state = GET_INFO;
          return;
        }
        if (this._allowSynchronousEvents) {
          this.emit(this._opcode === 9 ? "ping" : "pong", data);
          this._state = GET_INFO;
        } else {
          this._state = DEFER_EVENT;
          setImmediate(() => {
            this.emit(this._opcode === 9 ? "ping" : "pong", data);
            this._state = GET_INFO;
            this.startLoop(cb);
          });
        }
      }
      /**
       * Builds an error object.
       *
       * @param {function(new:Error|RangeError)} ErrorCtor The error constructor
       * @param {String} message The error message
       * @param {Boolean} prefix Specifies whether or not to add a default prefix to
       *     `message`
       * @param {Number} statusCode The status code
       * @param {String} errorCode The exposed error code
       * @return {(Error|RangeError)} The error
       * @private
       */
      createError(ErrorCtor, message, prefix, statusCode, errorCode) {
        this._loop = false;
        this._errored = true;
        const err = new ErrorCtor(
          prefix ? `Invalid WebSocket frame: ${message}` : message
        );
        Error.captureStackTrace(err, this.createError);
        err.code = errorCode;
        err[kStatusCode] = statusCode;
        return err;
      }
    };
    module2.exports = Receiver2;
  }
});

// node_modules/ws/lib/sender.js
var require_sender = __commonJS({
  "node_modules/ws/lib/sender.js"(exports2, module2) {
    "use strict";
    var { Duplex } = require("stream");
    var { randomFillSync } = require("crypto");
    var {
      types: { isUint8Array }
    } = require("util");
    var PerMessageDeflate2 = require_permessage_deflate();
    var { EMPTY_BUFFER, kWebSocket, NOOP } = require_constants();
    var { isBlob, isValidStatusCode } = require_validation();
    var { mask: applyMask, toBuffer } = require_buffer_util();
    var kByteLength = Symbol("kByteLength");
    var maskBuffer = Buffer.alloc(4);
    var RANDOM_POOL_SIZE = 8 * 1024;
    var randomPool;
    var randomPoolPointer = RANDOM_POOL_SIZE;
    var DEFAULT = 0;
    var DEFLATING = 1;
    var GET_BLOB_DATA = 2;
    var Sender2 = class _Sender {
      /**
       * Creates a Sender instance.
       *
       * @param {Duplex} socket The connection socket
       * @param {Object} [extensions] An object containing the negotiated extensions
       * @param {Function} [generateMask] The function used to generate the masking
       *     key
       */
      constructor(socket, extensions, generateMask) {
        this._extensions = extensions || {};
        if (generateMask) {
          this._generateMask = generateMask;
          this._maskBuffer = Buffer.alloc(4);
        }
        this._socket = socket;
        this._firstFragment = true;
        this._compress = false;
        this._bufferedBytes = 0;
        this._queue = [];
        this._state = DEFAULT;
        this.onerror = NOOP;
        this[kWebSocket] = void 0;
      }
      /**
       * Frames a piece of data according to the HyBi WebSocket protocol.
       *
       * @param {(Buffer|String)} data The data to frame
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @return {(Buffer|String)[]} The framed data
       * @public
       */
      static frame(data, options) {
        let mask;
        let merge = false;
        let offset = 2;
        let skipMasking = false;
        if (options.mask) {
          mask = options.maskBuffer || maskBuffer;
          if (options.generateMask) {
            options.generateMask(mask);
          } else {
            if (randomPoolPointer === RANDOM_POOL_SIZE) {
              if (randomPool === void 0) {
                randomPool = Buffer.alloc(RANDOM_POOL_SIZE);
              }
              randomFillSync(randomPool, 0, RANDOM_POOL_SIZE);
              randomPoolPointer = 0;
            }
            mask[0] = randomPool[randomPoolPointer++];
            mask[1] = randomPool[randomPoolPointer++];
            mask[2] = randomPool[randomPoolPointer++];
            mask[3] = randomPool[randomPoolPointer++];
          }
          skipMasking = (mask[0] | mask[1] | mask[2] | mask[3]) === 0;
          offset = 6;
        }
        let dataLength;
        if (typeof data === "string") {
          if ((!options.mask || skipMasking) && options[kByteLength] !== void 0) {
            dataLength = options[kByteLength];
          } else {
            data = Buffer.from(data);
            dataLength = data.length;
          }
        } else {
          dataLength = data.length;
          merge = options.mask && options.readOnly && !skipMasking;
        }
        let payloadLength = dataLength;
        if (dataLength >= 65536) {
          offset += 8;
          payloadLength = 127;
        } else if (dataLength > 125) {
          offset += 2;
          payloadLength = 126;
        }
        const target = Buffer.allocUnsafe(merge ? dataLength + offset : offset);
        target[0] = options.fin ? options.opcode | 128 : options.opcode;
        if (options.rsv1) target[0] |= 64;
        target[1] = payloadLength;
        if (payloadLength === 126) {
          target.writeUInt16BE(dataLength, 2);
        } else if (payloadLength === 127) {
          target[2] = target[3] = 0;
          target.writeUIntBE(dataLength, 4, 6);
        }
        if (!options.mask) return [target, data];
        target[1] |= 128;
        target[offset - 4] = mask[0];
        target[offset - 3] = mask[1];
        target[offset - 2] = mask[2];
        target[offset - 1] = mask[3];
        if (skipMasking) return [target, data];
        if (merge) {
          applyMask(data, mask, target, offset, dataLength);
          return [target];
        }
        applyMask(data, mask, data, 0, dataLength);
        return [target, data];
      }
      /**
       * Sends a close message to the other peer.
       *
       * @param {Number} [code] The status code component of the body
       * @param {(String|Buffer)} [data] The message component of the body
       * @param {Boolean} [mask=false] Specifies whether or not to mask the message
       * @param {Function} [cb] Callback
       * @public
       */
      close(code, data, mask, cb) {
        let buf;
        if (code === void 0) {
          buf = EMPTY_BUFFER;
        } else if (typeof code !== "number" || !isValidStatusCode(code)) {
          throw new TypeError("First argument must be a valid error code number");
        } else if (data === void 0 || !data.length) {
          buf = Buffer.allocUnsafe(2);
          buf.writeUInt16BE(code, 0);
        } else {
          const length = Buffer.byteLength(data);
          if (length > 123) {
            throw new RangeError("The message must not be greater than 123 bytes");
          }
          buf = Buffer.allocUnsafe(2 + length);
          buf.writeUInt16BE(code, 0);
          if (typeof data === "string") {
            buf.write(data, 2);
          } else if (isUint8Array(data)) {
            buf.set(data, 2);
          } else {
            throw new TypeError("Second argument must be a string or a Uint8Array");
          }
        }
        const options = {
          [kByteLength]: buf.length,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 8,
          readOnly: false,
          rsv1: false
        };
        if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, buf, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(buf, options), cb);
        }
      }
      /**
       * Sends a ping message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      ping(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 9,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a pong message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      pong(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 10,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a data message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Object} options Options object
       * @param {Boolean} [options.binary=false] Specifies whether `data` is binary
       *     or text
       * @param {Boolean} [options.compress=false] Specifies whether or not to
       *     compress `data`
       * @param {Boolean} [options.fin=false] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Function} [cb] Callback
       * @public
       */
      send(data, options, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        let opcode = options.binary ? 2 : 1;
        let rsv1 = options.compress;
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (this._firstFragment) {
          this._firstFragment = false;
          if (rsv1 && perMessageDeflate && perMessageDeflate.params[perMessageDeflate._isServer ? "server_no_context_takeover" : "client_no_context_takeover"]) {
            rsv1 = byteLength >= perMessageDeflate._threshold;
          }
          this._compress = rsv1;
        } else {
          rsv1 = false;
          opcode = 0;
        }
        if (options.fin) this._firstFragment = true;
        const opts = {
          [kByteLength]: byteLength,
          fin: options.fin,
          generateMask: this._generateMask,
          mask: options.mask,
          maskBuffer: this._maskBuffer,
          opcode,
          readOnly,
          rsv1
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, this._compress, opts, cb]);
          } else {
            this.getBlobData(data, this._compress, opts, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, this._compress, opts, cb]);
        } else {
          this.dispatch(data, this._compress, opts, cb);
        }
      }
      /**
       * Gets the contents of a blob as binary data.
       *
       * @param {Blob} blob The blob
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     the data
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      getBlobData(blob, compress, options, cb) {
        this._bufferedBytes += options[kByteLength];
        this._state = GET_BLOB_DATA;
        blob.arrayBuffer().then((arrayBuffer) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while the blob was being read"
            );
            process.nextTick(callCallbacks, this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          const data = toBuffer(arrayBuffer);
          if (!compress) {
            this._state = DEFAULT;
            this.sendFrame(_Sender.frame(data, options), cb);
            this.dequeue();
          } else {
            this.dispatch(data, compress, options, cb);
          }
        }).catch((err) => {
          process.nextTick(onError, this, err, cb);
        });
      }
      /**
       * Dispatches a message.
       *
       * @param {(Buffer|String)} data The message to send
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     `data`
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      dispatch(data, compress, options, cb) {
        if (!compress) {
          this.sendFrame(_Sender.frame(data, options), cb);
          return;
        }
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        this._bufferedBytes += options[kByteLength];
        this._state = DEFLATING;
        perMessageDeflate.compress(data, options.fin, (_, buf) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while data was being compressed"
            );
            callCallbacks(this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          this._state = DEFAULT;
          options.readOnly = false;
          this.sendFrame(_Sender.frame(buf, options), cb);
          this.dequeue();
        });
      }
      /**
       * Executes queued send operations.
       *
       * @private
       */
      dequeue() {
        while (this._state === DEFAULT && this._queue.length) {
          const params = this._queue.shift();
          this._bufferedBytes -= params[3][kByteLength];
          Reflect.apply(params[0], this, params.slice(1));
        }
      }
      /**
       * Enqueues a send operation.
       *
       * @param {Array} params Send operation parameters.
       * @private
       */
      enqueue(params) {
        this._bufferedBytes += params[3][kByteLength];
        this._queue.push(params);
      }
      /**
       * Sends a frame.
       *
       * @param {(Buffer | String)[]} list The frame to send
       * @param {Function} [cb] Callback
       * @private
       */
      sendFrame(list, cb) {
        if (list.length === 2) {
          this._socket.cork();
          this._socket.write(list[0]);
          this._socket.write(list[1], cb);
          this._socket.uncork();
        } else {
          this._socket.write(list[0], cb);
        }
      }
    };
    module2.exports = Sender2;
    function callCallbacks(sender, err, cb) {
      if (typeof cb === "function") cb(err);
      for (let i = 0; i < sender._queue.length; i++) {
        const params = sender._queue[i];
        const callback = params[params.length - 1];
        if (typeof callback === "function") callback(err);
      }
    }
    function onError(sender, err, cb) {
      callCallbacks(sender, err, cb);
      sender.onerror(err);
    }
  }
});

// node_modules/ws/lib/event-target.js
var require_event_target = __commonJS({
  "node_modules/ws/lib/event-target.js"(exports2, module2) {
    "use strict";
    var { kForOnEventAttribute, kListener } = require_constants();
    var kCode = Symbol("kCode");
    var kData = Symbol("kData");
    var kError = Symbol("kError");
    var kMessage = Symbol("kMessage");
    var kReason = Symbol("kReason");
    var kTarget = Symbol("kTarget");
    var kType = Symbol("kType");
    var kWasClean = Symbol("kWasClean");
    var Event = class {
      /**
       * Create a new `Event`.
       *
       * @param {String} type The name of the event
       * @throws {TypeError} If the `type` argument is not specified
       */
      constructor(type) {
        this[kTarget] = null;
        this[kType] = type;
      }
      /**
       * @type {*}
       */
      get target() {
        return this[kTarget];
      }
      /**
       * @type {String}
       */
      get type() {
        return this[kType];
      }
    };
    Object.defineProperty(Event.prototype, "target", { enumerable: true });
    Object.defineProperty(Event.prototype, "type", { enumerable: true });
    var CloseEvent = class extends Event {
      /**
       * Create a new `CloseEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {Number} [options.code=0] The status code explaining why the
       *     connection was closed
       * @param {String} [options.reason=''] A human-readable string explaining why
       *     the connection was closed
       * @param {Boolean} [options.wasClean=false] Indicates whether or not the
       *     connection was cleanly closed
       */
      constructor(type, options = {}) {
        super(type);
        this[kCode] = options.code === void 0 ? 0 : options.code;
        this[kReason] = options.reason === void 0 ? "" : options.reason;
        this[kWasClean] = options.wasClean === void 0 ? false : options.wasClean;
      }
      /**
       * @type {Number}
       */
      get code() {
        return this[kCode];
      }
      /**
       * @type {String}
       */
      get reason() {
        return this[kReason];
      }
      /**
       * @type {Boolean}
       */
      get wasClean() {
        return this[kWasClean];
      }
    };
    Object.defineProperty(CloseEvent.prototype, "code", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "reason", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "wasClean", { enumerable: true });
    var ErrorEvent = class extends Event {
      /**
       * Create a new `ErrorEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.error=null] The error that generated this event
       * @param {String} [options.message=''] The error message
       */
      constructor(type, options = {}) {
        super(type);
        this[kError] = options.error === void 0 ? null : options.error;
        this[kMessage] = options.message === void 0 ? "" : options.message;
      }
      /**
       * @type {*}
       */
      get error() {
        return this[kError];
      }
      /**
       * @type {String}
       */
      get message() {
        return this[kMessage];
      }
    };
    Object.defineProperty(ErrorEvent.prototype, "error", { enumerable: true });
    Object.defineProperty(ErrorEvent.prototype, "message", { enumerable: true });
    var MessageEvent = class extends Event {
      /**
       * Create a new `MessageEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.data=null] The message content
       */
      constructor(type, options = {}) {
        super(type);
        this[kData] = options.data === void 0 ? null : options.data;
      }
      /**
       * @type {*}
       */
      get data() {
        return this[kData];
      }
    };
    Object.defineProperty(MessageEvent.prototype, "data", { enumerable: true });
    var EventTarget = {
      /**
       * Register an event listener.
       *
       * @param {String} type A string representing the event type to listen for
       * @param {(Function|Object)} handler The listener to add
       * @param {Object} [options] An options object specifies characteristics about
       *     the event listener
       * @param {Boolean} [options.once=false] A `Boolean` indicating that the
       *     listener should be invoked at most once after being added. If `true`,
       *     the listener would be automatically removed when invoked.
       * @public
       */
      addEventListener(type, handler, options = {}) {
        for (const listener of this.listeners(type)) {
          if (!options[kForOnEventAttribute] && listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            return;
          }
        }
        let wrapper;
        if (type === "message") {
          wrapper = function onMessage(data, isBinary) {
            const event = new MessageEvent("message", {
              data: isBinary ? data : data.toString()
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "close") {
          wrapper = function onClose(code, message) {
            const event = new CloseEvent("close", {
              code,
              reason: message.toString(),
              wasClean: this._closeFrameReceived && this._closeFrameSent
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "error") {
          wrapper = function onError(error) {
            const event = new ErrorEvent("error", {
              error,
              message: error.message
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "open") {
          wrapper = function onOpen() {
            const event = new Event("open");
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else {
          return;
        }
        wrapper[kForOnEventAttribute] = !!options[kForOnEventAttribute];
        wrapper[kListener] = handler;
        if (options.once) {
          this.once(type, wrapper);
        } else {
          this.on(type, wrapper);
        }
      },
      /**
       * Remove an event listener.
       *
       * @param {String} type A string representing the event type to remove
       * @param {(Function|Object)} handler The listener to remove
       * @public
       */
      removeEventListener(type, handler) {
        for (const listener of this.listeners(type)) {
          if (listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            this.removeListener(type, listener);
            break;
          }
        }
      }
    };
    module2.exports = {
      CloseEvent,
      ErrorEvent,
      Event,
      EventTarget,
      MessageEvent
    };
    function callListener(listener, thisArg, event) {
      if (typeof listener === "object" && listener.handleEvent) {
        listener.handleEvent.call(listener, event);
      } else {
        listener.call(thisArg, event);
      }
    }
  }
});

// node_modules/ws/lib/extension.js
var require_extension = __commonJS({
  "node_modules/ws/lib/extension.js"(exports2, module2) {
    "use strict";
    var { tokenChars } = require_validation();
    function push(dest, name, elem) {
      if (dest[name] === void 0) dest[name] = [elem];
      else dest[name].push(elem);
    }
    function parse(header) {
      const offers = /* @__PURE__ */ Object.create(null);
      let params = /* @__PURE__ */ Object.create(null);
      let mustUnescape = false;
      let isEscaping = false;
      let inQuotes = false;
      let extensionName;
      let paramName;
      let start = -1;
      let code = -1;
      let end = -1;
      let i = 0;
      for (; i < header.length; i++) {
        code = header.charCodeAt(i);
        if (extensionName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (i !== 0 && (code === 32 || code === 9)) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            const name = header.slice(start, end);
            if (code === 44) {
              push(offers, name, params);
              params = /* @__PURE__ */ Object.create(null);
            } else {
              extensionName = name;
            }
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else if (paramName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (code === 32 || code === 9) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            push(params, header.slice(start, end), true);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            start = end = -1;
          } else if (code === 61 && start !== -1 && end === -1) {
            paramName = header.slice(start, i);
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else {
          if (isEscaping) {
            if (tokenChars[code] !== 1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (start === -1) start = i;
            else if (!mustUnescape) mustUnescape = true;
            isEscaping = false;
          } else if (inQuotes) {
            if (tokenChars[code] === 1) {
              if (start === -1) start = i;
            } else if (code === 34 && start !== -1) {
              inQuotes = false;
              end = i;
            } else if (code === 92) {
              isEscaping = true;
            } else {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
          } else if (code === 34 && header.charCodeAt(i - 1) === 61) {
            inQuotes = true;
          } else if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (start !== -1 && (code === 32 || code === 9)) {
            if (end === -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            let value = header.slice(start, end);
            if (mustUnescape) {
              value = value.replace(/\\/g, "");
              mustUnescape = false;
            }
            push(params, paramName, value);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            paramName = void 0;
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        }
      }
      if (start === -1 || inQuotes || code === 32 || code === 9) {
        throw new SyntaxError("Unexpected end of input");
      }
      if (end === -1) end = i;
      const token = header.slice(start, end);
      if (extensionName === void 0) {
        push(offers, token, params);
      } else {
        if (paramName === void 0) {
          push(params, token, true);
        } else if (mustUnescape) {
          push(params, paramName, token.replace(/\\/g, ""));
        } else {
          push(params, paramName, token);
        }
        push(offers, extensionName, params);
      }
      return offers;
    }
    function format(extensions) {
      return Object.keys(extensions).map((extension2) => {
        let configurations = extensions[extension2];
        if (!Array.isArray(configurations)) configurations = [configurations];
        return configurations.map((params) => {
          return [extension2].concat(
            Object.keys(params).map((k) => {
              let values = params[k];
              if (!Array.isArray(values)) values = [values];
              return values.map((v) => v === true ? k : `${k}=${v}`).join("; ");
            })
          ).join("; ");
        }).join(", ");
      }).join(", ");
    }
    module2.exports = { format, parse };
  }
});

// node_modules/ws/lib/websocket.js
var require_websocket = __commonJS({
  "node_modules/ws/lib/websocket.js"(exports2, module2) {
    "use strict";
    var EventEmitter = require("events");
    var https = require("https");
    var http = require("http");
    var net = require("net");
    var tls = require("tls");
    var { randomBytes: randomBytes2, createHash } = require("crypto");
    var { Duplex, Readable } = require("stream");
    var { URL } = require("url");
    var PerMessageDeflate2 = require_permessage_deflate();
    var Receiver2 = require_receiver();
    var Sender2 = require_sender();
    var { isBlob } = require_validation();
    var {
      BINARY_TYPES,
      CLOSE_TIMEOUT,
      EMPTY_BUFFER,
      GUID,
      kForOnEventAttribute,
      kListener,
      kStatusCode,
      kWebSocket,
      NOOP
    } = require_constants();
    var {
      EventTarget: { addEventListener, removeEventListener }
    } = require_event_target();
    var { format, parse } = require_extension();
    var { toBuffer } = require_buffer_util();
    var kAborted = Symbol("kAborted");
    var protocolVersions = [8, 13];
    var readyStates = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
    var subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;
    var WebSocket2 = class _WebSocket extends EventEmitter {
      /**
       * Create a new `WebSocket`.
       *
       * @param {(String|URL)} address The URL to which to connect
       * @param {(String|String[])} [protocols] The subprotocols
       * @param {Object} [options] Connection options
       */
      constructor(address, protocols, options) {
        super();
        this._binaryType = BINARY_TYPES[0];
        this._closeCode = 1006;
        this._closeFrameReceived = false;
        this._closeFrameSent = false;
        this._closeMessage = EMPTY_BUFFER;
        this._closeTimer = null;
        this._errorEmitted = false;
        this._extensions = {};
        this._paused = false;
        this._protocol = "";
        this._readyState = _WebSocket.CONNECTING;
        this._receiver = null;
        this._sender = null;
        this._socket = null;
        if (address !== null) {
          this._bufferedAmount = 0;
          this._isServer = false;
          this._redirects = 0;
          if (protocols === void 0) {
            protocols = [];
          } else if (!Array.isArray(protocols)) {
            if (typeof protocols === "object" && protocols !== null) {
              options = protocols;
              protocols = [];
            } else {
              protocols = [protocols];
            }
          }
          initAsClient(this, address, protocols, options);
        } else {
          this._autoPong = options.autoPong;
          this._closeTimeout = options.closeTimeout;
          this._isServer = true;
        }
      }
      /**
       * For historical reasons, the custom "nodebuffer" type is used by the default
       * instead of "blob".
       *
       * @type {String}
       */
      get binaryType() {
        return this._binaryType;
      }
      set binaryType(type) {
        if (!BINARY_TYPES.includes(type)) return;
        this._binaryType = type;
        if (this._receiver) this._receiver._binaryType = type;
      }
      /**
       * @type {Number}
       */
      get bufferedAmount() {
        if (!this._socket) return this._bufferedAmount;
        return this._socket._writableState.length + this._sender._bufferedBytes;
      }
      /**
       * @type {String}
       */
      get extensions() {
        return Object.keys(this._extensions).join();
      }
      /**
       * @type {Boolean}
       */
      get isPaused() {
        return this._paused;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onclose() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onerror() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onopen() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onmessage() {
        return null;
      }
      /**
       * @type {String}
       */
      get protocol() {
        return this._protocol;
      }
      /**
       * @type {Number}
       */
      get readyState() {
        return this._readyState;
      }
      /**
       * @type {String}
       */
      get url() {
        return this._url;
      }
      /**
       * Set up the socket and the internal resources.
       *
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Object} options Options object
       * @param {Boolean} [options.allowSynchronousEvents=false] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Number} [options.maxBufferedChunks=0] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=0] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=0] The maximum allowed message size
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @private
       */
      setSocket(socket, head, options) {
        const receiver = new Receiver2({
          allowSynchronousEvents: options.allowSynchronousEvents,
          binaryType: this.binaryType,
          extensions: this._extensions,
          isServer: this._isServer,
          maxBufferedChunks: options.maxBufferedChunks,
          maxFragments: options.maxFragments,
          maxPayload: options.maxPayload,
          skipUTF8Validation: options.skipUTF8Validation
        });
        const sender = new Sender2(socket, this._extensions, options.generateMask);
        this._receiver = receiver;
        this._sender = sender;
        this._socket = socket;
        receiver[kWebSocket] = this;
        sender[kWebSocket] = this;
        socket[kWebSocket] = this;
        receiver.on("conclude", receiverOnConclude);
        receiver.on("drain", receiverOnDrain);
        receiver.on("error", receiverOnError);
        receiver.on("message", receiverOnMessage);
        receiver.on("ping", receiverOnPing);
        receiver.on("pong", receiverOnPong);
        sender.onerror = senderOnError;
        if (socket.setTimeout) socket.setTimeout(0);
        if (socket.setNoDelay) socket.setNoDelay();
        if (head.length > 0) socket.unshift(head);
        socket.on("close", socketOnClose);
        socket.on("data", socketOnData);
        socket.on("end", socketOnEnd);
        socket.on("error", socketOnError);
        this._readyState = _WebSocket.OPEN;
        this.emit("open");
      }
      /**
       * Emit the `'close'` event.
       *
       * @private
       */
      emitClose() {
        if (!this._socket) {
          this._readyState = _WebSocket.CLOSED;
          this.emit("close", this._closeCode, this._closeMessage);
          return;
        }
        if (this._extensions[PerMessageDeflate2.extensionName]) {
          this._extensions[PerMessageDeflate2.extensionName].cleanup();
        }
        this._receiver.removeAllListeners();
        this._readyState = _WebSocket.CLOSED;
        this.emit("close", this._closeCode, this._closeMessage);
      }
      /**
       * Start a closing handshake.
       *
       *          +----------+   +-----------+   +----------+
       *     - - -|ws.close()|-->|close frame|-->|ws.close()|- - -
       *    |     +----------+   +-----------+   +----------+     |
       *          +----------+   +-----------+         |
       * CLOSING  |ws.close()|<--|close frame|<--+-----+       CLOSING
       *          +----------+   +-----------+   |
       *    |           |                        |   +---+        |
       *                +------------------------+-->|fin| - - - -
       *    |         +---+                      |   +---+
       *     - - - - -|fin|<---------------------+
       *              +---+
       *
       * @param {Number} [code] Status code explaining why the connection is closing
       * @param {(String|Buffer)} [data] The reason why the connection is
       *     closing
       * @public
       */
      close(code, data) {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this.readyState === _WebSocket.CLOSING) {
          if (this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted)) {
            this._socket.end();
          }
          return;
        }
        this._readyState = _WebSocket.CLOSING;
        this._sender.close(code, data, !this._isServer, (err) => {
          if (err) return;
          this._closeFrameSent = true;
          if (this._closeFrameReceived || this._receiver._writableState.errorEmitted) {
            this._socket.end();
          }
        });
        setCloseTimer(this);
      }
      /**
       * Pause the socket.
       *
       * @public
       */
      pause() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = true;
        this._socket.pause();
      }
      /**
       * Send a ping.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the ping is sent
       * @public
       */
      ping(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.ping(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Send a pong.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the pong is sent
       * @public
       */
      pong(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.pong(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Resume the socket.
       *
       * @public
       */
      resume() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = false;
        if (!this._receiver._writableState.needDrain) this._socket.resume();
      }
      /**
       * Send a data message.
       *
       * @param {*} data The message to send
       * @param {Object} [options] Options object
       * @param {Boolean} [options.binary] Specifies whether `data` is binary or
       *     text
       * @param {Boolean} [options.compress] Specifies whether or not to compress
       *     `data`
       * @param {Boolean} [options.fin=true] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when data is written out
       * @public
       */
      send(data, options, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof options === "function") {
          cb = options;
          options = {};
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        const opts = {
          binary: typeof data !== "string",
          mask: !this._isServer,
          compress: true,
          fin: true,
          ...options
        };
        if (!this._extensions[PerMessageDeflate2.extensionName]) {
          opts.compress = false;
        }
        this._sender.send(data || EMPTY_BUFFER, opts, cb);
      }
      /**
       * Forcibly close the connection.
       *
       * @public
       */
      terminate() {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this._socket) {
          this._readyState = _WebSocket.CLOSING;
          this._socket.destroy();
        }
      }
    };
    Object.defineProperty(WebSocket2, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket2.prototype, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket2, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket2.prototype, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket2, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket2.prototype, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket2, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    Object.defineProperty(WebSocket2.prototype, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    [
      "binaryType",
      "bufferedAmount",
      "extensions",
      "isPaused",
      "protocol",
      "readyState",
      "url"
    ].forEach((property) => {
      Object.defineProperty(WebSocket2.prototype, property, { enumerable: true });
    });
    ["open", "error", "close", "message"].forEach((method) => {
      Object.defineProperty(WebSocket2.prototype, `on${method}`, {
        enumerable: true,
        get() {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) return listener[kListener];
          }
          return null;
        },
        set(handler) {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) {
              this.removeListener(method, listener);
              break;
            }
          }
          if (typeof handler !== "function") return;
          this.addEventListener(method, handler, {
            [kForOnEventAttribute]: true
          });
        }
      });
    });
    WebSocket2.prototype.addEventListener = addEventListener;
    WebSocket2.prototype.removeEventListener = removeEventListener;
    module2.exports = WebSocket2;
    function initAsClient(websocket, address, protocols, options) {
      const opts = {
        allowSynchronousEvents: true,
        autoPong: true,
        closeTimeout: CLOSE_TIMEOUT,
        protocolVersion: protocolVersions[1],
        maxBufferedChunks: 256 * 1024,
        maxFragments: 16 * 1024,
        maxPayload: 100 * 1024 * 1024,
        skipUTF8Validation: false,
        perMessageDeflate: true,
        followRedirects: false,
        maxRedirects: 10,
        ...options,
        socketPath: void 0,
        hostname: void 0,
        protocol: void 0,
        timeout: void 0,
        method: "GET",
        host: void 0,
        path: void 0,
        port: void 0
      };
      websocket._autoPong = opts.autoPong;
      websocket._closeTimeout = opts.closeTimeout;
      if (!protocolVersions.includes(opts.protocolVersion)) {
        throw new RangeError(
          `Unsupported protocol version: ${opts.protocolVersion} (supported versions: ${protocolVersions.join(", ")})`
        );
      }
      let parsedUrl;
      if (address instanceof URL) {
        parsedUrl = address;
      } else {
        try {
          parsedUrl = new URL(address);
        } catch {
          throw new SyntaxError(`Invalid URL: ${address}`);
        }
      }
      if (parsedUrl.protocol === "http:") {
        parsedUrl.protocol = "ws:";
      } else if (parsedUrl.protocol === "https:") {
        parsedUrl.protocol = "wss:";
      }
      websocket._url = parsedUrl.href;
      const isSecure = parsedUrl.protocol === "wss:";
      const isIpcUrl = parsedUrl.protocol === "ws+unix:";
      let invalidUrlMessage;
      if (parsedUrl.protocol !== "ws:" && !isSecure && !isIpcUrl) {
        invalidUrlMessage = `The URL's protocol must be one of "ws:", "wss:", "http:", "https:", or "ws+unix:"`;
      } else if (isIpcUrl && !parsedUrl.pathname) {
        invalidUrlMessage = "The URL's pathname is empty";
      } else if (parsedUrl.hash) {
        invalidUrlMessage = "The URL contains a fragment identifier";
      }
      if (invalidUrlMessage) {
        const err = new SyntaxError(invalidUrlMessage);
        if (websocket._redirects === 0) {
          throw err;
        } else {
          emitErrorAndClose(websocket, err);
          return;
        }
      }
      const defaultPort = isSecure ? 443 : 80;
      const key = randomBytes2(16).toString("base64");
      const request = isSecure ? https.request : http.request;
      const protocolSet = /* @__PURE__ */ new Set();
      let perMessageDeflate;
      opts.createConnection = opts.createConnection || (isSecure ? tlsConnect : netConnect);
      opts.defaultPort = opts.defaultPort || defaultPort;
      opts.port = parsedUrl.port || defaultPort;
      opts.host = parsedUrl.hostname.startsWith("[") ? parsedUrl.hostname.slice(1, -1) : parsedUrl.hostname;
      opts.headers = {
        ...opts.headers,
        "Sec-WebSocket-Version": opts.protocolVersion,
        "Sec-WebSocket-Key": key,
        Connection: "Upgrade",
        Upgrade: "websocket"
      };
      opts.path = parsedUrl.pathname + parsedUrl.search;
      opts.timeout = opts.handshakeTimeout;
      if (opts.perMessageDeflate) {
        perMessageDeflate = new PerMessageDeflate2({
          ...opts.perMessageDeflate,
          isServer: false,
          maxPayload: opts.maxPayload
        });
        opts.headers["Sec-WebSocket-Extensions"] = format({
          [PerMessageDeflate2.extensionName]: perMessageDeflate.offer()
        });
      }
      if (protocols.length) {
        for (const protocol of protocols) {
          if (typeof protocol !== "string" || !subprotocolRegex.test(protocol) || protocolSet.has(protocol)) {
            throw new SyntaxError(
              "An invalid or duplicated subprotocol was specified"
            );
          }
          protocolSet.add(protocol);
        }
        opts.headers["Sec-WebSocket-Protocol"] = protocols.join(",");
      }
      if (opts.origin) {
        if (opts.protocolVersion < 13) {
          opts.headers["Sec-WebSocket-Origin"] = opts.origin;
        } else {
          opts.headers.Origin = opts.origin;
        }
      }
      if (parsedUrl.username || parsedUrl.password) {
        opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
      }
      if (isIpcUrl) {
        const parts = opts.path.split(":");
        opts.socketPath = parts[0];
        opts.path = parts[1];
      }
      let req;
      if (opts.followRedirects) {
        if (websocket._redirects === 0) {
          websocket._originalIpc = isIpcUrl;
          websocket._originalSecure = isSecure;
          websocket._originalHostOrSocketPath = isIpcUrl ? opts.socketPath : parsedUrl.host;
          const headers = options && options.headers;
          options = { ...options, headers: {} };
          if (headers) {
            for (const [key2, value] of Object.entries(headers)) {
              options.headers[key2.toLowerCase()] = value;
            }
          }
        } else if (websocket.listenerCount("redirect") === 0) {
          const isSameHost = isIpcUrl ? websocket._originalIpc ? opts.socketPath === websocket._originalHostOrSocketPath : false : websocket._originalIpc ? false : parsedUrl.host === websocket._originalHostOrSocketPath;
          if (!isSameHost || websocket._originalSecure && !isSecure) {
            delete opts.headers.authorization;
            delete opts.headers.cookie;
            if (!isSameHost) delete opts.headers.host;
            opts.auth = void 0;
          }
        }
        if (opts.auth && !options.headers.authorization) {
          options.headers.authorization = "Basic " + Buffer.from(opts.auth).toString("base64");
        }
        req = websocket._req = request(opts);
        if (websocket._redirects) {
          websocket.emit("redirect", websocket.url, req);
        }
      } else {
        req = websocket._req = request(opts);
      }
      if (opts.timeout) {
        req.on("timeout", () => {
          abortHandshake(websocket, req, "Opening handshake has timed out");
        });
      }
      req.on("error", (err) => {
        if (req === null || req[kAborted]) return;
        req = websocket._req = null;
        emitErrorAndClose(websocket, err);
      });
      req.on("response", (res) => {
        const location = res.headers.location;
        const statusCode = res.statusCode;
        if (location && opts.followRedirects && statusCode >= 300 && statusCode < 400) {
          if (++websocket._redirects > opts.maxRedirects) {
            abortHandshake(websocket, req, "Maximum redirects exceeded");
            return;
          }
          req.abort();
          let addr;
          try {
            addr = new URL(location, address);
          } catch (e) {
            const err = new SyntaxError(`Invalid URL: ${location}`);
            emitErrorAndClose(websocket, err);
            return;
          }
          initAsClient(websocket, addr, protocols, options);
        } else if (!websocket.emit("unexpected-response", req, res)) {
          abortHandshake(
            websocket,
            req,
            `Unexpected server response: ${res.statusCode}`
          );
        }
      });
      req.on("upgrade", (res, socket, head) => {
        websocket.emit("upgrade", res);
        if (websocket.readyState !== WebSocket2.CONNECTING) return;
        req = websocket._req = null;
        const upgrade = res.headers.upgrade;
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          abortHandshake(websocket, socket, "Invalid Upgrade header");
          return;
        }
        const digest = createHash("sha1").update(key + GUID).digest("base64");
        if (res.headers["sec-websocket-accept"] !== digest) {
          abortHandshake(websocket, socket, "Invalid Sec-WebSocket-Accept header");
          return;
        }
        const serverProt = res.headers["sec-websocket-protocol"];
        let protError;
        if (serverProt !== void 0) {
          if (!protocolSet.size) {
            protError = "Server sent a subprotocol but none was requested";
          } else if (!protocolSet.has(serverProt)) {
            protError = "Server sent an invalid subprotocol";
          }
        } else if (protocolSet.size) {
          protError = "Server sent no subprotocol";
        }
        if (protError) {
          abortHandshake(websocket, socket, protError);
          return;
        }
        if (serverProt) websocket._protocol = serverProt;
        const secWebSocketExtensions = res.headers["sec-websocket-extensions"];
        if (secWebSocketExtensions !== void 0) {
          if (!perMessageDeflate) {
            const message = "Server sent a Sec-WebSocket-Extensions header but no extension was requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          let extensions;
          try {
            extensions = parse(secWebSocketExtensions);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          const extensionNames = Object.keys(extensions);
          if (extensionNames.length !== 1 || extensionNames[0] !== PerMessageDeflate2.extensionName) {
            const message = "Server indicated an extension that was not requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          try {
            perMessageDeflate.accept(extensions[PerMessageDeflate2.extensionName]);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          websocket._extensions[PerMessageDeflate2.extensionName] = perMessageDeflate;
        }
        websocket.setSocket(socket, head, {
          allowSynchronousEvents: opts.allowSynchronousEvents,
          generateMask: opts.generateMask,
          maxBufferedChunks: opts.maxBufferedChunks,
          maxFragments: opts.maxFragments,
          maxPayload: opts.maxPayload,
          skipUTF8Validation: opts.skipUTF8Validation
        });
      });
      if (opts.finishRequest) {
        opts.finishRequest(req, websocket);
      } else {
        req.end();
      }
    }
    function emitErrorAndClose(websocket, err) {
      websocket._readyState = WebSocket2.CLOSING;
      websocket._errorEmitted = true;
      websocket.emit("error", err);
      websocket.emitClose();
    }
    function netConnect(options) {
      options.path = options.socketPath;
      return net.connect(options);
    }
    function tlsConnect(options) {
      options.path = void 0;
      if (!options.servername && options.servername !== "") {
        options.servername = net.isIP(options.host) ? "" : options.host;
      }
      return tls.connect(options);
    }
    function abortHandshake(websocket, stream, message) {
      websocket._readyState = WebSocket2.CLOSING;
      const err = new Error(message);
      Error.captureStackTrace(err, abortHandshake);
      if (stream.setHeader) {
        stream[kAborted] = true;
        stream.abort();
        if (stream.socket && !stream.socket.destroyed) {
          stream.socket.destroy();
        }
        process.nextTick(emitErrorAndClose, websocket, err);
      } else {
        stream.destroy(err);
        stream.once("error", websocket.emit.bind(websocket, "error"));
        stream.once("close", websocket.emitClose.bind(websocket));
      }
    }
    function sendAfterClose(websocket, data, cb) {
      if (data) {
        const length = isBlob(data) ? data.size : toBuffer(data).length;
        if (websocket._socket) websocket._sender._bufferedBytes += length;
        else websocket._bufferedAmount += length;
      }
      if (cb) {
        const err = new Error(
          `WebSocket is not open: readyState ${websocket.readyState} (${readyStates[websocket.readyState]})`
        );
        process.nextTick(cb, err);
      }
    }
    function receiverOnConclude(code, reason) {
      const websocket = this[kWebSocket];
      websocket._closeFrameReceived = true;
      websocket._closeMessage = reason;
      websocket._closeCode = code;
      if (websocket._socket[kWebSocket] === void 0) return;
      websocket._socket.removeListener("data", socketOnData);
      process.nextTick(resume, websocket._socket);
      if (code === 1005) websocket.close();
      else websocket.close(code, reason);
    }
    function receiverOnDrain() {
      const websocket = this[kWebSocket];
      if (!websocket.isPaused) websocket._socket.resume();
    }
    function receiverOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket._socket[kWebSocket] !== void 0) {
        websocket._socket.removeListener("data", socketOnData);
        process.nextTick(resume, websocket._socket);
        websocket.close(err[kStatusCode]);
      }
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function receiverOnFinish() {
      this[kWebSocket].emitClose();
    }
    function receiverOnMessage(data, isBinary) {
      this[kWebSocket].emit("message", data, isBinary);
    }
    function receiverOnPing(data) {
      const websocket = this[kWebSocket];
      if (websocket._autoPong) websocket.pong(data, !this._isServer, NOOP);
      websocket.emit("ping", data);
    }
    function receiverOnPong(data) {
      this[kWebSocket].emit("pong", data);
    }
    function resume(stream) {
      stream.resume();
    }
    function senderOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket.readyState === WebSocket2.CLOSED) return;
      if (websocket.readyState === WebSocket2.OPEN) {
        websocket._readyState = WebSocket2.CLOSING;
        setCloseTimer(websocket);
      }
      this._socket.end();
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function setCloseTimer(websocket) {
      websocket._closeTimer = setTimeout(
        websocket._socket.destroy.bind(websocket._socket),
        websocket._closeTimeout
      );
    }
    function socketOnClose() {
      const websocket = this[kWebSocket];
      this.removeListener("close", socketOnClose);
      this.removeListener("data", socketOnData);
      this.removeListener("end", socketOnEnd);
      websocket._readyState = WebSocket2.CLOSING;
      if (!this._readableState.endEmitted && !websocket._closeFrameReceived && !websocket._receiver._writableState.errorEmitted && this._readableState.length !== 0) {
        const chunk = this.read(this._readableState.length);
        websocket._receiver.write(chunk);
      }
      websocket._receiver.end();
      this[kWebSocket] = void 0;
      clearTimeout(websocket._closeTimer);
      if (websocket._receiver._writableState.finished || websocket._receiver._writableState.errorEmitted) {
        websocket.emitClose();
      } else {
        websocket._receiver.on("error", receiverOnFinish);
        websocket._receiver.on("finish", receiverOnFinish);
      }
    }
    function socketOnData(chunk) {
      if (!this[kWebSocket]._receiver.write(chunk)) {
        this.pause();
      }
    }
    function socketOnEnd() {
      const websocket = this[kWebSocket];
      websocket._readyState = WebSocket2.CLOSING;
      websocket._receiver.end();
      this.end();
    }
    function socketOnError() {
      const websocket = this[kWebSocket];
      this.removeListener("error", socketOnError);
      this.on("error", NOOP);
      if (websocket) {
        websocket._readyState = WebSocket2.CLOSING;
        this.destroy();
      }
    }
  }
});

// node_modules/ws/lib/stream.js
var require_stream = __commonJS({
  "node_modules/ws/lib/stream.js"(exports2, module2) {
    "use strict";
    var WebSocket2 = require_websocket();
    var { Duplex } = require("stream");
    function emitClose(stream) {
      stream.emit("close");
    }
    function duplexOnEnd() {
      if (!this.destroyed && this._writableState.finished) {
        this.destroy();
      }
    }
    function duplexOnError(err) {
      this.removeListener("error", duplexOnError);
      this.destroy();
      if (this.listenerCount("error") === 0) {
        this.emit("error", err);
      }
    }
    function createWebSocketStream2(ws, options) {
      let terminateOnDestroy = true;
      const duplex = new Duplex({
        ...options,
        autoDestroy: false,
        emitClose: false,
        objectMode: false,
        writableObjectMode: false
      });
      ws.on("message", function message(msg, isBinary) {
        const data = !isBinary && duplex._readableState.objectMode ? msg.toString() : msg;
        if (!duplex.push(data)) ws.pause();
      });
      ws.once("error", function error(err) {
        if (duplex.destroyed) return;
        terminateOnDestroy = false;
        duplex.destroy(err);
      });
      ws.once("close", function close() {
        if (duplex.destroyed) return;
        duplex.push(null);
      });
      duplex._destroy = function(err, callback) {
        if (ws.readyState === ws.CLOSED) {
          callback(err);
          process.nextTick(emitClose, duplex);
          return;
        }
        let called = false;
        ws.once("error", function error(err2) {
          called = true;
          callback(err2);
        });
        ws.once("close", function close() {
          if (!called) callback(err);
          process.nextTick(emitClose, duplex);
        });
        if (terminateOnDestroy) ws.terminate();
      };
      duplex._final = function(callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._final(callback);
          });
          return;
        }
        if (ws._socket === null) return;
        if (ws._socket._writableState.finished) {
          callback();
          if (duplex._readableState.endEmitted) duplex.destroy();
        } else {
          ws._socket.once("finish", function finish() {
            callback();
          });
          ws.close();
        }
      };
      duplex._read = function() {
        if (ws.isPaused) ws.resume();
      };
      duplex._write = function(chunk, encoding, callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._write(chunk, encoding, callback);
          });
          return;
        }
        ws.send(chunk, callback);
      };
      duplex.on("end", duplexOnEnd);
      duplex.on("error", duplexOnError);
      return duplex;
    }
    module2.exports = createWebSocketStream2;
  }
});

// node_modules/ws/lib/subprotocol.js
var require_subprotocol = __commonJS({
  "node_modules/ws/lib/subprotocol.js"(exports2, module2) {
    "use strict";
    var { tokenChars } = require_validation();
    function parse(header) {
      const protocols = /* @__PURE__ */ new Set();
      let start = -1;
      let end = -1;
      let i = 0;
      for (i; i < header.length; i++) {
        const code = header.charCodeAt(i);
        if (end === -1 && tokenChars[code] === 1) {
          if (start === -1) start = i;
        } else if (i !== 0 && (code === 32 || code === 9)) {
          if (end === -1 && start !== -1) end = i;
        } else if (code === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1) end = i;
          const protocol2 = header.slice(start, end);
          if (protocols.has(protocol2)) {
            throw new SyntaxError(`The "${protocol2}" subprotocol is duplicated`);
          }
          protocols.add(protocol2);
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      }
      if (start === -1 || end !== -1) {
        throw new SyntaxError("Unexpected end of input");
      }
      const protocol = header.slice(start, i);
      if (protocols.has(protocol)) {
        throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
      }
      protocols.add(protocol);
      return protocols;
    }
    module2.exports = { parse };
  }
});

// node_modules/ws/lib/websocket-server.js
var require_websocket_server = __commonJS({
  "node_modules/ws/lib/websocket-server.js"(exports2, module2) {
    "use strict";
    var EventEmitter = require("events");
    var http = require("http");
    var { Duplex } = require("stream");
    var { createHash } = require("crypto");
    var extension2 = require_extension();
    var PerMessageDeflate2 = require_permessage_deflate();
    var subprotocol2 = require_subprotocol();
    var WebSocket2 = require_websocket();
    var { CLOSE_TIMEOUT, GUID, kWebSocket } = require_constants();
    var keyRegex = /^[+/0-9A-Za-z]{22}==$/;
    var RUNNING = 0;
    var CLOSING = 1;
    var CLOSED = 2;
    var WebSocketServer2 = class extends EventEmitter {
      /**
       * Create a `WebSocketServer` instance.
       *
       * @param {Object} options Configuration options
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Boolean} [options.autoPong=true] Specifies whether or not to
       *     automatically send a pong in response to a ping
       * @param {Number} [options.backlog=511] The maximum length of the queue of
       *     pending connections
       * @param {Boolean} [options.clientTracking=true] Specifies whether or not to
       *     track clients
       * @param {Number} [options.closeTimeout=30000] Duration in milliseconds to
       *     wait for the closing handshake to finish after `websocket.close()` is
       *     called
       * @param {Function} [options.handleProtocols] A hook to handle protocols
       * @param {String} [options.host] The hostname where to bind the server
       * @param {Number} [options.maxBufferedChunks=262144] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=16384] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=104857600] The maximum allowed message
       *     size
       * @param {Boolean} [options.noServer=false] Enable no server mode
       * @param {String} [options.path] Accept only connections matching this path
       * @param {(Boolean|Object)} [options.perMessageDeflate=false] Enable/disable
       *     permessage-deflate
       * @param {Number} [options.port] The port where to bind the server
       * @param {(http.Server|https.Server)} [options.server] A pre-created HTTP/S
       *     server to use
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @param {Function} [options.verifyClient] A hook to reject connections
       * @param {Function} [options.WebSocket=WebSocket] Specifies the `WebSocket`
       *     class to use. It must be the `WebSocket` class or class that extends it
       * @param {Function} [callback] A listener for the `listening` event
       */
      constructor(options, callback) {
        super();
        options = {
          allowSynchronousEvents: true,
          autoPong: true,
          maxBufferedChunks: 256 * 1024,
          maxFragments: 16 * 1024,
          maxPayload: 100 * 1024 * 1024,
          skipUTF8Validation: false,
          perMessageDeflate: false,
          handleProtocols: null,
          clientTracking: true,
          closeTimeout: CLOSE_TIMEOUT,
          verifyClient: null,
          noServer: false,
          backlog: null,
          // use default (511 as implemented in net.js)
          server: null,
          host: null,
          path: null,
          port: null,
          WebSocket: WebSocket2,
          ...options
        };
        if (options.port == null && !options.server && !options.noServer || options.port != null && (options.server || options.noServer) || options.server && options.noServer) {
          throw new TypeError(
            'One and only one of the "port", "server", or "noServer" options must be specified'
          );
        }
        if (options.port != null) {
          this._server = http.createServer((req, res) => {
            const body = http.STATUS_CODES[426];
            res.writeHead(426, {
              "Content-Length": body.length,
              "Content-Type": "text/plain"
            });
            res.end(body);
          });
          this._server.listen(
            options.port,
            options.host,
            options.backlog,
            callback
          );
        } else if (options.server) {
          this._server = options.server;
        }
        if (this._server) {
          const emitConnection = this.emit.bind(this, "connection");
          this._removeListeners = addListeners(this._server, {
            listening: this.emit.bind(this, "listening"),
            error: this.emit.bind(this, "error"),
            upgrade: (req, socket, head) => {
              this.handleUpgrade(req, socket, head, emitConnection);
            }
          });
        }
        if (options.perMessageDeflate === true) options.perMessageDeflate = {};
        if (options.clientTracking) {
          this.clients = /* @__PURE__ */ new Set();
          this._shouldEmitClose = false;
        }
        this.options = options;
        this._state = RUNNING;
      }
      /**
       * Returns the bound address, the address family name, and port of the server
       * as reported by the operating system if listening on an IP socket.
       * If the server is listening on a pipe or UNIX domain socket, the name is
       * returned as a string.
       *
       * @return {(Object|String|null)} The address of the server
       * @public
       */
      address() {
        if (this.options.noServer) {
          throw new Error('The server is operating in "noServer" mode');
        }
        if (!this._server) return null;
        return this._server.address();
      }
      /**
       * Stop the server from accepting new connections and emit the `'close'` event
       * when all existing connections are closed.
       *
       * @param {Function} [cb] A one-time listener for the `'close'` event
       * @public
       */
      close(cb) {
        if (this._state === CLOSED) {
          if (cb) {
            this.once("close", () => {
              cb(new Error("The server is not running"));
            });
          }
          process.nextTick(emitClose, this);
          return;
        }
        if (cb) this.once("close", cb);
        if (this._state === CLOSING) return;
        this._state = CLOSING;
        if (this.options.noServer || this.options.server) {
          if (this._server) {
            this._removeListeners();
            this._removeListeners = this._server = null;
          }
          if (this.clients) {
            if (!this.clients.size) {
              process.nextTick(emitClose, this);
            } else {
              this._shouldEmitClose = true;
            }
          } else {
            process.nextTick(emitClose, this);
          }
        } else {
          const server = this._server;
          this._removeListeners();
          this._removeListeners = this._server = null;
          server.close(() => {
            emitClose(this);
          });
        }
      }
      /**
       * See if a given request should be handled by this server instance.
       *
       * @param {http.IncomingMessage} req Request object to inspect
       * @return {Boolean} `true` if the request is valid, else `false`
       * @public
       */
      shouldHandle(req) {
        if (this.options.path) {
          const index = req.url.indexOf("?");
          const pathname = index !== -1 ? req.url.slice(0, index) : req.url;
          if (pathname !== this.options.path) return false;
        }
        return true;
      }
      /**
       * Handle a HTTP Upgrade request.
       *
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @public
       */
      handleUpgrade(req, socket, head, cb) {
        socket.on("error", socketOnError);
        const key = req.headers["sec-websocket-key"];
        const upgrade = req.headers.upgrade;
        const version = +req.headers["sec-websocket-version"];
        if (req.method !== "GET") {
          const message = "Invalid HTTP method";
          abortHandshakeOrEmitwsClientError(this, req, socket, 405, message);
          return;
        }
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          const message = "Invalid Upgrade header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (key === void 0 || !keyRegex.test(key)) {
          const message = "Missing or invalid Sec-WebSocket-Key header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (version !== 13 && version !== 8) {
          const message = "Missing or invalid Sec-WebSocket-Version header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message, {
            "Sec-WebSocket-Version": "13, 8"
          });
          return;
        }
        if (!this.shouldHandle(req)) {
          abortHandshake(socket, 400);
          return;
        }
        const secWebSocketProtocol = req.headers["sec-websocket-protocol"];
        let protocols = /* @__PURE__ */ new Set();
        if (secWebSocketProtocol !== void 0) {
          try {
            protocols = subprotocol2.parse(secWebSocketProtocol);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Protocol header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        const secWebSocketExtensions = req.headers["sec-websocket-extensions"];
        const extensions = {};
        if (this.options.perMessageDeflate && secWebSocketExtensions !== void 0) {
          const perMessageDeflate = new PerMessageDeflate2({
            ...this.options.perMessageDeflate,
            isServer: true,
            maxPayload: this.options.maxPayload
          });
          try {
            const offers = extension2.parse(secWebSocketExtensions);
            if (offers[PerMessageDeflate2.extensionName]) {
              perMessageDeflate.accept(offers[PerMessageDeflate2.extensionName]);
              extensions[PerMessageDeflate2.extensionName] = perMessageDeflate;
            }
          } catch (err) {
            const message = "Invalid or unacceptable Sec-WebSocket-Extensions header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        if (this.options.verifyClient) {
          const info = {
            origin: req.headers[`${version === 8 ? "sec-websocket-origin" : "origin"}`],
            secure: !!(req.socket.authorized || req.socket.encrypted),
            req
          };
          if (this.options.verifyClient.length === 2) {
            this.options.verifyClient(info, (verified, code, message, headers) => {
              if (!verified) {
                return abortHandshake(socket, code || 401, message, headers);
              }
              this.completeUpgrade(
                extensions,
                key,
                protocols,
                req,
                socket,
                head,
                cb
              );
            });
            return;
          }
          if (!this.options.verifyClient(info)) return abortHandshake(socket, 401);
        }
        this.completeUpgrade(extensions, key, protocols, req, socket, head, cb);
      }
      /**
       * Upgrade the connection to WebSocket.
       *
       * @param {Object} extensions The accepted extensions
       * @param {String} key The value of the `Sec-WebSocket-Key` header
       * @param {Set} protocols The subprotocols
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @throws {Error} If called more than once with the same socket
       * @private
       */
      completeUpgrade(extensions, key, protocols, req, socket, head, cb) {
        if (!socket.readable || !socket.writable) return socket.destroy();
        if (socket[kWebSocket]) {
          throw new Error(
            "server.handleUpgrade() was called more than once with the same socket, possibly due to a misconfiguration"
          );
        }
        if (this._state > RUNNING) return abortHandshake(socket, 503);
        const digest = createHash("sha1").update(key + GUID).digest("base64");
        const headers = [
          "HTTP/1.1 101 Switching Protocols",
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Accept: ${digest}`
        ];
        const ws = new this.options.WebSocket(null, void 0, this.options);
        if (protocols.size) {
          const protocol = this.options.handleProtocols ? this.options.handleProtocols(protocols, req) : protocols.values().next().value;
          if (protocol) {
            headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
            ws._protocol = protocol;
          }
        }
        if (extensions[PerMessageDeflate2.extensionName]) {
          const params = extensions[PerMessageDeflate2.extensionName].params;
          const value = extension2.format({
            [PerMessageDeflate2.extensionName]: [params]
          });
          headers.push(`Sec-WebSocket-Extensions: ${value}`);
          ws._extensions = extensions;
        }
        this.emit("headers", headers, req);
        socket.write(headers.concat("\r\n").join("\r\n"));
        socket.removeListener("error", socketOnError);
        ws.setSocket(socket, head, {
          allowSynchronousEvents: this.options.allowSynchronousEvents,
          maxBufferedChunks: this.options.maxBufferedChunks,
          maxFragments: this.options.maxFragments,
          maxPayload: this.options.maxPayload,
          skipUTF8Validation: this.options.skipUTF8Validation
        });
        if (this.clients) {
          this.clients.add(ws);
          ws.on("close", () => {
            this.clients.delete(ws);
            if (this._shouldEmitClose && !this.clients.size) {
              process.nextTick(emitClose, this);
            }
          });
        }
        cb(ws, req);
      }
    };
    module2.exports = WebSocketServer2;
    function addListeners(server, map) {
      for (const event of Object.keys(map)) server.on(event, map[event]);
      return function removeListeners() {
        for (const event of Object.keys(map)) {
          server.removeListener(event, map[event]);
        }
      };
    }
    function emitClose(server) {
      server._state = CLOSED;
      server.emit("close");
    }
    function socketOnError() {
      this.destroy();
    }
    function abortHandshake(socket, code, message, headers) {
      message = message || http.STATUS_CODES[code];
      headers = {
        Connection: "close",
        "Content-Type": "text/html",
        "Content-Length": Buffer.byteLength(message),
        ...headers
      };
      socket.once("finish", socket.destroy);
      socket.end(
        `HTTP/1.1 ${code} ${http.STATUS_CODES[code]}\r
` + Object.keys(headers).map((h) => `${h}: ${headers[h]}`).join("\r\n") + "\r\n\r\n" + message
      );
    }
    function abortHandshakeOrEmitwsClientError(server, req, socket, code, message, headers) {
      if (server.listenerCount("wsClientError")) {
        const err = new Error(message);
        Error.captureStackTrace(err, abortHandshakeOrEmitwsClientError);
        server.emit("wsClientError", err, socket, req);
      } else {
        abortHandshake(socket, code, message, headers);
      }
    }
  }
});

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var import_node_crypto2 = require("node:crypto");
var vscode6 = __toESM(require("vscode"));

// src/attachments.ts
var import_node_crypto = require("node:crypto");
var import_node_path2 = require("node:path");
var vscode2 = __toESM(require("vscode"));

// src/editorContext.ts
var import_node_path = require("node:path");
var vscode = __toESM(require("vscode"));
var MAX_CURRENT_PAGE_CHARACTERS = 8e4;
function captureEditorContext() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    return void 0;
  }
  const selection = editor.selection;
  const selectedText = editor.document.getText(selection);
  if (!selectedText.trim()) {
    return void 0;
  }
  const startLine = selection.start.line + 1;
  const endsAtNextLineStart = selection.end.character === 0 && selection.end.line > selection.start.line;
  const endLine = endsAtNextLineStart ? selection.end.line : selection.end.line + 1;
  return {
    uri: editor.document.uri.toString(),
    fileName: (0, import_node_path.basename)(editor.document.fileName),
    relativePath: vscode.workspace.asRelativePath(editor.document.uri, false),
    languageId: editor.document.languageId,
    startLine,
    endLine,
    startLineIndex: selection.start.line,
    endLineIndex: selection.end.line,
    startCharacter: selection.start.character,
    endCharacter: selection.end.character,
    text: selectedText
  };
}
function summarizeEditorContext(context) {
  if (!context) {
    return void 0;
  }
  return {
    fileName: context.fileName,
    startLine: context.startLine,
    endLine: context.endLine,
    label: `${context.fileName} ${context.startLine}-${context.endLine}`
  };
}
function captureCurrentPageContext(requestedUri) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return void 0;
  }
  const documentUri = editor.document.uri.toString();
  if (requestedUri && requestedUri !== documentUri) {
    return void 0;
  }
  const completeText = editor.document.getText();
  const truncated = completeText.length > MAX_CURRENT_PAGE_CHARACTERS;
  const text = truncated ? completeText.slice(0, MAX_CURRENT_PAGE_CHARACTERS) : completeText;
  return {
    uri: documentUri,
    fileName: (0, import_node_path.basename)(editor.document.fileName),
    relativePath: vscode.workspace.asRelativePath(editor.document.uri, false),
    languageId: editor.document.languageId,
    startLine: 1,
    endLine: editor.document.lineCount,
    text,
    truncated
  };
}
function summarizeCurrentPage(context) {
  if (!context) {
    return void 0;
  }
  return {
    uri: context.uri,
    fileName: context.fileName,
    relativePath: context.relativePath,
    label: context.relativePath
  };
}

// src/attachments.ts
var MAX_ATTACHMENTS = 6;
var MAX_IMAGE_ATTACHMENTS = 3;
var MAX_TEXT_FILE_BYTES = 1 * 1024 * 1024;
var MAX_IMAGE_FILE_BYTES = 12 * 1024 * 1024;
var MAX_ATTACHMENT_TEXT_CHARACTERS = 8e4;
var IMAGE_MIME_TYPES = /* @__PURE__ */ new Map([
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"]
]);
var TEXT_EXTENSIONS = /* @__PURE__ */ new Set([
  ".c",
  ".cc",
  ".conf",
  ".cpp",
  ".cs",
  ".css",
  ".csv",
  ".dart",
  ".env",
  ".go",
  ".graphql",
  ".h",
  ".hpp",
  ".html",
  ".ini",
  ".java",
  ".js",
  ".json",
  ".jsonc",
  ".jsx",
  ".kt",
  ".kts",
  ".log",
  ".md",
  ".php",
  ".properties",
  ".py",
  ".rb",
  ".rs",
  ".scss",
  ".sh",
  ".sql",
  ".svelte",
  ".swift",
  ".toml",
  ".ts",
  ".tsx",
  ".tsv",
  ".txt",
  ".vue",
  ".xml",
  ".yaml",
  ".yml"
]);
var AttachmentStore = class {
  attachments = /* @__PURE__ */ new Map();
  list() {
    return [...this.attachments.values()].map(({ summary }) => summary);
  }
  addCurrentFile() {
    const currentPage = captureCurrentPageContext();
    const currentPageSummary = summarizeCurrentPage(currentPage);
    if (!currentPage || !currentPageSummary) {
      throw new Error("Open a text editor before adding the current file.");
    }
    const duplicate = [...this.attachments.values()].find(
      (attachment) => attachment.summary.kind === "currentFile" && attachment.currentPage?.uri === currentPage.uri
    );
    if (duplicate) {
      return duplicate.summary;
    }
    this.assertCapacity(1);
    const summary = {
      id: (0, import_node_crypto.randomUUID)(),
      kind: "currentFile",
      label: currentPageSummary.label
    };
    this.attachments.set(summary.id, { currentPage, summary });
    return summary;
  }
  async pickTextFiles() {
    return this.pickFiles("text");
  }
  async pickImages() {
    return this.pickFiles("image");
  }
  async pickFiles(selectionKind) {
    const isImageSelection = selectionKind === "image";
    const uris = await vscode2.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: true,
      openLabel: isImageSelection ? "Add images" : "Add files",
      title: isImageSelection ? "Add image context to Echo" : "Add file context to Echo",
      filters: isImageSelection ? { Images: ["jpg", "jpeg", "png", "webp"] } : {
        "Code and text": [...TEXT_EXTENSIONS].map(
          (extension2) => extension2.slice(1)
        )
      }
    });
    if (!uris?.length) {
      return [];
    }
    this.assertCapacity(uris.length);
    const added = [];
    for (const uri of uris) {
      const duplicate = [...this.attachments.values()].find(
        (attachment) => attachment.uri?.toString() === uri.toString()
      );
      if (duplicate) {
        added.push(duplicate.summary);
        continue;
      }
      const extension2 = (0, import_node_path2.extname)(uri.path).toLowerCase();
      const imageMimeType = IMAGE_MIME_TYPES.get(extension2);
      const kind = imageMimeType ? "image" : "textFile";
      if (!imageMimeType && !TEXT_EXTENSIONS.has(extension2)) {
        throw new Error(
          `${(0, import_node_path2.basename)(uri.fsPath)} is not a supported code, text, or image file.`
        );
      }
      const imageCount = [...this.attachments.values()].filter(
        (attachment) => attachment.summary.kind === "image"
      ).length;
      if (kind === "image" && imageCount >= MAX_IMAGE_ATTACHMENTS) {
        throw new Error(
          `Echo accepts up to ${MAX_IMAGE_ATTACHMENTS} images per message.`
        );
      }
      const stat = await vscode2.workspace.fs.stat(uri);
      const maximumBytes = kind === "image" ? MAX_IMAGE_FILE_BYTES : MAX_TEXT_FILE_BYTES;
      if (stat.size > maximumBytes) {
        const maximumMegabytes = Math.floor(maximumBytes / 1024 / 1024);
        throw new Error(
          `${(0, import_node_path2.basename)(uri.fsPath)} is larger than the ${maximumMegabytes} MB attachment limit.`
        );
      }
      const summary = {
        id: (0, import_node_crypto.randomUUID)(),
        kind,
        label: (0, import_node_path2.basename)(uri.fsPath)
      };
      this.attachments.set(summary.id, {
        summary,
        uri,
        mimeType: imageMimeType
      });
      added.push(summary);
    }
    return added;
  }
  remove(id) {
    this.attachments.delete(id);
  }
  clear() {
    this.attachments.clear();
  }
  async prepare(requestedIds) {
    const requested = requestedIds.map((id) => this.attachments.get(id)).filter(
      (attachment) => attachment !== void 0
    );
    const promptSections = [];
    const images = [];
    let remainingTextCharacters = MAX_ATTACHMENT_TEXT_CHARACTERS;
    for (const attachment of requested) {
      if (attachment.summary.kind === "image") {
        if (!attachment.uri || !attachment.mimeType) {
          continue;
        }
        const bytes = await vscode2.workspace.fs.readFile(attachment.uri);
        images.push({
          data: Buffer.from(bytes).toString("base64"),
          label: attachment.summary.label,
          mimeType: attachment.mimeType
        });
        promptSections.push(
          [
            `Attached image: ${attachment.summary.label}`,
            "The image is sent as a Gemini Live visual frame immediately before the user request. Inspect its visible content and use it as supporting context."
          ].join("\n")
        );
        continue;
      }
      const textAttachment = await this.readTextAttachment(attachment);
      if (!textAttachment || remainingTextCharacters <= 0) {
        continue;
      }
      const acceptedText = textAttachment.text.slice(
        0,
        remainingTextCharacters
      );
      remainingTextCharacters -= acceptedText.length;
      promptSections.push(
        [
          `Attached file: ${textAttachment.relativePath}`,
          textAttachment.truncated || acceptedText.length < textAttachment.text.length ? "Note: The file was truncated at the safe context limit." : "",
          `\`\`\`${textAttachment.languageId}`,
          acceptedText,
          "```"
        ].filter(Boolean).join("\n")
      );
    }
    return {
      prompt: promptSections.length ? [
        "Use these explicitly attached files as private supporting context.",
        "If selected editor code is also supplied, the selected code remains primary.",
        ...promptSections
      ].join("\n\n") : "",
      images
    };
  }
  release(requestedIds) {
    requestedIds.forEach((id) => {
      this.attachments.delete(id);
    });
  }
  assertCapacity(additionalCount) {
    if (this.attachments.size + additionalCount > MAX_ATTACHMENTS) {
      throw new Error(
        `Echo accepts up to ${MAX_ATTACHMENTS} context attachments per message.`
      );
    }
  }
  async readTextAttachment(attachment) {
    if (attachment.currentPage) {
      return {
        languageId: attachment.currentPage.languageId,
        relativePath: attachment.currentPage.relativePath,
        text: attachment.currentPage.text,
        truncated: attachment.currentPage.truncated
      };
    }
    if (!attachment.uri) {
      return void 0;
    }
    const document = await vscode2.workspace.openTextDocument(attachment.uri);
    const completeText = document.getText();
    if (completeText.includes("\0")) {
      throw new Error(
        `${attachment.summary.label} appears to be a binary file.`
      );
    }
    return {
      languageId: document.languageId,
      relativePath: vscode2.workspace.asRelativePath(attachment.uri, false),
      text: completeText,
      truncated: false
    };
  }
};

// src/chatHistory.ts
var vscode3 = __toESM(require("vscode"));
var CHAT_DIRECTORY_NAME = "chats";
var MAX_CHAT_COUNT = 100;
var MAX_CHAT_MESSAGES = 250;
var MAX_MESSAGE_CHARACTERS = 2e5;
var CHAT_ID_PATTERN = /^[0-9a-f-]{16,64}$/iu;
var ChatHistoryStore = class {
  chatDirectory;
  constructor(globalStorageUri) {
    this.chatDirectory = vscode3.Uri.joinPath(
      globalStorageUri,
      CHAT_DIRECTORY_NAME
    );
  }
  async initialize() {
    await vscode3.workspace.fs.createDirectory(this.chatDirectory);
  }
  async list() {
    const chats = await this.readAll();
    return chats.slice(0, MAX_CHAT_COUNT).map((chat) => ({
      id: chat.id,
      title: chat.title,
      updatedAt: chat.updatedAt,
      messageCount: chat.messages.length
    }));
  }
  async readAll() {
    await this.initialize();
    const entries = await vscode3.workspace.fs.readDirectory(this.chatDirectory);
    const chats = await Promise.all(
      entries.filter(
        ([name, type]) => type === vscode3.FileType.File && name.endsWith(".json")
      ).map(async ([name]) => {
        try {
          return await this.read(name.slice(0, -5));
        } catch {
          return void 0;
        }
      })
    );
    return chats.filter((chat) => chat !== void 0).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }
  async read(chatId) {
    this.assertChatId(chatId);
    const bytes = await vscode3.workspace.fs.readFile(this.chatUri(chatId));
    const parsed = JSON.parse(Buffer.from(bytes).toString("utf8"));
    return this.validateChat(parsed);
  }
  async save(chat) {
    await this.initialize();
    const validated = this.validateChat(chat);
    const serialized = `${JSON.stringify(validated, void 0, 2)}
`;
    await vscode3.workspace.fs.writeFile(
      this.chatUri(validated.id),
      Buffer.from(serialized, "utf8")
    );
    await this.prune();
    return validated;
  }
  async delete(chatId) {
    this.assertChatId(chatId);
    try {
      await vscode3.workspace.fs.delete(this.chatUri(chatId), {
        recursive: false,
        useTrash: false
      });
    } catch (error) {
      if (!(error instanceof vscode3.FileSystemError && error.code === "FileNotFound")) {
        throw error;
      }
    }
  }
  async conversationContext(chatId) {
    if (!chatId) {
      return [];
    }
    try {
      const chat = await this.read(chatId);
      const selected = [];
      let remainingCharacters = 24e3;
      for (let index = chat.messages.length - 1; index >= 0 && selected.length < 12 && remainingCharacters > 0; index -= 1) {
        const message = chat.messages[index];
        if (!message) {
          continue;
        }
        const text = message.text.slice(-remainingCharacters);
        remainingCharacters -= text.length;
        selected.unshift({ ...message, text });
      }
      return selected;
    } catch {
      return [];
    }
  }
  chatUri(chatId) {
    return vscode3.Uri.joinPath(this.chatDirectory, `${chatId}.json`);
  }
  assertChatId(chatId) {
    if (!CHAT_ID_PATTERN.test(chatId)) {
      throw new Error("The chat identifier is invalid.");
    }
  }
  validateChat(value) {
    if (!isRecord(value)) {
      throw new Error("The chat file is invalid.");
    }
    const id = readString(value, "id");
    this.assertChatId(id);
    const createdAt = readDate(value, "createdAt");
    const updatedAt = readDate(value, "updatedAt");
    const rawMessages = value["messages"];
    if (!Array.isArray(rawMessages)) {
      throw new Error("The chat message list is invalid.");
    }
    const messages = rawMessages.slice(-MAX_CHAT_MESSAGES).map((message) => this.validateMessage(message));
    return {
      id,
      title: readString(value, "title").slice(0, 120),
      createdAt,
      updatedAt,
      messages
    };
  }
  validateMessage(value) {
    if (!isRecord(value)) {
      throw new Error("A stored chat message is invalid.");
    }
    const role = value["role"];
    if (role !== "user" && role !== "model") {
      throw new Error("A stored chat message has an invalid role.");
    }
    return {
      id: readString(value, "id").slice(0, 80),
      role,
      text: readString(value, "text").slice(0, MAX_MESSAGE_CHARACTERS),
      createdAt: readDate(value, "createdAt"),
      contextLabel: readOptionalString(value, "contextLabel"),
      currentPageLabel: readOptionalString(value, "currentPageLabel")
    };
  }
  async prune() {
    const chats = await this.readAll();
    const stale = chats.slice(MAX_CHAT_COUNT);
    await Promise.all(
      stale.map(async (chat) => {
        await vscode3.workspace.fs.delete(this.chatUri(chat.id), {
          recursive: false,
          useTrash: false
        });
      })
    );
  }
};
function isRecord(value) {
  return typeof value === "object" && value !== null;
}
function readString(value, key) {
  const field = value[key];
  if (typeof field !== "string" || !field.trim()) {
    throw new Error(`The chat field '${key}' is invalid.`);
  }
  return field.trim();
}
function readOptionalString(value, key) {
  const field = value[key];
  return typeof field === "string" && field.trim() ? field.trim().slice(0, 240) : void 0;
}
function readDate(value, key) {
  const field = readString(value, key);
  if (Number.isNaN(Date.parse(field))) {
    throw new Error(`The chat date '${key}' is invalid.`);
  }
  return field;
}

// node_modules/ws/wrapper.mjs
var import_stream = __toESM(require_stream(), 1);
var import_extension = __toESM(require_extension(), 1);
var import_permessage_deflate = __toESM(require_permessage_deflate(), 1);
var import_receiver = __toESM(require_receiver(), 1);
var import_sender = __toESM(require_sender(), 1);
var import_subprotocol = __toESM(require_subprotocol(), 1);
var import_websocket = __toESM(require_websocket(), 1);
var import_websocket_server = __toESM(require_websocket_server(), 1);
var wrapper_default = import_websocket.default;

// src/prompts.ts
var BEHAVIOR_INSTRUCTIONS = {
  professional: "Be clear, structured, concise, and professional.",
  friendly: "Be approachable, conversational, patient, and easy to follow.",
  expert: "Be deeply technical and precise. Explain control flow, data flow, edge cases, and important trade-offs."
};
function buildSystemInstruction(preferences) {
  return [
    "You are Echo, a code explanation assistant inside Visual Studio Code.",
    "Explain the user's selected code or coding question accurately.",
    `Always respond in ${preferences.preferredLanguage}, unless the user explicitly asks for another language.`,
    BEHAVIOR_INSTRUCTIONS[preferences.behavior],
    "When returning code, use fenced Markdown with the correct language identifier and syntactically valid formatting.",
    "If the user asks for code, always generate the requested code. Never respond with only an explanation when code is explicitly requested unless the user asks for explanation only.",
    "Treat code generation as a strict requirement whenever the user's request includes implementing, writing, creating, completing, modifying, fixing, or refactoring code.",
    "Ensure every generated code example is complete enough to be directly usable within the available context.",
    "When you refer to a source location in the answer, mention only its line number or line range, for example 'Looking at line 16' or 'Looking at lines 16-24'. Do not include a full path, relative path, or filename in that sentence unless the user explicitly asks for it.",
    "When primary selected code and retrieved workspace snippets are provided, treat the selection as authoritative and use workspace snippets only as supporting evidence.",
    "Echo can search the open VS Code workspace with search_workspace and read exact files with read_workspace_file.",
    "When the user asks you to find, locate, inspect, or read a file, definition, reference, route, component, or implementation that is not already included, briefly say 'Let me search the workspace' and call search_workspace.",
    "After search_workspace returns a relevant path, call read_workspace_file when more of that file is required to answer accurately.",
    "You may call these tools repeatedly to follow imports or usages, but keep searches focused.",
    "Never tell the user to use VS Code search and never claim that you cannot search or read workspace files before using the tools.",
    "Only make claims about workspace code that is present in selected code, an attachment, retrieved workspace evidence, or tool results.",
    "Format every response for maximum readability and understanding.",
    "Begin with a direct summary of the answer before providing detailed explanations.",
    "Use clear Markdown headings, short paragraphs, numbered steps, bullet points, tables, and code blocks wherever they improve understanding.",
    "Before inserting a heading, table, or code block, always finish the current sentence or paragraph first. Never leave a sentence incomplete before a structural break.",
    "Do not force every response into the same structure. Choose the format that best matches the user's question.",
    "Explain technical concepts in simple language first, then provide deeper technical details when useful.",
    "Define unfamiliar technical terms when they first appear.",
    "Preserve exact variable names, function names, class names, API names, commands, and other identifiers from the provided code.",
    "Use practical examples or simple analogies when they make a complex concept easier to understand.",
    "When explaining code, describe both what the code does and why it does it.",
    "When appropriate, explain code execution in the order in which it occurs.",
    "For short code selections, explain important lines individually.",
    "For large code selections, group related lines into logical sections instead of explaining every line separately.",
    "When a tabular explanation would improve clarity, use a Markdown table.",
    "For line-by-line or section-by-section code explanations, prefer a table with columns such as 'Lines', 'Code Element', 'Explanation', and 'Purpose or Effect'.",
    "For functions, methods, APIs, models, or components, use tables when helpful to explain parameters, return values, fields, dependencies, side effects, and possible errors.",
    "For comparisons, use a table that clearly shows the differences, advantages, disadvantages, and recommended use cases.",
    "For debugging questions, clearly separate the observed problem, root cause, evidence, solution, updated code, and verification steps.",
    "For implementation questions, present the solution in the order the user should apply it.",
    "When returning code, never place multiline code inside a Markdown table. Use fenced Markdown code blocks instead.",
    "Inside tables, include only short identifiers or inline code using backticks.",
    "When returning modified code, provide a complete replacement when enough context is available. Otherwise, clearly identify the exact section that must be replaced.",
    "Ensure returned code is syntactically valid, internally consistent, secure, maintainable, and suitable for production use unless the user requests a simplified example.",
    "Add comments only where they explain important decisions, non-obvious logic, validation, security, or error handling.",
    "Do not remove existing functionality unless the user explicitly requests it or removal is necessary to correct an error.",
    "Clearly distinguish confirmed behavior from assumptions, recommendations, and possible causes.",
    "When information is missing, state the assumption being made instead of presenting it as a confirmed fact.",
    "Highlight warnings, security concerns, breaking changes, destructive commands, and important limitations clearly.",
    "Keep explanations focused and avoid repeating the same information in multiple sections.",
    "Provide thorough, well-structured answers for every logical, technical, analytical, debugging, implementation, architecture, or code-related question unless the user explicitly asks for a brief answer.",
    "For general conversational, factual, or casual questions that do not require technical reasoning, keep the response concise unless the user requests more detail.",
    "Adjust the response length based on the complexity of the question, favoring completeness over brevity whenever technical reasoning is required.",
    "End with a brief conclusion or recommended next action when it adds practical value.",
    "Before sending the response, verify that the explanation is logically ordered, easy to scan, technically accurate, and understandable to a developer who is unfamiliar with the code.",
    "You are a voice-first coding assistant.",
    "Always complete every spoken sentence before emitting visual Markdown.",
    "Never place a Markdown table, list, heading, or code block in the middle of a spoken sentence.",
    "When a table, list, or code block is useful:",
    "1. First speak a short natural explanation of what the visual content shows.",
    "2. Keep speaking while the visual content is returned.",
    "3. Do not read Markdown symbols or source code character by character.",
    "4. For a table, verbally summarize its purpose, important columns, and up to three key entries.",
    "5. For code, explain its purpose and important behavior in one or two sentences.",
    "6. Call render_markdown with the complete table or code block whenever a structured visual element would improve the answer.",
    "7. Never put fenced code blocks or pipe-delimited tables directly in the spoken transcript. Use render_markdown instead.",
    "Do not stop the audio response merely because visual Markdown is included."
  ].join(" ");
}
function buildConversationHistoryPrompt(messages) {
  if (!messages.length) {
    return "";
  }
  return [
    "The user reopened this locally saved Echo chat. Use the following recent messages only to continue the prior conversation; current selected code and attachments remain authoritative.",
    ...messages.map(
      (message) => `${message.role === "user" ? "User" : "Echo"}: ${message.text}`
    )
  ].join("\n\n");
}
function buildEditorContextPrompt(context) {
  return [
    "Use the following selected editor code as private context for the user's current request.",
    "Do not repeat the entire selection unless the user explicitly asks for it.",
    `File: ${context.relativePath}`,
    `Selected lines: ${context.startLine}-${context.endLine}`,
    `\`\`\`${context.languageId}`,
    context.text,
    "```"
  ].join("\n");
}
function buildCurrentPagePrompt(context) {
  return [
    "The user explicitly attached the current editor file with @.",
    "Use it as private context. If selected code is also supplied, the selected code remains the primary context.",
    `File: ${context.relativePath}`,
    `Lines: ${context.startLine}-${context.endLine}`,
    context.truncated ? "Note: The file was truncated at the safe context limit." : "",
    `\`\`\`${context.languageId}`,
    context.text,
    "```"
  ].filter(Boolean).join("\n");
}
function buildWorkspaceContextPrompt(context) {
  if (!context.snippets.length) {
    return context.indexedFileCount > 0 ? [
      `Echo directly searched the open VS Code workspace index (${context.indexedFileCount} source files) but did not retrieve a strong match yet.`,
      "Do not say that you cannot access or search the workspace.",
      "If the request requires a specific file, definition, or usage, call search_workspace with a focused filename or symbol and then call read_workspace_file for the returned path."
    ].join(" ") : [
      "No VS Code workspace folder is currently available to the extension host.",
      "Do not describe this as a general inability to access files.",
      "If repository context is required, clearly ask the user to open the project folder as a VS Code workspace."
    ].join(" ");
  }
  const snippets = context.snippets.map(
    (snippet, index) => [
      `[${index + 1}] ${snippet.filePath} lines ${snippet.startLine}-${snippet.endLine}`,
      `Relevance: ${snippet.reason}`,
      `\`\`\`${snippet.languageId}`,
      snippet.text,
      "```"
    ].join("\n")
  );
  return [
    "Echo searched and read the VS Code workspace and retrieved the following code as secondary supporting context.",
    "They may be incomplete or only lexically related. Prefer the selected code and the user's request if evidence conflicts.",
    "Do not claim that you cannot access or search these files; their contents are included below.",
    ...snippets,
    context.truncated ? "Additional matches were omitted to stay within the context limit." : ""
  ].filter(Boolean).join("\n\n");
}
function buildTextPrompt(userText, context, currentPageContext, workspaceContext, attachmentPrompt = "", conversationPrompt = "") {
  const sections = [];
  if (conversationPrompt) {
    sections.push(conversationPrompt);
  }
  if (context) {
    sections.push(buildEditorContextPrompt(context));
  }
  if (currentPageContext) {
    sections.push(buildCurrentPagePrompt(currentPageContext));
  }
  const workspacePrompt = buildWorkspaceContextPrompt(workspaceContext);
  if (workspacePrompt) {
    sections.push(workspacePrompt);
  }
  if (attachmentPrompt) {
    sections.push(attachmentPrompt);
  }
  sections.push(`User request:
${userText}`);
  return sections.join("\n\n");
}

// src/liveSession.ts
var MODEL = "gemini-3.1-flash-live-preview";
var LIVE_API_ENDPOINT = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";
var LiveSession = class {
  constructor(onEvent) {
    this.onEvent = onEvent;
  }
  socket;
  intentionalClose = false;
  get isConnected() {
    return this.socket?.readyState === wrapper_default.OPEN;
  }
  connect(apiKey, preferences) {
    if (this.socket && (this.socket.readyState === wrapper_default.CONNECTING || this.socket.readyState === wrapper_default.OPEN)) {
      return;
    }
    this.intentionalClose = false;
    this.onEvent({ type: "connecting" });
    const endpoint = `${LIVE_API_ENDPOINT}?key=${encodeURIComponent(apiKey)}`;
    const socket = new wrapper_default(endpoint);
    this.socket = socket;
    socket.on("open", () => {
      if (this.socket !== socket) {
        return;
      }
      socket.send(JSON.stringify(this.createSetupMessage(preferences)));
      this.onEvent({ type: "opened" });
    });
    socket.on("message", (data) => {
      if (this.socket !== socket) {
        return;
      }
      try {
        let jsonText;
        if (Array.isArray(data)) {
          jsonText = Buffer.concat(data).toString("utf8");
        } else if (data instanceof ArrayBuffer) {
          jsonText = Buffer.from(new Uint8Array(data)).toString("utf8");
        } else {
          jsonText = data.toString("utf8");
        }
        const payload = JSON.parse(jsonText);
        this.onEvent({ type: "serverMessage", payload });
      } catch {
        this.onEvent({
          type: "error",
          message: "Gemini returned an unreadable WebSocket message."
        });
      }
    });
    socket.on("error", (error) => {
      if (this.socket === socket) {
        this.onEvent({ type: "error", message: error.message });
      }
    });
    socket.on("close", (code, reason) => {
      if (this.socket !== socket) {
        return;
      }
      this.socket = void 0;
      this.onEvent({
        type: "closed",
        code,
        reason: reason.toString(),
        intentional: this.intentionalClose
      });
    });
  }
  sendAudio(base64Audio) {
    return this.send({
      realtimeInput: {
        audio: {
          data: base64Audio,
          mimeType: "audio/pcm;rate=16000"
        }
      }
    });
  }
  sendPcm16(frame) {
    const audio = Buffer.from(
      frame.buffer,
      frame.byteOffset,
      frame.byteLength
    ).toString("base64");
    return this.sendAudio(audio);
  }
  sendText(text) {
    return this.send({ realtimeInput: { text } });
  }
  /** Interrupt the current model turn by sending an empty realtime input. */
  sendInterrupt() {
    return this.send({ realtimeInput: {} });
  }
  async sendUserTurn(text, images = []) {
    for (const [index, image] of images.entries()) {
      if (!this.send({
        realtimeInput: {
          video: {
            data: image.data,
            mimeType: image.mimeType
          }
        }
      })) {
        return false;
      }
      const isLastImage = index === images.length - 1;
      await delay(isLastImage ? 250 : 1050);
      if (!this.isConnected) {
        return false;
      }
    }
    return this.send({ realtimeInput: { text } });
  }
  sendToolResponses(functionResponses) {
    return this.send({
      toolResponse: {
        functionResponses
      }
    });
  }
  disconnect() {
    const socket = this.socket;
    this.intentionalClose = true;
    this.socket = void 0;
    if (socket && (socket.readyState === wrapper_default.OPEN || socket.readyState === wrapper_default.CONNECTING)) {
      socket.close(1e3, "Client disconnected");
    }
  }
  dispose() {
    this.disconnect();
  }
  send(payload) {
    if (!this.socket || this.socket.readyState !== wrapper_default.OPEN) {
      return false;
    }
    this.socket.send(JSON.stringify(payload));
    return true;
  }
  createSetupMessage(preferences) {
    return {
      setup: {
        model: `models/${MODEL}`,
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: preferences.voice
              }
            }
          }
        },
        systemInstruction: {
          parts: [{ text: buildSystemInstruction(preferences) }]
        },
        tools: [
          {
            functionDeclarations: [
              {
                name: "search_workspace",
                description: "Search the currently open VS Code workspace for files, symbols, definitions, imports, routes, components, and usages. Use this whenever the supplied context does not contain enough code to answer. The result contains real code snippets and paths.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    query: {
                      type: "STRING",
                      description: "A precise filename, symbol, import path, or code-search query."
                    }
                  },
                  required: ["query"]
                }
              },
              {
                name: "read_workspace_file",
                description: "Read a specific workspace file returned by search_workspace. Call this after finding a path when you need more code. Large files can be read in line ranges.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    file_path: {
                      type: "STRING",
                      description: "Workspace-relative file path, such as src/components/TemplateBuilder.jsx."
                    },
                    start_line: {
                      type: "INTEGER",
                      description: "Optional 1-based first line. Defaults to line 1."
                    },
                    end_line: {
                      type: "INTEGER",
                      description: "Optional 1-based last line. Defaults to a bounded section."
                    }
                  },
                  required: ["file_path"]
                }
              },
              {
                name: "render_markdown",
                description: "Displays detailed structured content such as Markdown tables, code blocks, lists, or technical details in the chat UI. Call this whenever a table, code block, structured list, or detailed technical content would improve the answer.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    markdown: {
                      type: "STRING",
                      description: "Complete Markdown content to display."
                    }
                  },
                  required: ["markdown"]
                }
              }
            ]
          }
        ],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        realtimeInputConfig: {
          automaticActivityDetection: {
            disabled: false,
            prefixPaddingMs: 250,
            silenceDurationMs: 700
          },
          activityHandling: preferences.autoInterrupt ? "START_OF_ACTIVITY_INTERRUPTS" : "NO_INTERRUPTION"
        }
      }
    };
  }
};
function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

// src/microphoneCapture.ts
var import_pvrecorder_node = require("@picovoice/pvrecorder-node");
var FRAME_LENGTH = 1024;
var REQUIRED_SAMPLE_RATE = 16e3;
var SPEECH_THRESHOLD = 0.045;
var END_OF_SPEECH_DELAY_MS = 850;
var MicrophoneCapture = class {
  constructor(callbacks) {
    this.callbacks = callbacks;
  }
  recorder;
  running = false;
  speechActive = false;
  speechSilenceStartedAt = 0;
  start() {
    if (this.running) {
      return;
    }
    const recorder = new import_pvrecorder_node.PvRecorder(FRAME_LENGTH, -1, 50);
    if (recorder.sampleRate !== REQUIRED_SAMPLE_RATE) {
      recorder.release();
      throw new Error(
        `The selected microphone uses an unsupported ${recorder.sampleRate} Hz sample rate.`
      );
    }
    recorder.start();
    this.recorder = recorder;
    this.running = true;
    this.speechActive = false;
    this.speechSilenceStartedAt = 0;
    void this.readFrames(recorder);
  }
  stop() {
    this.running = false;
    this.speechActive = false;
    this.speechSilenceStartedAt = 0;
    const recorder = this.recorder;
    this.recorder = void 0;
    if (!recorder) {
      return;
    }
    try {
      if (recorder.isRecording) {
        recorder.stop();
      }
    } finally {
      recorder.release();
    }
    this.callbacks.onLevel(0);
  }
  dispose() {
    this.stop();
  }
  async readFrames(recorder) {
    try {
      while (this.isCurrentRecorder(recorder)) {
        const frame = await recorder.read();
        if (!this.isCurrentRecorder(recorder)) {
          return;
        }
        const level = this.calculateLevel(frame);
        this.updateSpeechState(level);
        this.callbacks.onLevel(level);
        this.callbacks.onFrame(frame);
      }
    } catch (error) {
      if (this.running && this.recorder === recorder) {
        this.running = false;
        this.recorder = void 0;
        try {
          recorder.release();
        } catch {
        }
        this.callbacks.onError(
          error instanceof Error ? error.message : "The microphone stopped unexpectedly."
        );
      }
    }
  }
  isCurrentRecorder(recorder) {
    return this.running && this.recorder === recorder;
  }
  calculateLevel(frame) {
    let energy = 0;
    for (const sample of frame) {
      const normalized = sample / 32768;
      energy += normalized * normalized;
    }
    return Math.sqrt(energy / frame.length);
  }
  updateSpeechState(level) {
    const now = Date.now();
    if (level > SPEECH_THRESHOLD) {
      this.speechSilenceStartedAt = 0;
      if (!this.speechActive) {
        this.speechActive = true;
        this.callbacks.onSpeechStart();
      }
      return;
    }
    if (!this.speechActive) {
      return;
    }
    if (!this.speechSilenceStartedAt) {
      this.speechSilenceStartedAt = now;
    } else if (now - this.speechSilenceStartedAt > END_OF_SPEECH_DELAY_MS) {
      this.speechActive = false;
      this.speechSilenceStartedAt = 0;
    }
  }
};

// src/preferences.ts
var vscode4 = __toESM(require("vscode"));

// src/types.ts
var GEMINI_VOICES = [
  "Zephyr",
  "Puck",
  "Charon",
  "Kore",
  "Fenrir",
  "Leda",
  "Orus",
  "Aoede",
  "Callirrhoe",
  "Autonoe",
  "Enceladus",
  "Iapetus",
  "Umbriel",
  "Algieba",
  "Despina",
  "Erinome",
  "Algenib",
  "Rasalgethi",
  "Laomedeia",
  "Achernar",
  "Alnilam",
  "Schedar",
  "Gacrux",
  "Pulcherrima",
  "Achird",
  "Zubenelgenubi",
  "Vindemiatrix",
  "Sadachbia",
  "Sadaltager",
  "Sulafat"
];
var PREFERRED_LANGUAGES = [
  "English",
  "Hindi",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Japanese",
  "Korean",
  "Mandarin Chinese",
  "Arabic",
  "Russian",
  "Italian",
  "Bengali",
  "Marathi",
  "Tamil",
  "Telugu",
  "Turkish",
  "Indonesian"
];
var BEHAVIORS = ["professional", "friendly", "expert"];

// src/preferences.ts
function isOneOf(value, allowed) {
  return value !== void 0 && allowed.some((item) => item === value);
}
function readPreferences() {
  const configuration = vscode4.workspace.getConfiguration("liveline");
  const voiceValue = configuration.get("voice");
  const languageValue = configuration.get("preferredLanguage");
  const behaviorValue = configuration.get("behavior");
  return {
    voice: isOneOf(voiceValue, GEMINI_VOICES) ? voiceValue : "Kore",
    preferredLanguage: isOneOf(languageValue, PREFERRED_LANGUAGES) ? languageValue : "English",
    autoInterrupt: configuration.get("autoInterrupt", true),
    behavior: isOneOf(behaviorValue, BEHAVIORS) ? behaviorValue : "professional"
  };
}
async function savePreferences(preferences) {
  if (!isOneOf(preferences.voice, GEMINI_VOICES) || !isOneOf(preferences.preferredLanguage, PREFERRED_LANGUAGES) || !isOneOf(preferences.behavior, BEHAVIORS) || typeof preferences.autoInterrupt !== "boolean") {
    throw new Error("One or more Echo settings are invalid.");
  }
  const configuration = vscode4.workspace.getConfiguration("liveline");
  await Promise.all([
    configuration.update(
      "voice",
      preferences.voice,
      vscode4.ConfigurationTarget.Global
    ),
    configuration.update(
      "preferredLanguage",
      preferences.preferredLanguage,
      vscode4.ConfigurationTarget.Global
    ),
    configuration.update(
      "autoInterrupt",
      preferences.autoInterrupt,
      vscode4.ConfigurationTarget.Global
    ),
    configuration.update(
      "behavior",
      preferences.behavior,
      vscode4.ConfigurationTarget.Global
    )
  ]);
  return readPreferences();
}

// src/workspaceContext.ts
var import_node_path3 = require("node:path");
var vscode5 = __toESM(require("vscode"));
var SOURCE_GLOB = "**/*.{c,cc,cpp,cs,css,dart,go,h,hpp,html,java,js,jsx,json,jsonc,kt,kts,md,php,py,rb,rs,scss,sh,sql,svelte,swift,ts,tsx,vue,yaml,yml}";
var EXCLUDE_GLOB = "**/{.git,.next,.nuxt,.output,.venv,build,coverage,dist,node_modules,out,target,vendor}/**";
var SOURCE_EXTENSIONS = /* @__PURE__ */ new Set([
  ".c",
  ".cc",
  ".cpp",
  ".cs",
  ".css",
  ".dart",
  ".go",
  ".h",
  ".hpp",
  ".html",
  ".java",
  ".js",
  ".jsx",
  ".json",
  ".jsonc",
  ".kt",
  ".kts",
  ".md",
  ".php",
  ".py",
  ".rb",
  ".rs",
  ".scss",
  ".sh",
  ".sql",
  ".svelte",
  ".swift",
  ".ts",
  ".tsx",
  ".vue",
  ".yaml",
  ".yml"
]);
var EXCLUDED_SEGMENTS = /* @__PURE__ */ new Set([
  ".git",
  ".next",
  ".nuxt",
  ".output",
  ".venv",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "target",
  "vendor"
]);
var LANGUAGE_KEYWORDS = /* @__PURE__ */ new Set([
  "abstract",
  "async",
  "await",
  "boolean",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "default",
  "delete",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "float",
  "for",
  "from",
  "function",
  "if",
  "implements",
  "import",
  "instanceof",
  "interface",
  "let",
  "new",
  "null",
  "number",
  "package",
  "private",
  "protected",
  "public",
  "readonly",
  "return",
  "static",
  "string",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "type",
  "typeof",
  "undefined",
  "var",
  "void",
  "while",
  "with",
  "yield"
]);
var MAX_INDEXED_FILES = 1500;
var MAX_FILE_BYTES = 384 * 1024;
var MAX_TOKENS_PER_FILE = 2e3;
var MAX_SEARCH_TERMS = 10;
var MAX_WORKSPACE_SYMBOL_QUERIES = 4;
var MAX_SNIPPETS = 7;
var MAX_SNIPPET_LINES = 70;
var SNIPPET_PADDING_LINES = 12;
var MAX_CONTEXT_CHARACTERS = 24e3;
var MAX_DIRECT_FILE_CHARACTERS = 2e4;
var MAX_DIRECT_FILE_LINES = 300;
var MAX_TOOL_FILE_CHARACTERS = 3e4;
var MAX_TOOL_FILE_LINES = 300;
var INITIAL_INDEX_WAIT_MS = 2e3;
var WorkspaceContextRetriever = class {
  files = /* @__PURE__ */ new Map();
  tokenFiles = /* @__PURE__ */ new Map();
  updateTimers = /* @__PURE__ */ new Map();
  watcher;
  indexPromise;
  constructor() {
    this.watcher = vscode5.workspace.createFileSystemWatcher(SOURCE_GLOB);
    this.watcher.onDidCreate((uri) => {
      this.scheduleIndexUpdate(uri);
    });
    this.watcher.onDidChange((uri) => {
      this.scheduleIndexUpdate(uri);
    });
    this.watcher.onDidDelete((uri) => {
      this.removeIndexedFile(uri.toString());
    });
    if (vscode5.workspace.workspaceFolders?.length) {
      void this.ensureIndex();
    }
  }
  async retrieve(userText, primaryContext) {
    if (!vscode5.workspace.workspaceFolders?.length) {
      return { snippets: [], indexedFileCount: 0, truncated: false };
    }
    const fileHints = extractFileHints(userText);
    const indexPromise = this.ensureIndex();
    if (fileHints.length) {
      await indexPromise;
    } else {
      await Promise.race([
        indexPromise,
        new Promise((resolve) => {
          setTimeout(resolve, INITIAL_INDEX_WAIT_MS);
        })
      ]);
    }
    const rankedTerms = rankSearchTerms(
      userText,
      primaryContext?.text ?? ""
    );
    const terms = rankedTerms.length ? rankedTerms : fileHints.map((hint) => (0, import_node_path3.basename)(hint, (0, import_node_path3.extname)(hint))).filter(Boolean).slice(0, MAX_SEARCH_TERMS);
    if (!terms.length) {
      return {
        snippets: [],
        indexedFileCount: this.files.size,
        truncated: false
      };
    }
    const candidates = this.rankLexicalCandidates(
      terms,
      primaryContext?.uri
    );
    await this.addDirectFileCandidates(
      fileHints,
      candidates,
      primaryContext?.uri
    );
    await this.addWorkspaceSymbolCandidates(terms, candidates);
    const snippets = [];
    if (primaryContext) {
      const enclosingSnippet = await this.createEnclosingSymbolSnippet(
        primaryContext
      );
      if (enclosingSnippet) {
        snippets.push(enclosingSnippet);
      }
    }
    const rankedCandidates = [...candidates.values()].sort((left, right) => right.score - left.score).slice(0, MAX_SNIPPETS * 2);
    for (const candidate of rankedCandidates) {
      if (snippets.length >= MAX_SNIPPETS) {
        break;
      }
      const snippet = await this.createCandidateSnippet(candidate, terms);
      if (snippet && !snippets.some(
        (existing) => existing.filePath === snippet.filePath && existing.startLine === snippet.startLine && existing.endLine === snippet.endLine
      )) {
        snippets.push(snippet);
      }
    }
    return limitContextCharacters(snippets, this.files.size);
  }
  async readFile(requestedPath, requestedStartLine, requestedEndLine) {
    if (!vscode5.workspace.workspaceFolders?.length) {
      throw new Error("No VS Code workspace is open.");
    }
    const normalizedPath = normalizeRelativePath(requestedPath);
    if (!normalizedPath) {
      throw new Error("A workspace-relative file path is required.");
    }
    await this.ensureIndex();
    let matchingFiles = [...this.files.values()].filter((file) => {
      const candidatePath = normalizeRelativePath(file.relativePath);
      return candidatePath === normalizedPath || candidatePath.endsWith(`/${normalizedPath}`);
    });
    if (!matchingFiles.length) {
      const requestedName = (0, import_node_path3.basename)(normalizedPath);
      matchingFiles = [...this.files.values()].filter(
        (file) => (0, import_node_path3.basename)(normalizeRelativePath(file.relativePath)) === requestedName
      );
    }
    if (!matchingFiles.length && isSafeFileName((0, import_node_path3.basename)(normalizedPath))) {
      const discoveredUris = await vscode5.workspace.findFiles(
        `**/${(0, import_node_path3.basename)(normalizedPath)}`,
        EXCLUDE_GLOB,
        20
      );
      matchingFiles = discoveredUris.filter(isSourceFile).map((uri) => ({
        uri,
        relativePath: vscode5.workspace.asRelativePath(uri, false),
        tokens: /* @__PURE__ */ new Set()
      }));
    }
    if (!matchingFiles.length) {
      throw new Error(`Workspace file not found: ${requestedPath}`);
    }
    matchingFiles.sort(
      (left, right) => left.relativePath.length - right.relativePath.length
    );
    const selectedFile = matchingFiles[0];
    if (!selectedFile) {
      throw new Error(`Workspace file not found: ${requestedPath}`);
    }
    const document = await vscode5.workspace.openTextDocument(selectedFile.uri);
    const startLine = clampLineNumber(
      requestedStartLine,
      1,
      document.lineCount
    );
    const defaultEndLine = Math.min(
      document.lineCount,
      startLine + MAX_TOOL_FILE_LINES - 1
    );
    const requestedEnd = clampLineNumber(
      requestedEndLine,
      defaultEndLine,
      document.lineCount
    );
    const endLine = Math.min(
      document.lineCount,
      Math.max(startLine, requestedEnd),
      startLine + MAX_TOOL_FILE_LINES - 1
    );
    const range = new vscode5.Range(
      startLine - 1,
      0,
      endLine - 1,
      Number.MAX_SAFE_INTEGER
    );
    const completeRangeText = document.getText(range);
    const text = completeRangeText.slice(0, MAX_TOOL_FILE_CHARACTERS);
    return {
      filePath: selectedFile.relativePath,
      languageId: document.languageId,
      startLine,
      endLine,
      text,
      totalLines: document.lineCount,
      truncated: endLine < document.lineCount || text.length < completeRangeText.length
    };
  }
  dispose() {
    this.watcher.dispose();
    for (const timer of this.updateTimers.values()) {
      clearTimeout(timer);
    }
    this.updateTimers.clear();
    this.files.clear();
    this.tokenFiles.clear();
  }
  ensureIndex() {
    this.indexPromise ??= this.buildIndex();
    return this.indexPromise;
  }
  async buildIndex() {
    const uris = await vscode5.workspace.findFiles(
      SOURCE_GLOB,
      EXCLUDE_GLOB,
      MAX_INDEXED_FILES
    );
    const workerCount = Math.min(8, uris.length);
    let cursor = 0;
    const workers = Array.from({ length: workerCount }, async () => {
      while (cursor < uris.length) {
        const uri = uris[cursor];
        cursor += 1;
        if (uri) {
          await this.indexFile(uri);
        }
      }
    });
    await Promise.all(workers);
  }
  scheduleIndexUpdate(uri) {
    if (!isSourceFile(uri)) {
      return;
    }
    const key = uri.toString();
    const existingTimer = this.updateTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    const timer = setTimeout(() => {
      this.updateTimers.delete(key);
      void this.indexFile(uri);
    }, 250);
    this.updateTimers.set(key, timer);
  }
  async indexFile(uri) {
    if (!isSourceFile(uri)) {
      return;
    }
    try {
      const stat = await vscode5.workspace.fs.stat(uri);
      if (stat.size > MAX_FILE_BYTES) {
        this.removeIndexedFile(uri.toString());
        return;
      }
      const bytes = await vscode5.workspace.fs.readFile(uri);
      const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      if (text.includes("\0")) {
        return;
      }
      const relativePath = vscode5.workspace.asRelativePath(uri, false);
      const tokens = collectIndexTokens(`${relativePath}
${text}`);
      const key = uri.toString();
      this.removeIndexedFile(key);
      const indexedFile = {
        uri,
        relativePath,
        tokens
      };
      this.files.set(key, indexedFile);
      for (const token of tokens) {
        let matchingFiles = this.tokenFiles.get(token);
        if (!matchingFiles) {
          matchingFiles = /* @__PURE__ */ new Set();
          this.tokenFiles.set(token, matchingFiles);
        }
        matchingFiles.add(key);
      }
    } catch {
      this.removeIndexedFile(uri.toString());
    }
  }
  removeIndexedFile(key) {
    const previous = this.files.get(key);
    if (!previous) {
      return;
    }
    this.files.delete(key);
    for (const token of previous.tokens) {
      const matchingFiles = this.tokenFiles.get(token);
      matchingFiles?.delete(key);
      if (matchingFiles?.size === 0) {
        this.tokenFiles.delete(token);
      }
    }
  }
  rankLexicalCandidates(terms, primaryUri) {
    const candidates = /* @__PURE__ */ new Map();
    for (const [termIndex, term] of terms.entries()) {
      const matchingFiles = this.tokenFiles.get(term.toLowerCase());
      if (!matchingFiles?.size || matchingFiles.size > 120) {
        continue;
      }
      const rarityScore = Math.max(1, 8 - Math.log2(matchingFiles.size + 1));
      const termScore = rarityScore + (MAX_SEARCH_TERMS - termIndex) * 0.35;
      for (const key of matchingFiles) {
        if (key === primaryUri) {
          continue;
        }
        const indexedFile = this.files.get(key);
        if (!indexedFile) {
          continue;
        }
        const candidate = candidates.get(key) ?? {
          uri: indexedFile.uri,
          score: 0,
          reason: `Matches ${term}`
        };
        candidate.score += termScore;
        if (indexedFile.relativePath.toLowerCase().includes(term.toLowerCase())) {
          candidate.score += 4;
        }
        candidates.set(key, candidate);
      }
    }
    return candidates;
  }
  async addDirectFileCandidates(fileHints, candidates, primaryUri) {
    if (!fileHints.length) {
      return;
    }
    for (const [key, indexedFile] of this.files) {
      if (key === primaryUri) {
        continue;
      }
      const normalizedPath = indexedFile.relativePath.replaceAll("\\", "/").toLowerCase();
      const fileName = (0, import_node_path3.basename)(normalizedPath);
      const matchingHint = fileHints.find((hint) => {
        const normalizedHint = hint.replaceAll("\\", "/").replace(/^(\.\.\/|\.\/)+/, "").toLowerCase();
        return fileName === (0, import_node_path3.basename)(normalizedHint) || normalizedPath.endsWith(normalizedHint) || normalizedPath.includes(normalizedHint);
      });
      if (!matchingHint) {
        continue;
      }
      const existing = candidates.get(key) ?? {
        uri: indexedFile.uri,
        score: 0,
        reason: `Requested file ${matchingHint}`
      };
      existing.score += 100;
      existing.directFile = true;
      existing.reason = `Requested file ${matchingHint}`;
      candidates.set(key, existing);
    }
    const discoveredFiles = await Promise.all(
      fileHints.map(async (hint) => {
        const fileName = (0, import_node_path3.basename)(normalizeRelativePath(hint));
        if (!isSafeFileName(fileName)) {
          return [];
        }
        return vscode5.workspace.findFiles(
          `**/${fileName}`,
          EXCLUDE_GLOB,
          20
        );
      })
    );
    for (const [hintIndex, uris] of discoveredFiles.entries()) {
      const hint = fileHints[hintIndex] ?? "requested file";
      for (const uri of uris) {
        const key = uri.toString();
        if (key === primaryUri || !isSourceFile(uri)) {
          continue;
        }
        const existing = candidates.get(key) ?? {
          uri,
          score: 0,
          reason: `Requested file ${hint}`
        };
        existing.score += 100;
        existing.directFile = true;
        existing.reason = `Requested file ${hint}`;
        candidates.set(key, existing);
      }
    }
  }
  async addWorkspaceSymbolCandidates(terms, candidates) {
    const symbolResults = await Promise.all(
      terms.slice(0, MAX_WORKSPACE_SYMBOL_QUERIES).map(async (term) => {
        try {
          return await vscode5.commands.executeCommand(
            "vscode.executeWorkspaceSymbolProvider",
            term
          );
        } catch {
          return [];
        }
      })
    );
    for (const symbols of symbolResults) {
      for (const symbol of symbols.slice(0, 8)) {
        const key = symbol.location.uri.toString();
        const existing = candidates.get(key) ?? {
          uri: symbol.location.uri,
          score: 0,
          reason: `Defines symbol ${symbol.name}`
        };
        existing.score += 12;
        existing.anchorLine = symbol.location.range.start.line;
        existing.reason = `Defines symbol ${symbol.name}`;
        candidates.set(key, existing);
      }
    }
  }
  async createEnclosingSymbolSnippet(context) {
    const uri = vscode5.Uri.parse(context.uri);
    const symbols = await getDocumentSymbols(uri);
    const selectionRange = new vscode5.Range(
      Math.max(0, context.startLine - 1),
      0,
      Math.max(0, context.endLine - 1),
      Number.MAX_SAFE_INTEGER
    );
    const enclosing = symbols.filter((symbol) => symbol.range.contains(selectionRange)).sort(
      (left, right) => lineCount(left.range) - lineCount(right.range)
    )[0];
    if (!enclosing || lineCount(enclosing.range) <= context.endLine - context.startLine + 3) {
      return void 0;
    }
    const document = await vscode5.workspace.openTextDocument(uri);
    const range = clampRange(enclosing.range, document.lineCount);
    return {
      filePath: vscode5.workspace.asRelativePath(uri, false),
      languageId: document.languageId,
      startLine: range.start.line + 1,
      endLine: range.end.line + 1,
      text: document.getText(range),
      reason: `Enclosing symbol ${enclosing.name}`
    };
  }
  async createCandidateSnippet(candidate, terms) {
    try {
      const document = await vscode5.workspace.openTextDocument(candidate.uri);
      const completeText = document.getText();
      if (completeText.length > MAX_FILE_BYTES) {
        return void 0;
      }
      if (candidate.directFile && completeText.length <= MAX_DIRECT_FILE_CHARACTERS && document.lineCount <= MAX_DIRECT_FILE_LINES) {
        return {
          filePath: vscode5.workspace.asRelativePath(candidate.uri, false),
          languageId: document.languageId,
          startLine: 1,
          endLine: document.lineCount,
          text: completeText,
          reason: candidate.reason
        };
      }
      const symbols = await getDocumentSymbols(candidate.uri);
      const matchingSymbol = symbols.filter(
        (symbol) => terms.some(
          (term) => symbol.name.toLowerCase().includes(term.toLowerCase())
        )
      ).sort(
        (left, right) => lineCount(left.range) - lineCount(right.range)
      )[0];
      let range;
      let reason = candidate.reason;
      if (matchingSymbol && lineCount(matchingSymbol.range) <= MAX_SNIPPET_LINES) {
        range = matchingSymbol.range;
        reason = `Relevant symbol ${matchingSymbol.name}`;
      } else {
        const anchorLine = candidate.anchorLine ?? findBestMatchingLine(document, terms);
        range = new vscode5.Range(
          Math.max(0, anchorLine - SNIPPET_PADDING_LINES),
          0,
          Math.min(
            document.lineCount - 1,
            anchorLine + SNIPPET_PADDING_LINES
          ),
          Number.MAX_SAFE_INTEGER
        );
      }
      const safeRange = clampRange(range, document.lineCount);
      return {
        filePath: vscode5.workspace.asRelativePath(candidate.uri, false),
        languageId: document.languageId,
        startLine: safeRange.start.line + 1,
        endLine: safeRange.end.line + 1,
        text: document.getText(safeRange),
        reason
      };
    } catch {
      return void 0;
    }
  }
};
function normalizeRelativePath(value) {
  return value.trim().replaceAll("\\", "/").replace(/^(\.\.\/|\.\/|\/)+/, "").toLowerCase();
}
function clampLineNumber(value, fallback, maximum) {
  if (value === void 0 || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(maximum, Math.max(1, Math.floor(value)));
}
function isSafeFileName(value) {
  return /^[.@\w-]+\.[A-Za-z0-9]+$/u.test(value);
}
function isSourceFile(uri) {
  if (!SOURCE_EXTENSIONS.has((0, import_node_path3.extname)(uri.path).toLowerCase())) {
    return false;
  }
  return !uri.path.split("/").some((segment) => EXCLUDED_SEGMENTS.has(segment.toLowerCase()));
}
function collectIndexTokens(text) {
  const tokens = /* @__PURE__ */ new Set();
  const identifierPattern = /[$A-Z_a-z][$\w]{2,}/g;
  for (const match of text.matchAll(identifierPattern)) {
    const token = match[0].toLowerCase();
    if (!LANGUAGE_KEYWORDS.has(token)) {
      tokens.add(token);
      if (tokens.size >= MAX_TOKENS_PER_FILE) {
        break;
      }
    }
  }
  return tokens;
}
function rankSearchTerms(userText, selectedText) {
  const scores = /* @__PURE__ */ new Map();
  scoreTerms(userText, 8, scores);
  scoreTerms(selectedText, 3, scores);
  return [...scores.values()].sort((left, right) => right.score - left.score).slice(0, MAX_SEARCH_TERMS).map((entry) => entry.original);
}
function extractFileHints(text) {
  const extensionPattern = "(?:c|cc|cpp|cs|css|dart|go|h|hpp|html|java|js|jsx|json|jsonc|kt|kts|md|php|py|rb|rs|scss|sh|sql|svelte|swift|ts|tsx|vue|yaml|yml)";
  const filePattern = new RegExp(
    `(?:^|[\\s"'\\x60(])((?:[.@\\w-]+[\\\\/])*[.@\\w-]+\\.${extensionPattern})(?=$|[\\s"'\\x60),:;?])`,
    "giu"
  );
  const hints = /* @__PURE__ */ new Set();
  for (const match of text.matchAll(filePattern)) {
    const hint = match[1]?.trim();
    if (hint) {
      hints.add(hint);
    }
  }
  return [...hints];
}
function scoreTerms(text, baseScore, scores) {
  const identifierPattern = /[$A-Z_a-z][$\w]{2,}/g;
  for (const match of text.matchAll(identifierPattern)) {
    const original = match[0];
    if (!original) {
      continue;
    }
    const normalized = original.toLowerCase();
    if (LANGUAGE_KEYWORDS.has(normalized)) {
      continue;
    }
    const nextCharacter = text[match.index + original.length];
    const symbolBonus = nextCharacter === "(" || /[A-Z]/.test(original.slice(1)) || original.includes("_") ? 4 : 0;
    const previous = scores.get(normalized);
    scores.set(normalized, {
      original,
      score: (previous?.score ?? 0) + baseScore + symbolBonus
    });
  }
}
async function getDocumentSymbols(uri) {
  try {
    const symbols = await vscode5.commands.executeCommand("vscode.executeDocumentSymbolProvider", uri);
    return flattenSymbols(symbols);
  } catch {
    return [];
  }
}
function flattenSymbols(symbols) {
  const flattened = [];
  for (const symbol of symbols) {
    if (symbol instanceof vscode5.DocumentSymbol) {
      flattened.push({ name: symbol.name, range: symbol.range });
      flattened.push(...flattenSymbols(symbol.children));
    } else {
      flattened.push({
        name: symbol.name,
        range: symbol.location.range
      });
    }
  }
  return flattened;
}
function findBestMatchingLine(document, terms) {
  let bestLine = 0;
  let bestScore = -1;
  const normalizedTerms = terms.map((term) => term.toLowerCase());
  for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex += 1) {
    const lineText = document.lineAt(lineIndex).text.toLowerCase();
    const score = normalizedTerms.reduce(
      (total, term, termIndex) => total + (lineText.includes(term) ? terms.length - termIndex : 0),
      0
    );
    if (score > bestScore) {
      bestLine = lineIndex;
      bestScore = score;
    }
  }
  return bestLine;
}
function clampRange(range, documentLineCount) {
  const lastLine = Math.max(0, documentLineCount - 1);
  const startLine = Math.min(range.start.line, lastLine);
  const endLine = Math.min(
    Math.max(startLine, range.end.line),
    Math.min(lastLine, startLine + MAX_SNIPPET_LINES - 1)
  );
  return new vscode5.Range(
    startLine,
    0,
    endLine,
    Number.MAX_SAFE_INTEGER
  );
}
function lineCount(range) {
  return range.end.line - range.start.line + 1;
}
function limitContextCharacters(snippets, indexedFileCount) {
  const accepted = [];
  let characterCount = 0;
  for (const snippet of snippets) {
    const nextCount = characterCount + snippet.text.length;
    if (nextCount > MAX_CONTEXT_CHARACTERS) {
      return {
        snippets: accepted,
        indexedFileCount,
        truncated: true
      };
    }
    accepted.push(snippet);
    characterCount = nextCount;
  }
  return {
    snippets: accepted,
    indexedFileCount,
    truncated: false
  };
}

// src/extension.ts
var API_KEY_SECRET = "liveline.geminiApiKey";
var VIEW_ID = "liveline.chatView";
var MAX_APPLY_TARGETS = 20;
var MAX_PATCH_CHARACTERS = 1e6;
var MAX_WORKSPACE_TOOL_CALLS_PER_TURN = 8;
var EchoViewProvider = class {
  constructor(extensionUri, secrets, globalStorageUri) {
    this.extensionUri = extensionUri;
    this.secrets = secrets;
    this.chatHistory = new ChatHistoryStore(globalStorageUri);
    this.disposables.push(
      vscode6.window.onDidChangeTextEditorSelection(() => {
        this.postEditorContextState();
      }),
      vscode6.window.onDidChangeActiveTextEditor(() => {
        this.postEditorContextState();
      }),
      vscode6.workspace.onDidChangeTextDocument((event) => {
        if (event.document.uri.toString() === vscode6.window.activeTextEditor?.document.uri.toString()) {
          this.postEditorContextState();
        }
      }),
      vscode6.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration("liveline")) {
          this.post({
            type: "preferences",
            preferences: readPreferences()
          });
        }
      })
    );
  }
  view;
  session;
  microphone;
  disposables = [];
  workspaceContextRetriever = new WorkspaceContextRetriever();
  applyTargets = /* @__PURE__ */ new Map();
  attachmentStore = new AttachmentStore();
  chatHistory;
  turnPrimaryContext;
  workspaceToolCallsThisTurn = 0;
  micMuted = false;
  resolveWebviewView(view) {
    this.view = view;
    const distributionUri = vscode6.Uri.joinPath(this.extensionUri, "dist");
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [distributionUri]
    };
    view.webview.html = this.getHtml(view.webview);
    this.disposables.push(
      view.webview.onDidReceiveMessage(
        (message) => this.handleMessage(message)
      ),
      view.onDidDispose(() => {
        this.disposeLiveResources();
        this.view = void 0;
      })
    );
  }
  async configureApiKey() {
    const apiKey = await vscode6.window.showInputBox({
      ignoreFocusOut: true,
      password: true,
      placeHolder: "AIza...",
      prompt: "Enter your Google AI Studio Gemini API key",
      title: "Configure Echo"
    });
    if (apiKey === void 0) {
      return;
    }
    if (!apiKey.trim()) {
      void vscode6.window.showErrorMessage("The Gemini API key cannot be empty.");
      return;
    }
    await this.secrets.store(API_KEY_SECRET, apiKey.trim());
    await this.postApiStatus();
    void vscode6.window.showInformationMessage("Echo API key saved securely.");
  }
  dispose() {
    this.disposeLiveResources();
    this.disposables.forEach((disposable) => {
      disposable.dispose();
    });
    this.workspaceContextRetriever.dispose();
  }
  async handleMessage(message) {
    try {
      switch (message.type) {
        case "ready":
          await this.sendInitialState();
          break;
        case "saveApiKey":
          await this.saveApiKey(message.value);
          break;
        case "removeApiKey":
          await this.removeApiKey();
          break;
        case "savePreferences":
          await this.updatePreferences(message.preferences);
          break;
        case "startSession":
          await this.startSession();
          break;
        case "stopSession":
          this.stopSession();
          break;
        case "sendText":
          await this.sendText(
            message.value,
            message.requestId,
            message.chatId,
            message.includeCurrentPage,
            message.currentPageUri,
            message.attachmentIds
          );
          break;
        case "pickFileAttachments":
          await this.pickFileAttachments();
          break;
        case "pickImageAttachments":
          await this.pickImageAttachments();
          break;
        case "removeAttachment":
          this.removeAttachment(message.value);
          break;
        case "saveChat":
          await this.saveChat(message.chat);
          break;
        case "loadChat":
          await this.loadChat(message.chatId);
          break;
        case "deleteChat":
          await this.deleteChat(message.chatId);
          break;
        case "copyCode":
          await this.copyCode(message.code, message.actionId);
          break;
        case "applyPatch":
          await this.applyPatch(
            message.code,
            message.targetId,
            message.actionId
          );
          break;
        case "muteMic":
          this.micMuted = Boolean(message.muted);
          this.post({
            type: "micMuted",
            muted: this.micMuted,
            level: this.micMuted ? 0 : void 0
          });
          break;
        case "interruptTurn":
          this.session?.sendInterrupt();
          break;
        case "sendToolResponse":
          this.sendToolResponse(message.functionResponse);
          break;
      }
    } catch (error) {
      this.post({
        type: "hostError",
        message: error instanceof Error ? error.message : "Echo could not continue."
      });
    }
  }
  async sendInitialState() {
    await this.chatHistory.initialize();
    this.post({
      type: "initialState",
      apiConfigured: Boolean(await this.secrets.get(API_KEY_SECRET)),
      preferences: readPreferences(),
      selection: summarizeEditorContext(captureEditorContext()),
      currentPage: summarizeCurrentPage(captureCurrentPageContext()),
      attachments: this.attachmentStore.list(),
      chats: await this.chatHistory.list()
    });
  }
  async saveApiKey(value) {
    const apiKey = value?.trim();
    if (!apiKey) {
      throw new Error("Enter a Gemini API key before saving.");
    }
    await this.secrets.store(API_KEY_SECRET, apiKey);
    await this.postApiStatus();
  }
  async removeApiKey() {
    this.stopSession();
    await this.secrets.delete(API_KEY_SECRET);
    await this.postApiStatus();
  }
  async updatePreferences(preferences) {
    if (!preferences) {
      throw new Error("Echo settings were not provided.");
    }
    const savedPreferences = await savePreferences(preferences);
    this.post({
      type: "preferencesSaved",
      preferences: savedPreferences
    });
  }
  async startSession() {
    const apiKey = await this.secrets.get(API_KEY_SECRET);
    if (!apiKey) {
      this.post({ type: "apiRequired" });
      return;
    }
    this.disposeLiveResources();
    this.session = new LiveSession((event) => {
      this.handleSessionEvent(event);
    });
    this.microphone = new MicrophoneCapture({
      onFrame: (frame) => {
        if (!this.micMuted) {
          this.session?.sendPcm16(frame);
        }
      },
      onLevel: (level) => {
        this.post({ type: "microphoneLevel", level });
      },
      onSpeechStart: () => {
        void this.sendVoiceContext();
      },
      onError: (message) => {
        this.post({ type: "sessionError", message });
        this.stopSession();
      }
    });
    try {
      this.microphone.start();
      this.session.connect(apiKey, readPreferences());
    } catch (error) {
      this.disposeLiveResources();
      throw new Error(
        error instanceof Error ? `Could not open the default microphone: ${error.message}` : "Could not open the default microphone."
      );
    }
  }
  stopSession() {
    this.disposeLiveResources();
    this.post({ type: "sessionStopped" });
  }
  async sendText(text, requestId, chatId, includeCurrentPage, currentPageUri, attachmentIds) {
    const userText = text?.trim();
    if (!userText || !this.session?.isConnected) {
      this.post({
        type: "textRejected",
        requestId,
        message: "Start a live session before sending a message."
      });
      return;
    }
    const context = captureEditorContext();
    const currentPageContext = includeCurrentPage ? captureCurrentPageContext(currentPageUri) : void 0;
    const applyTargetId = this.registerApplyTarget(context);
    this.turnPrimaryContext = context;
    this.workspaceToolCallsThisTurn = 0;
    const requestedAttachmentIds = attachmentIds ?? [];
    const preparedAttachments = await this.attachmentStore.prepare(
      requestedAttachmentIds
    );
    this.post({
      type: "textAccepted",
      requestId,
      text: userText,
      context: summarizeEditorContext(context),
      currentPage: summarizeCurrentPage(currentPageContext),
      applyTargetId,
      attachments: requestedAttachmentIds
    });
    const announceSearch = shouldAnnounceWorkspaceSearch(userText);
    if (announceSearch) {
      this.post({
        type: "workspaceSearchStarted",
        requestId,
        message: "Let me search the workspace and read the relevant code."
      });
    }
    const workspaceContext = await this.workspaceContextRetriever.retrieve(
      userText,
      context
    );
    if (announceSearch) {
      this.postWorkspaceSearchCompleted(requestId, workspaceContext);
    }
    const conversationPrompt = buildConversationHistoryPrompt(
      await this.chatHistory.conversationContext(chatId)
    );
    const prompt = buildTextPrompt(
      userText,
      context,
      currentPageContext,
      workspaceContext,
      preparedAttachments.prompt,
      conversationPrompt
    );
    const session = this.session;
    if (!await session.sendUserTurn(prompt, preparedAttachments.images) || session !== this.session) {
      this.post({
        type: "textRejected",
        requestId,
        message: "The message could not be sent."
      });
      return;
    }
    this.attachmentStore.release(requestedAttachmentIds);
    this.postAttachmentState();
  }
  sendToolResponse(functionResponse) {
    if (!functionResponse) {
      return;
    }
    const session = this.session;
    if (!session) {
      return;
    }
    session.sendToolResponses([functionResponse]);
  }
  async pickFileAttachments() {
    try {
      await this.attachmentStore.pickTextFiles();
    } finally {
      this.postAttachmentState();
    }
  }
  async pickImageAttachments() {
    try {
      await this.attachmentStore.pickImages();
    } finally {
      this.postAttachmentState();
    }
  }
  removeAttachment(id) {
    if (id) {
      this.attachmentStore.remove(id);
      this.postAttachmentState();
    }
  }
  async saveChat(chat) {
    if (!chat) {
      throw new Error("The chat content was not provided.");
    }
    const saved = await this.chatHistory.save(chat);
    this.post({
      type: "chatSaved",
      chatId: saved.id,
      chats: await this.chatHistory.list()
    });
  }
  async loadChat(chatId) {
    if (!chatId) {
      throw new Error("Choose a saved chat to reuse.");
    }
    this.post({
      type: "chatLoaded",
      chat: await this.chatHistory.read(chatId)
    });
  }
  async deleteChat(chatId) {
    if (!chatId) {
      throw new Error("Choose a saved chat to delete.");
    }
    const confirmation = await vscode6.window.showWarningMessage(
      "Delete this saved Echo chat? This cannot be undone.",
      { modal: true },
      "Delete"
    );
    if (confirmation !== "Delete") {
      return;
    }
    await this.chatHistory.delete(chatId);
    this.post({
      type: "chatDeleted",
      chatId,
      chats: await this.chatHistory.list()
    });
  }
  async sendVoiceContext() {
    const context = captureEditorContext();
    const session = this.session;
    this.turnPrimaryContext = context;
    this.workspaceToolCallsThisTurn = 0;
    if (context && session?.isConnected) {
      const workspaceContext = await this.workspaceContextRetriever.retrieve(
        "",
        context
      );
      if (session !== this.session || !this.session.isConnected) {
        return;
      }
      const workspacePrompt = buildWorkspaceContextPrompt(workspaceContext);
      session.sendText(
        [
          buildEditorContextPrompt(context),
          workspacePrompt,
          "The user is now asking a voice question about this context."
        ].filter(Boolean).join("\n\n")
      );
    }
    this.post({
      type: "voiceContext",
      context: summarizeEditorContext(context),
      applyTargetId: this.registerApplyTarget(context)
    });
  }
  handleSessionEvent(event) {
    switch (event.type) {
      case "connecting":
        this.post({ type: "sessionConnecting" });
        break;
      case "opened":
        this.post({ type: "sessionOpened" });
        break;
      case "serverMessage":
        void this.handleWorkspaceToolCalls(event.payload);
        this.post({ type: "serverMessage", payload: event.payload });
        break;
      case "error":
        this.post({ type: "sessionError", message: event.message });
        break;
      case "closed":
        this.microphone?.dispose();
        this.microphone = void 0;
        this.session = void 0;
        this.post({
          type: "sessionClosed",
          code: event.code,
          reason: event.reason,
          intentional: event.intentional
        });
        break;
    }
  }
  disposeLiveResources() {
    this.microphone?.dispose();
    this.microphone = void 0;
    this.session?.dispose();
    this.session = void 0;
  }
  async postApiStatus() {
    this.post({
      type: "apiStatus",
      configured: Boolean(await this.secrets.get(API_KEY_SECRET))
    });
  }
  postEditorContextState() {
    this.post({
      type: "selectionChanged",
      selection: summarizeEditorContext(captureEditorContext()),
      currentPage: summarizeCurrentPage(captureCurrentPageContext())
    });
  }
  registerApplyTarget(context) {
    if (!context) {
      return void 0;
    }
    const targetId = (0, import_node_crypto2.randomBytes)(16).toString("hex");
    this.applyTargets.set(targetId, {
      uri: vscode6.Uri.parse(context.uri),
      range: new vscode6.Range(
        context.startLineIndex,
        context.startCharacter,
        context.endLineIndex,
        context.endCharacter
      ),
      originalText: context.text
    });
    while (this.applyTargets.size > MAX_APPLY_TARGETS) {
      const oldestTargetId = this.applyTargets.keys().next().value;
      if (!oldestTargetId) {
        break;
      }
      this.applyTargets.delete(oldestTargetId);
    }
    return targetId;
  }
  async copyCode(code, actionId) {
    if (code === void 0) {
      throw new Error("No code was provided to copy.");
    }
    await vscode6.env.clipboard.writeText(code);
    this.post({ type: "codeCopied", actionId });
  }
  async applyPatch(code, targetId, actionId) {
    if (code === void 0 || code.length > MAX_PATCH_CHARACTERS) {
      throw new Error("The returned code is empty or too large to apply.");
    }
    const activeEditor = vscode6.window.activeTextEditor;
    const activeSelection = activeEditor && !activeEditor.selection.isEmpty ? {
      uri: activeEditor.document.uri,
      range: activeEditor.selection,
      originalText: activeEditor.document.getText(activeEditor.selection)
    } : void 0;
    const capturedTarget = targetId ? this.applyTargets.get(targetId) : void 0;
    const target = activeSelection ?? capturedTarget;
    if (!target) {
      throw new Error(
        "Select the code you want to replace in the active editor, then click Apply again."
      );
    }
    const document = await vscode6.workspace.openTextDocument(target.uri);
    if (!activeSelection && document.getText(target.range) !== target.originalText) {
      throw new Error(
        "The selected code changed after the answer was generated. Select it again before applying."
      );
    }
    const replacement = !target.originalText.endsWith("\n") && code.endsWith("\n") ? code.slice(0, -1) : code;
    const edit = new vscode6.WorkspaceEdit();
    edit.replace(target.uri, target.range, replacement);
    const applied = await vscode6.workspace.applyEdit(edit);
    if (!applied) {
      throw new Error("VS Code could not apply the returned code.");
    }
    if (targetId) {
      this.applyTargets.delete(targetId);
    }
    this.post({ type: "patchApplied", actionId, targetId });
    void vscode6.window.showInformationMessage(
      `Echo applied the code to ${vscode6.workspace.asRelativePath(target.uri, false)}.`
    );
  }
  async handleWorkspaceToolCalls(payload) {
    const functionCalls = getToolFunctionCalls(payload);
    const session = this.session;
    if (!functionCalls.length || !session?.isConnected) {
      return;
    }
    const responses = [];
    for (const functionCall of functionCalls) {
      const id = functionCall.id;
      const name = functionCall.name;
      if (!id || !name) {
        continue;
      }
      if (name === "render_markdown") {
        continue;
      }
      if (this.workspaceToolCallsThisTurn >= MAX_WORKSPACE_TOOL_CALLS_PER_TURN) {
        responses.push({
          id,
          name,
          response: {
            error: "Workspace tool limit reached for this turn. Answer from the evidence already returned."
          }
        });
        continue;
      }
      this.workspaceToolCallsThisTurn += 1;
      if (name === "search_workspace") {
        const query = getStringArgument(functionCall.args, "query");
        if (!query) {
          responses.push({
            id,
            name,
            response: { error: "A non-empty search query is required." }
          });
          continue;
        }
        this.post({
          type: "workspaceSearchStarted",
          requestId: id,
          message: `Let me search the workspace for ${query}.`
        });
        try {
          const workspaceContext = await this.workspaceContextRetriever.retrieve(
            query,
            this.turnPrimaryContext
          );
          this.postWorkspaceSearchCompleted(id, workspaceContext);
          responses.push({
            id,
            name,
            response: {
              query,
              indexedFileCount: workspaceContext.indexedFileCount,
              snippets: workspaceContext.snippets,
              truncated: workspaceContext.truncated,
              message: workspaceContext.snippets.length ? "Workspace code was found and read." : "No matching workspace code was found."
            }
          });
        } catch (error) {
          responses.push({
            id,
            name,
            response: {
              error: error instanceof Error ? error.message : "The workspace search failed."
            }
          });
        }
        continue;
      }
      if (name === "read_workspace_file") {
        const filePath = getStringArgument(functionCall.args, "file_path");
        if (!filePath) {
          responses.push({
            id,
            name,
            response: {
              error: "A workspace-relative file_path is required."
            }
          });
          continue;
        }
        this.post({
          type: "workspaceSearchStarted",
          requestId: id,
          message: `Let me read ${displayFileName(filePath)}.`
        });
        try {
          const file = await this.workspaceContextRetriever.readFile(
            filePath,
            getNumberArgument(functionCall.args, "start_line"),
            getNumberArgument(functionCall.args, "end_line")
          );
          this.post({
            type: "workspaceSearchCompleted",
            requestId: id,
            files: [file.filePath],
            message: `Read lines ${file.startLine}-${file.endLine}.`
          });
          responses.push({
            id,
            name,
            response: { file }
          });
        } catch (error) {
          responses.push({
            id,
            name,
            response: {
              error: error instanceof Error ? error.message : "The workspace file could not be read."
            }
          });
        }
        continue;
      }
      responses.push({
        id,
        name,
        response: { error: `Unknown tool: ${name}` }
      });
    }
    if (responses.length && session === this.session) {
      if (!session.sendToolResponses(responses)) {
        this.post({
          type: "sessionError",
          message: "The workspace tool results could not be sent to Gemini."
        });
      }
    }
  }
  postWorkspaceSearchCompleted(requestId, workspaceContext) {
    const files = [
      ...new Set(workspaceContext.snippets.map((snippet) => snippet.filePath))
    ];
    this.post({
      type: "workspaceSearchCompleted",
      requestId,
      files,
      message: files.length ? `Reviewed ${files.length} relevant code ${files.length === 1 ? "file" : "files"}.` : vscode6.workspace.workspaceFolders?.length ? `Searched ${workspaceContext.indexedFileCount} source files; no strong code match was found.` : "No VS Code workspace folder is open. Open the project folder to enable codebase search."
    });
  }
  postAttachmentState() {
    this.post({
      type: "attachmentsChanged",
      attachments: this.attachmentStore.list()
    });
  }
  post(message) {
    void this.view?.webview.postMessage(message);
  }
  getHtml(webview) {
    const nonce = (0, import_node_crypto2.randomBytes)(16).toString("base64");
    const scriptUri = webview.asWebviewUri(
      vscode6.Uri.joinPath(this.extensionUri, "dist", "webview.js")
    );
    const styleUri = webview.asWebviewUri(
      vscode6.Uri.joinPath(this.extensionUri, "dist", "styles.css")
    );
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <link rel="stylesheet" href="${styleUri.toString()}">
  <title>Echo</title>
</head>
<body>
  <div class="app-shell">
    <header class="app-header">
      <div class="brand">
        <span>
          <strong>Echo</strong>
          <small>Gemini Live code assistant</small>
        </span>
      </div>
      <div class="header-actions">
        <span id="headerStatus" class="header-status">Ready</span>
        <button
          id="newChatButton"
          class="icon-button"
          type="button"
          aria-label="Start a new chat"
          title="New chat"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2 2h8.5A1.5 1.5 0 0 1 12 3.5V7h-1.2V3.5a.3.3 0 0 0-.3-.3h-7a.3.3 0 0 0-.3.3v7a.3.3 0 0 0 .3.3H7V12H3.5A1.5 1.5 0 0 1 2 10.5V2zm9.4 6v2.6H14v1.2h-2.6v2.6h-1.2v-2.6H7.6v-1.2h2.6V8h1.2z"/>
          </svg>
        </button>
        <button
          id="historyButton"
          class="icon-button"
          type="button"
          aria-label="Open chat history"
          aria-pressed="false"
          title="Chat history"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 2a6 6 0 1 1-5.64 3.95l1.13.41A4.8 4.8 0 1 0 8 3.2c-1.3 0-2.48.51-3.34 1.35L6.2 6.1H2V1.9l1.8 1.8A5.98 5.98 0 0 1 8 2zm-.6 2.4h1.2v3.35l2.25 1.3-.6 1.04L7.4 8.45V4.4z"/>
          </svg>
        </button>
        <button
          id="settingsButton"
          class="icon-button settings-button"
          type="button"
          aria-label="Open settings"
          aria-pressed="false"
          title="Settings"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M9.9 1.5l.35 1.4c.3.13.57.29.82.48l1.39-.42 1.15 1.98-1.04 1c.03.2.05.4.05.61s-.02.41-.05.61l1.04 1-1.15 1.98-1.39-.42c-.25.19-.52.35-.82.48l-.35 1.4H7.6l-.35-1.4a4.4 4.4 0 0 1-.82-.48l-1.39.42-1.15-1.98 1.04-1a4 4 0 0 1 0-1.22l-1.04-1 1.15-1.98 1.39.42c.25-.19.52-.35.82-.48l.35-1.4h2.3zm-1.15 3.3a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5z"/>
          </svg>
        </button>
      </div>
    </header>

    <main class="app-main">
      <section id="chatPanel" class="panel is-active" aria-label="Chat">
        <div class="chat-scroll-region">
          <div id="apiRequiredCard" class="notice-card hidden">
            <strong>Connect Gemini to begin</strong>
            <p>Add your Gemini API key in settings to start a live code conversation.</p>
            <button id="configureApiButton" class="secondary-button" type="button">Open settings</button>
          </div>

          <section id="voiceStage" class="voice-stage">
            <canvas id="orbCanvas" aria-label="Live session animation"></canvas>
            <span id="orbMode" class="orb-mode">standby</span>
            <div class="status-line">
              <span class="status-left">
                <span id="statusDot" class="status-dot"></span>
                <span id="statusLabel">Ready</span>
              </span>
              <span class="status-actions">
                <button
                  id="muteMicButton"
                  class="icon-button"
                  type="button"
                  title="Mute microphone"
                  aria-label="Mute microphone"
                  hidden
                >
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M10 2.5a2.5 2.5 0 0 0-2.5 2.5v5a2.5 2.5 0 0 0 5 0V5A2.5 2.5 0 0 0 10 2.5Z" />
                    <path d="M6.5 9.25a.75.75 0 0 0-1.5 0 5 5 0 0 0 4.25 4.94V16H7a.75.75 0 0 0 0 1.5h6a.75.75 0 0 0 0-1.5h-2.25v-1.81a5 5 0 0 0 4.25-4.94.75.75 0 0 0-1.5 0 3.5 3.5 0 1 1-7 0Z" />
                    <path d="M13.5 2.5a.75.75 0 0 1 .75.75v.75a.75.75 0 0 1-1.5 0V3.25a.75.75 0 0 1 .75-.75Z" class="mute-slash" />
                    <path d="M13.5 6.5a.75.75 0 0 1 .75.75v.75a.75.75 0 0 1-1.5 0V7.25a.75.75 0 0 1 .75-.75Z" class="mute-slash" />
                  </svg>
                </button>
                <button
                  id="stopPlaybackButton"
                  class="icon-button"
                  type="button"
                  title="Stop response"
                  aria-label="Stop response"
                  hidden
                >
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <rect x="4.5" y="4.5" width="11" height="11" rx="1.5" />
                  </svg>
                </button>
                <span id="sessionTimer" class="session-timer hidden">00:00</span>
              </span>
            </div>
            <div class="mic-track" aria-hidden="true">
              <span id="micMeter" class="mic-meter"></span>
            </div>
            <div class="session-actions">
              <button id="sessionButton" class="primary-button" type="button">
                Start live session
              </button>
            </div>
          </section>

          <div id="errorBox" class="error-box hidden" role="alert"></div>

          <section class="transcript-section">
            <div class="section-heading">
              <span>Chat</span>
            <button id="clearButton" class="text-button" type="button">New chat</button>
            </div>
            <div id="transcript" class="transcript" aria-live="polite">
              <div id="emptyState" class="empty-state">
                <strong>Ask about the code you are working on</strong>
                <span>Select lines in the editor to add them as private context.</span>
              </div>
            </div>
          </section>
        </div>

        <form id="textForm" class="composer">
          <div id="mentionMenu" class="mention-menu hidden" role="listbox" aria-label="Context suggestions">
            <button id="currentPageMention" class="mention-option" type="button" role="option">
              <span class="mention-symbol" aria-hidden="true">@</span>
              <span class="mention-copy">
                <strong>Current file</strong>
                <small id="currentPageMentionLabel"></small>
              </span>
            </button>
          </div>
          <div id="selectionBar" class="selection-bar hidden">
            <span class="selection-icon" aria-hidden="true">&lt;/&gt;</span>
            <span class="selection-copy">
              <small>Selected context</small>
              <strong id="selectionLabel"></strong>
            </span>
          </div>
          <div id="currentPageBar" class="selection-bar current-page-bar hidden">
            <span class="selection-icon" aria-hidden="true">@</span>
            <span class="selection-copy">
              <small>Current file context</small>
              <strong id="currentPageLabel"></strong>
            </span>
            <button id="removeCurrentPageButton" class="context-remove-button" type="button" aria-label="Remove current file context" title="Remove context">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="m4.3 3.4 3.7 3.7 3.7-3.7.9.9L8.9 8l3.7 3.7-.9.9L8 8.9l-3.7 3.7-.9-.9L7.1 8 3.4 4.3l.9-.9z"/>
              </svg>
            </button>
          </div>
          <div id="attachmentList" class="attachment-list hidden" aria-label="Attached files"></div>
          <div class="composer-row">
            <div class="attachment-menu-wrap">
              <button id="attachmentButton" class="composer-tool-button" type="button" aria-label="Add a file or image" aria-expanded="false" title="Add context">
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M7.4 2h1.2v5.4H14v1.2H8.6V14H7.4V8.6H2V7.4h5.4V2z"/>
                </svg>
              </button>
              <div id="attachmentMenu" class="attachment-menu hidden" role="menu">
                <button id="attachFileButton" class="attachment-option" type="button" role="menuitem">
                  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 1.5h6.2L13 5.3v9.2H3v-13zm1.2 1.2v10.6h7.6V6H8.5V2.7H4.2zm5.5.7v1.4h1.4L9.7 3.4z"/></svg>
                  <span>Add file</span>
                </button>
                <button id="attachImageButton" class="attachment-option" type="button" role="menuitem">
                  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2h12v12H2V2zm1.2 1.2v9.6h9.6V3.2H3.2zm1.1 8.2 2.6-3 1.8 2 1.2-1.3 1.8 2.3H4.3zm6.4-6.9a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8z"/></svg>
                  <span>Add image</span>
                </button>
              </div>
            </div>
            <textarea
              id="textInput"
              rows="1"
              autocomplete="off"
              placeholder="Ask Echo about your code\u2026"
              aria-label="Chat message"
            ></textarea>
            <button id="sendButton" class="send-button" type="submit" disabled aria-label="Send message" title="Send">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M2.2 2.4a.65.65 0 0 1 .72-.12l10.2 5.1a.7.7 0 0 1 0 1.24l-10.2 5.1A.65.65 0 0 1 2 13.08L3.1 9 8.3 8 3.1 7 2 2.92a.65.65 0 0 1 .2-.52z"/>
              </svg>
            </button>
          </div>
          <small class="composer-hint">Type @ for current file \xB7 + for attachments \xB7 Enter to send</small>
        </form>
      </section>

      <section id="historyPanel" class="panel" aria-label="Chat history">
        <div class="settings-header">
          <button id="backFromHistoryButton" class="icon-button" type="button" aria-label="Back to chat" title="Back to chat">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M7.35 2.15 1.5 8l5.85 5.85.9-.9L3.94 8.63H14v-1.26H3.94l4.31-4.32-.9-.9z"/>
            </svg>
          </button>
          <span class="panel-heading-copy">
            <strong>Chat history</strong>
            <small>Stored locally by Echo</small>
          </span>
          <button id="newChatFromHistoryButton" class="secondary-button compact" type="button">New chat</button>
        </div>
        <div id="chatHistoryList" class="chat-history-list">
          <div id="emptyHistory" class="empty-history">No saved chats yet.</div>
        </div>
      </section>

      <section id="settingsPanel" class="panel" aria-label="Settings">
        <div class="settings-header">
          <button id="backToChatButton" class="icon-button" type="button" aria-label="Back to chat" title="Back to chat">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M7.35 2.15 1.5 8l5.85 5.85.9-.9L3.94 8.63H14v-1.26H3.94l4.31-4.32-.9-.9z"/>
            </svg>
          </button>
          <span>
            <strong>Settings</strong>
            <small>Configure Echo</small>
          </span>
        </div>

        <div class="settings-group">
          <div class="settings-title">
            <span>
              <strong>Gemini API</strong>
              <small id="apiStatusText">Not configured</small>
            </span>
            <span id="apiStatusDot" class="api-status-dot"></span>
          </div>
          <label class="field">
            <span>API key</span>
            <input id="apiKeyInput" type="password" spellcheck="false" autocomplete="off" placeholder="AIza\u2026">
          </label>
          <div class="button-row">
            <button id="saveApiButton" class="primary-button compact" type="button">Save API key</button>
            <button id="removeApiButton" class="secondary-button compact hidden" type="button">Remove key</button>
          </div>
          <p class="field-help">Stored with VS Code SecretStorage in your operating system keychain.</p>
        </div>

        <div class="settings-group">
          <label class="field">
            <span>Gemini voice</span>
            <select id="voiceSelect"></select>
          </label>
          <label class="field">
            <span>Preferred language</span>
            <select id="languageSelect"></select>
          </label>
          <label class="field">
            <span>Behaviour</span>
            <select id="behaviorSelect">
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="expert">Expert</option>
            </select>
          </label>
          <label class="toggle-row">
            <span>
              <strong>Auto-interrupt</strong>
              <small>Interrupt Gemini when you start speaking.</small>
            </span>
            <input id="autoInterruptInput" type="checkbox">
          </label>
          <p id="reconnectHint" class="field-help warning hidden">Reconnect the live session to apply changed voice settings.</p>
          <button id="savePreferencesButton" class="primary-button" type="button">Save preferences</button>
          <p id="settingsFeedback" class="field-help hidden" role="status"></p>
        </div>

        <div class="settings-group">
          <button id="debugToggle" class="debug-toggle" type="button" aria-expanded="false">
            <svg viewBox="0 0 16 16" aria-hidden="true" class="debug-toggle-icon"><path d="M5.65 2.15 3.5 4.29 7.21 8 3.5 11.71l2.15 2.14L11.5 8 5.65 2.15z"/></svg>
            <span>Debug log</span>
            <small id="debugBadge" class="debug-badge hidden">0</small>
          </button>
          <div id="debugPanel" class="debug-panel hidden">
            <div id="debugEntries" class="debug-entries" role="log" aria-live="polite"></div>
            <button id="debugClearButton" class="code-action-button debug-clear" type="button">Clear log</button>
          </div>
        </div>
      </section>
    </main>
  </div>
  <script nonce="${nonce}" src="${scriptUri.toString()}"></script>
</body>
</html>`;
  }
};
function getToolFunctionCalls(payload) {
  if (typeof payload !== "object" || payload === null) {
    return [];
  }
  const toolCall = payload.toolCall;
  if (typeof toolCall !== "object" || toolCall === null) {
    return [];
  }
  const functionCalls = toolCall.functionCalls;
  return Array.isArray(functionCalls) ? functionCalls : [];
}
function getStringArgument(args, name) {
  const value = args?.[name];
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function getNumberArgument(args, name) {
  const value = args?.[name];
  return typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : void 0;
}
function shouldAnnounceWorkspaceSearch(userText) {
  return /\b(find|search|locate|look\s+for|where|defined|definition|references?|usages?|implementation|codebase|workspace|project|file|component|route)\b/iu.test(
    userText
  ) || /(?:^|[\s"'`(])(?:[.@\w-]+[\\/])*[.@\w-]+\.[A-Za-z0-9]+(?=$|[\s"'`),:;?])/u.test(
    userText
  );
}
function displayFileName(filePath) {
  return filePath.split(/[\\/]/u).pop() ?? filePath;
}
function activate(context) {
  const provider = new EchoViewProvider(
    context.extensionUri,
    context.secrets,
    context.globalStorageUri
  );
  context.subscriptions.push(
    provider,
    vscode6.window.registerWebviewViewProvider(VIEW_ID, provider, {
      webviewOptions: {
        retainContextWhenHidden: true
      }
    }),
    vscode6.commands.registerCommand(
      "liveline.configureApiKey",
      () => provider.configureApiKey()
    )
  );
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
