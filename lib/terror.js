var util = require('util');

/**
 * @constructor
 * @param {Number} [code=Terror.CODES.UNKNOWN_ERROR]
 * @param {String} [message]
 * @returns {Terror}
 * @example
 *      ```
 *      var MyError = Terror.create('MyError', {
 *          MY_FAULT: "It\'s my own fault, because %reason%"
 *      });
 *
 *      try {
 *          // dangerous code here
 *      } catch(err) {
 *          MyError.createError(MyError.CODES.MY_FAULT, err)
 *              .bind({ reason : 'something strange happens!' })
 *              .log();
 *      }
 *
 *      // try to use Terror#ensureError if catched error can be Terror successor or not
 *
 *      try {
 *          // dangerous code here
 *      } catch(err) {
 *          MyError.ensureError(err, MyError.CODES.MY_FAULT)
 *              .bind({ reason : 'i was sad when write code above' })
 *              .log();
 *      }
 *
 *      // or simply log and throw Terror
 *
 *      throw MyError.createError(MyError.CODES.MY_FAULT, { reason : 'i was too stupid!' })
 *          .log('warn');
 *      ```
 */
function Terror(code, message) {
    Error.apply(this);

    this.message = '$$MESSAGE$$';
    Error.captureStackTrace(this, this.constructor);
    this._stackTemplate = this.stack;

    this.code = typeof code === 'undefined' || code === null ? Terror.CODES.UNKNOWN_ERROR : code;
    this.setMessage(message || this.constructor.MESSAGES[this.code]);
    this.data = {};
}
util.inherits(Terror, Error);

Terror.prototype.name = 'Terror';

/**
 * @param {String} name Error class name
 * @param {Object} [codes] hash { ERROR_CODE: 'error message', … }
 * @see http://npm.im/objex
 */
Terror.create = function(name, codes) {
    if (typeof name !== 'string') {
        codes = name;
        name = null;
    }

    var Inheritor = function (code, message) {
        Terror.call(this, code, message);
    };
    util.inherits(Inheritor, Terror);

    if (name) {
        Inheritor.prototype.name = name;
    }

    // link contructors methods
    Inheritor.create = Terror.create;
    Inheritor.extendCodes = Terror.extendCodes;
    Inheritor.setLogger = Terror.setLogger;
    Inheritor.createError = Terror.createError;
    Inheritor.ensureError = Terror.ensureError;
    // copy static fields
    Inheritor.CODES = Object.create(this.CODES);
    Inheritor.MESSAGES = Object.create(this.MESSAGES);
    Inheritor.DEFAULT_ERROR_LEVEL = this.DEFAULT_ERROR_LEVEL;

    if (typeof codes === 'object' && codes !== null) {
        Inheritor.extendCodes(codes);
    }

    return Inheritor;
};

/**
 * Extends existing CODE and MESSAGE hashes.
 * @param {Object} codes { CODE_NAME: 'error message', … }
 * @returns {Function} constructor
 * @throws TerrorError if collisions detected.
 */
Terror.extendCodes = function(codes) {
    var ctor = this;

    Object.keys(codes).forEach(function(code) {
        if (Object.prototype.hasOwnProperty.call(ctor.CODES, code)) {
            throw new Error([
                'Terror codes collision detected in the ',
                ctor.prototype.name,
                '.extendCodes call for code "',
                code,
                '"'
            ].join(''));
        }

        ctor.CODES[code] = code;
        ctor.MESSAGES[code] = codes[code];
    });

    return this;
};

/**
 * Default logger writes error message to console using logMultilineError
 * @param {String} message
 * @param {String} [level=DEBUG]
 */
Terror.prototype.logger = function(message, level) {
    this.logMultilineError(message, level);
};

Terror.DEFAULT_ERROR_LEVEL = 'ERROR';

/**
 * Default multiine error formatiing for simple text loggers,
 * such as console.log or any one, which write message as line in the text file.
 * @param {String} message
 * @param {String} level
 * @param {Function} [log=console.log] (String formattedMessageRow)
 */
Terror.prototype.logMultilineError = function(message, level, log) {
    var msgRows = message.split('\n'),
        _level = (level || this.constructor.DEFAULT_ERROR_LEVEL).toUpperCase(),
        _arrows = msgRows.length > 1 && _level.replace(/./ig, '>'),
        _log = log;

    if (typeof _log !== 'function') {
        _log = function() {
            console.log.apply(console, arguments);
        };
    }

    msgRows.forEach(function(row, idx) {
        _log((idx ? _arrows : _level) + ' ' + row);
    });
};

/**
 * @param {Function} logger (String message, String errorLevel)
 * @returns {Function} constructor
 */
Terror.setLogger = function(logger) {
    this.prototype.logger = logger;

    return this;
};

/**
 * @param {*} [level] – error level, any value allowed by logger
 * @returns {Terror} self
 */
Terror.prototype.log = function(level) {
    if (this._isLogged || ! this.logger) {
        return this;
    }

    this.logger(this.code + ' ' + this.stack, level);
    this._isLogged = true;

    return this;
};

/**
 * @param {Object} data
 * @returns {Terror} self
 */
Terror.prototype.bind = function(data) {
    if (this.message.indexOf('%') > -1) {
        this.setMessage(this.message.replace(/%([^%\s]+)%/g, function(match, name) {
            return Object.prototype.hasOwnProperty.call(data, name) ? data[name] : match;
        }));
    }

    Object.keys(data)
        .forEach(function(propName) {
            this.data[propName] = data[propName];
        }, this);

    return this;
};

Terror.CODES = {
    UNKNOWN_ERROR : 'UNKNOWN_ERROR'
};

Terror.MESSAGES = {
    UNKNOWN_ERROR : 'Unknown error'
};

Terror.prototype.setMessage = function(message) {
    this.message = message;
    // patch stacktrace
    this.stack = this._stackTemplate.replace('$$MESSAGE$$', message);
    return this;
};

/**
 * @param {Number} code
 * @param {String|Error|Object} [message] error message, Error or key-value hash for binding
 * @returns {Terror} new Terror instance
 */
Terror.createError = function(code, message) {
    var Constructor = this,
        error = new Constructor(code),
        _msg = error.message;

    // patch stacktrace to avoid meaningless entry of createError call
    error.message = '$$MESSAGE$$';
    Error.captureStackTrace(error, this.createError);
    error._stackTemplate = error.stack;
    error.setMessage(_msg);

    if (message instanceof Error || typeof message === 'string') {
        error.originalError = message;
        error.setMessage(error.message + ' (' + message.toString() + ')');
    } else if (typeof message === 'object' && message !== null) {
        error.bind(message);
    }

    return error;
};

/**
 * @param {Error|Terror} error
 * @param {Number} [code]
 * @returns {Terror}
 */
Terror.ensureError = function(error, code) {
    if ( ! (error instanceof this)) {
        if (typeof code !== 'string') {
            code = this.CODES.UNKNOWN_ERROR;
        }
        error = this.createError(code, error);
    }

    return error;
};

module.exports = Terror;
