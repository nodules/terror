'use strict';

var ERROR_CODE = 'Terror codes collision detected in the %name%&.extendCodes call for code "%code%"';

var has = Object.prototype.hasOwnProperty;

/**
 * @constructor
 * @param {String|Number} [code=Terror.CODES.UNKNOWN_ERROR]
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
 *              .bind({ reason: 'something strange happens!' })
 *              .log();
 *      }
 *
 *      // try to use Terror#ensureError if catched error can be Terror successor or not
 *
 *      try {
 *          // dangerous code here
 *      } catch(err) {
 *          MyError.ensureError(err, MyError.CODES.MY_FAULT)
 *              .bind({ reason: 'i was sad when write code above' })
 *              .log();
 *      }
 *
 *      // or simply log and throw Terror
 *
 *      throw MyError.createError(MyError.CODES.MY_FAULT, { reason: 'i was too stupid!' })
 *          .log('warn');
 *      ```
 */
function Terror(code, message) {
    var msg;
    var original;

    this.code = code == null ? Terror.CODES.UNKNOWN_ERROR : code;

    if (isString(message)) {
        msg = message;
    } else {
        msg = this.constructor.MESSAGES[this.code];

        if (isError(message)) {
            original = message;
        }
    }

    this.data = {};
    this.message = msg;
    this.originalError = original;
    this._isTerror = true;
    this._isLogged = false;

    return captureStackTrace(this, this.constructor);
}

inherits(Terror, Error);

module.exports = Terror;

/**
 *
 * @type {String}
 * @default 'ERROR'
 */
Terror.DEFAULT_ERROR_LEVEL = 'ERROR';

/**
 *
 * @type {Object}
 */
Terror.CODES = {
    UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 *
 * @type {Object}
 */
Terror.MESSAGES = {
    UNKNOWN_ERROR: 'Unknown error'
};

/**
 *
 * @type {Number}
 * @default 10
 */
Terror.stackTraceLimit = 10;

/**
 * @param {String} name Error class name
 * @param {Object} [codes] hash { ERROR_CODE: 'error message', … }
 */
Terror.create = function(name, codes) {
    var Inheritor = function(code, message) {
        Terror.call(this, code, message);
    };

    inherits(Inheritor, this);

    // link contructors methods
    Inheritor.create = this.create;
    Inheritor.extendCodes = this.extendCodes;
    Inheritor.is = this.is;
    Inheritor.setLogger = this.setLogger;
    Inheritor.createError = this.createError;
    Inheritor.ensureError = this.ensureError;
    Inheritor.stackTraceLimit = this.stackTraceLimit;

    // copy static fields
    Inheritor.CODES = copyPlainObject(this.CODES);
    Inheritor.MESSAGES = copyPlainObject(this.MESSAGES);
    Inheritor.DEFAULT_ERROR_LEVEL = this.DEFAULT_ERROR_LEVEL;

    if (isObject(codes)) {
        Inheritor.extendCodes(codes);
    }

    Inheritor.prototype.name = name;

    return Inheritor;
};

/**
 * Extends existing CODE and MESSAGE hashes.
 * @param {Object} codes { CODE_NAME: 'error message', … }
 * @throws {Terror} TerrorError if collisions detected.
 * @returns {Terror} constructor
 */
Terror.extendCodes = function(codes) {
    for (var code in codes) {
        if (has.call(codes, code)) {
            if (has.call(this.CODES, code)) {
                throw Terror.createError(null, ERROR_CODE).bind({
                    name: this.prototype.name,
                    code: code
                });
            }

            this.CODES[code] = code;
            this.MESSAGES[code] = codes[code];
        }
    }

    return this;
};

/**
 * @param {String|Number} [code]
 * @param {String|Error|Object} [message] error message, Error or key-value hash for binding
 * @returns {Terror} new Terror instance
 */
Terror.createError = function(code, message) {
    var Const = this === Terror ? Terror : this;
    var msg;
    var data;

    if (isString(message) || isError(message)) {
        msg = message;
    } else {
        data = message;
    }

    var error = new Const(code, msg).bind(data);

    return captureStackTrace(error, this.createError);
};

/**
 * @param {Error|Terror} error
 * @param {String|Number} [code]
 * @returns {Terror}
 */
Terror.ensureError = function(error, code) {
    return error instanceof this ? error : this.createError(code, error);
};

/**
 * @param {*} error
 * @returns {Boolean}
 */
Terror.isTerror = function(error) {
    if ( ! error) {
        return false;
    } else {
        return error._isTerror === true;
    }
};

/**
 * @param {Function} logger (String message, String errorLevel)
 * @returns {Terror} constructor
 */
Terror.setLogger = function(logger) {
    this.prototype.logger = logger;

    return this;
};

/**
 * @default 'Terror'
 * @type {String}
 */
Terror.prototype.name = 'Terror';

/**
 * @param {*} [level] – error level, any value allowed by logger
 * @returns {Terror} self
 */
Terror.prototype.log = function(level) {
    if (this._isLogged || isNotFunction(this.logger)) {
        return this;
    }

    this.logger(this.getFullStack(), level);
    this._isLogged = true;

    return this;
};

/**
 * Default logger writes error message to console using logMultilineError
 * @param {String} message
 * @param {String} [level=ERROR]
 */
Terror.prototype.logger = function(message, level) {
    this.logMultilineError(message, level);
};

/**
 * Default multiine error formatiing for simple text loggers,
 * such as console.log or any one, which write message as line in the text file.
 * @param {String} message
 * @param {String} [level=ERROR]
 * @param {Function} [log=console.log] (String formattedMessageRow)
 * @returns {Terror}
 */
Terror.prototype.logMultilineError = function(message, level, log) {
    var _level = (level || this.constructor.DEFAULT_ERROR_LEVEL).toUpperCase();
    var _log = log;
    var arrows = '\n' + new Array(_level.length + 1).join('>') + ' ';

    if (isNotFunction(_log)) {
        _log = defaultLog;
    }

    _log(_level + ' ' + message.replace(/\n/g, arrows));

    return this;
};

/**
 *
 * @returns {String}
 */
Terror.prototype.getFullMessage = function() {
    var error = this;
    var result = '';
    var msg;

    do {
        msg = error.message;

        if (msg) {
            if (msg[msg.length - 1] !== '.') {
                msg += '.';
            }

            result += ' ' + msg;
        }

        error = error.originalError;
    } while (error);

    return this.code + result;
};

/**
 *
 * @returns {String}
 */
Terror.prototype.getFullStack = function() {
    var error = this;
    var result = new Array(0);
    var indent = '';
    var stack;

    do {
        if (error.stack) {
            stack = String(error.stack).replace(/\n/g, '\n' + indent) + '\n';
        } else {
            stack = error.name + ': ' + error.message;
        }

        result.push(indent + (has.call(error, 'code') ? error.code + ' ' : '') + stack);

        indent += '    ';
    } while ((error = error.originalError));

    return result.join('\n');
};

/**
 * Check is an error instanciated from `Ctor` and error code equals passed code.
 * @param {String} code
 * @param {Error} error
 * @returns {Boolean}
 */
Terror.is = function(code, error) {
    return (error instanceof this) && error.code === code;
};

/**
 * @param {Object} data
 * @returns {Terror} self
 */
Terror.prototype.bind = function(data) {
    if (data == null) {
        return this;
    }

    for (var propName in data) {
        if (has.call(data, propName)) {
            this.data[propName] = data[propName];
        }
    }

    return this.setMessage(this.message);
};

/**
 *
 * @param {String} message
 * @returns {Terror}
 */
Terror.prototype.setMessage = function(message) {
    this.message = isString(message) && message.indexOf('%') > -1 ? sPrintF(message, this.data) : message;

    return this;
};

function isError(value) {
    return value instanceof Error;
}

function isString(value) {
    return typeof value === 'string';
}

function isObject(value) {
    return typeof value === 'object' && value !== null;
}

function isNotFunction(fnc) {
    return typeof fnc !== 'function';
}

function defaultLog(msg) {
    console.log(msg);
}

function sPrintF(str, data) {
    var result = '';
    var m;
    var last = 0;
    var regExp = /%([^%\s]+)%/g;

    while ((m = regExp.exec(str))) {
        result += str.substring(last, m.index) + (has.call(data, m[1]) ? data[m[1]] : m[0]);
        last = m.index + m[0].length;
    }

    return result + str.substr(last);
}

function copyPlainObject(src) {
    var object = {};

    for (var key in src) {
        if (has.call(src, key)) {
            object[key] = src[key];
        }
    }

    return object;
}

function captureStackTrace(error, fnc) {
    if (Error.captureStackTrace) {
        var stackTraceLimit = Error.stackTraceLimit;

        Error.stackTraceLimit = error.constructor.stackTraceLimit;
        Error.captureStackTrace(error, fnc);
        Error.stackTraceLimit = stackTraceLimit;
    }

    return error;
}

function inherits(Ctor, SuperCtor) {
    if (Object.create) {
        Ctor.prototype = Object.create(SuperCtor.prototype, {
            constructor: {
                value: Ctor,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
    } else {
        Const.prototype = SuperCtor.prototype;
        new Const(Ctor);
    }
}

function Const(ctor) {
    this.constructor = ctor;
    ctor.prototype = this;

    Const.prototype = Object.prototype;
}
