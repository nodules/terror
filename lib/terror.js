var util = require('util'),
    Objex = require('objex');

/**
 * @constructor
 * @param {Number} [code=Terror.CODES.UNKNOWN_ERROR]
 * @param {String} [message]
 * @returns {Terror}
 * @example
 *      ```
 *      var MyError = Terror.create('MyError', {
 *          MY_FAULT : [ 1001, "It\'s my own fault, because %reason%" ]
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
    if ( ! (this instanceof Terror)) {
        return new Terror(code, message);
    }

    var stack = (new Error()).stack.split('\n');

    stack.splice(0, 2);
    stack.unshift(this.constructor.prototype.name);

    this.stack = stack.join('\n');

    this.code = typeof code === 'undefined' || code === null ? Terror.CODES.UNKNOWN_ERROR : code;
    this.codeName = this.constructor.CODE_NAMES[this.code] || this.code;
    this.message = message || this.constructor.MESSAGES[this.code];
}

util.inherits(Terror, Error);
Objex.wrap(Terror, Error);

Terror.prototype.name = 'Terror';

/**
 * @param {String} name Error class name
 * @param {Function} [Constructor] optional sucessor constructor, must apply <Ctor>.__super if passed.
 * @param {Object} [codes] hash { CODE_NAME: [ 2001, 'error message' ], … }
 * @see http://npm.im/objex
 */
Terror.create = function(name, Constructor, codes) {
    if (typeof name !== 'string') {
        Constructor = name;
        name = undefined;
    }

    if (typeof Constructor === 'object') {
        codes = Constructor;
        Constructor = undefined;
    }

    var Inheritor = Objex.create.call(this, Constructor);

    Inheritor.prototype.name = name;

    codes && Inheritor.extendCodes(codes);

    return Inheritor;
};

/**
 * Extends existing CODE and MESSAGE hashes.
 * @param {Object} codes { CODE_NAME: [ 2001, 'error message' ], … }
 * @returns {Function} constructor
 * @throws TerrorError if collisions detected.
 */
Terror.extendCodes = function(codes) {
    var ctor = this;

    Object.getOwnPropertyNames(codes).forEach(function(codeName) {
        var code = codes[codeName][0];

        if (Object.prototype.hasOwnProperty.call(ctor.CODES, codeName)) {
            throw new Error([
                'Terror codes collision detected in the ',
                ctor.prototype.name,
                '.extendCodes call for code "',
                codeName,
                '"'
            ].join(''));
        }

        ctor.CODES[codeName] = code;
        ctor.CODE_NAMES[code] = codeName;
        ctor.MESSAGES[code] = codes[codeName][1];
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
    var date = new Date(),
        msgRows = message.split('\n'),
        self = this;

    if (typeof log !== 'function') {
        log = function() {
            console.log.apply(console, arguments);
        };
    }

    level || (level = this.constructor.DEFAULT_ERROR_LEVEL);

    msgRows.forEach(function(row, idx) {
        log([
            self.formatErrorTimestamp(date),
            idx ? level.replace(/./ig, '>') : String(level).toUpperCase(),
            row
        ].join(' '));
    });
};

/**
 * Add leading zero digit if num is one digit number
 * @param {Number} num
 * @returns {String}
 */
function tabWithZero(num) {
    return String(num).replace(/^(\d)$/g, "0$1");
}

/**
 * @param {Date} date
 * @returns {String}
 */
Terror.prototype.formatErrorTimestamp = function(date) {
    var zero = tabWithZero;

    return util.format('%s-%s-%s %s:%s:%s',
            date.getFullYear(),
            zero(date.getMonth() + 1),
            zero(date.getDate()),
            zero(date.getHours()),
            zero(date.getMinutes()),
            zero(date.getSeconds())
        );
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

    var message = [
        this.code,
        ' ',
        this.toString()
    ];

    if (this.originalError) {
        message.push(' (');
        message.push(this.originalError);
        message.push(')');

        if (this.originalError.stack) {
            message.push('\n');
            message.push(this.originalError.stack);
        }
    }

    message = message.join('');

    this.logger(message, level);

    this._isLogged = true;

    return this;
};

/**
 * @param {Object} data
 * @returns {Terror} self
 */
Terror.prototype.bind = function(data) {
    this.message = this.message.replace(/%([^%\s]+)%/g, function(match, name) {
        return Object.prototype.hasOwnProperty.call(data, name) ? data[name] : match;
    });

    return this;
};

Terror.CODES = {
    UNKNOWN_ERROR : 100
};

Terror.MESSAGES = {
    100 : 'Unknown error'
};

Terror.CODE_NAMES = {
    100 : 'UNKNOWN_ERROR'
};

/**
 * @param {Number} code
 * @param {String|Error|Object} [message] error message, Error or key-value hash for binding
 * @returns {Terror} new Terror instance
 */
Terror.createError = function(code, message) {
    var Constructor = this,
        error = new Constructor(code);

    if (message instanceof Error || typeof message === 'string') {
        error.originalError = message;
    } else if (message && typeof message === 'object') {
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
    if ( ! (error instanceof Terror)) {
        error = this.createError(typeof code === 'undefined' || code === null ? Terror.CODES.UNKNOWN_ERROR : code, error);
    }

    return error;
};

module.exports = Terror;
