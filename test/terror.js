/* global describe, it, beforeEach, afterEach, it */
var sinon = require('sinon');
var assert = require('chai').assert;

sinon.assert.expose(assert, { prefix: '' });

describe('Terror', function () {
    var Terror = require('../lib/terror');
    var terror;
    var error;
    var data;
    var MyError;
    var consoleLog = sinon.spy();
    var originalConsoleLog = console.log;

    beforeEach(function () {
        console.log = consoleLog;
        terror = new Terror();
    });

    afterEach(function() {
        console.log = originalConsoleLog;
    });

    function checkInstance(code, message, original, data, name) {
        assert.strictEqual(terror.code, code);
        assert.strictEqual(terror.message, message);
        assert.strictEqual(terror.originalError, original);

        if (arguments.length > 3) {
            assert.deepEqual(terror.data, data);
        } else {
            assert.deepEqual(terror.data, {});
        }

        if (arguments.length === 5) {
            assert.strictEqual(terror.name, name);
        } else {
            assert.strictEqual(terror.name, 'Terror');
        }
    }

    describe('constructor', function() {
        it('should be exported from module', function () {
            assert.strictEqual(typeof Terror, 'function');
        });

        it('should have set default static fields', function() {
            assert.strictEqual(Terror.DEFAULT_ERROR_LEVEL, 'ERROR');
            assert.deepEqual(Terror.CODES, { UNKNOWN_ERROR: 'UNKNOWN_ERROR' });
            assert.deepEqual(Terror.MESSAGES, { UNKNOWN_ERROR: 'Unknown error' });
        });

        it('should inherits an Error constructor', function () {
            assert(Terror.prototype instanceof Error);
            assert.strictEqual(Terror.prototype.constructor, Terror);
        });

        it('should create instance with correct inheritance', function () {
            assert(terror instanceof Error);
            assert(terror instanceof Terror);
            assert.strictEqual(terror.constructor, Terror);
        });

        it('should create an instance with passed or default error code', function () {
            terror = new Terror();
            checkInstance('UNKNOWN_ERROR', 'Unknown error');

            terror = new Terror(null);
            checkInstance('UNKNOWN_ERROR', 'Unknown error');

            terror = new Terror('code');
            checkInstance('code');
        });

        it('should create an instance with passed message', function () {
            terror = new Terror('code', 'message');
            checkInstance('code', 'message');

            terror = new Terror(null, 'message');
            checkInstance('UNKNOWN_ERROR', 'message');
        });

        it('should create an instance derived from another error', function () {
            error = new Error('message');
            terror = new Terror(null, error);

            checkInstance('UNKNOWN_ERROR', 'Unknown error', error);

            terror = new Terror('code', error);
            checkInstance('code', undefined, error);
        });

        it('should correctly capture the stacktrace', function () {
            var error = new Error().stack.split('\n')[1];
            var terror = new Terror().stack.split('\n')[1];

            assert.strictEqual(
                error.substr(0, error.length - 7),
                terror.substr(0, terror.length - 7));
        });
    });

    describe('.createError()', function () {
        it('should create instance of Terror', function () {
            terror = Terror.createError();

            assert(terror instanceof Error);
            assert(terror instanceof Terror);
            assert.strictEqual(terror.constructor, Terror);
        });

        it('should create an instance with passed or default error code', function () {
            terror = new Terror();
            checkInstance('UNKNOWN_ERROR', 'Unknown error');

            terror = Terror.createError(null);
            checkInstance('UNKNOWN_ERROR', 'Unknown error');

            terror = Terror.createError('code');
            checkInstance('code');
        });

        it('should create an instance with passed message', function () {
            terror = Terror.createError('code', 'message');
            checkInstance('code', 'message');

            terror = Terror.createError(null, 'message');
            checkInstance('UNKNOWN_ERROR', 'message');
        });

        it('should create an instance derived from another error', function () {
            error = new Error('message');
            terror = Terror.createError(null, error);

            checkInstance('UNKNOWN_ERROR', 'Unknown error', error);

            terror = Terror.createError('code', error);
            checkInstance('code', undefined, error);
        });

        it('should correctly capture the stacktrace', function () {
            var error = new Error().stack.split('\n')[1];
            var terror = Terror.createError().stack.split('\n')[1];

            assert.strictEqual(
                error.substr(0, error.length - 7),
                terror.substr(0, terror.length - 7));
        });

        it('should bind a data to instanace', function () {
            data = {
                name: 'value'
            };
            terror = Terror.createError(null, data);

            checkInstance('UNKNOWN_ERROR', 'Unknown error', undefined, data);
            assert.deepEqual(terror.data, data);
        });
    });

    describe('.create()', function () {
        it('should create derivative error class', function () {
            MyError = Terror.create('MyError');

            assert.isFunction(MyError);
            assert.strictEqual(MyError.prototype.name, 'MyError');
            assert(MyError.prototype instanceof Terror);
            assert.strictEqual(MyError.prototype.constructor, MyError);
        });

        it('should allow error names which is not valid identifiers in the JavaScript', function() {
            var Entity;

            assert.doesNotThrow(function() {
                Entity = {
                    Error: Terror.create('Entity.Error')
                };
            });

            assert.equal(Entity.Error.prototype.name, 'Entity.Error');
        });

        it('should properly set static properties', function () {
            MyError = Terror.create('MyError');

            assert.strictEqual(MyError.create, Terror.create);
            assert.strictEqual(MyError.extendCodes, Terror.extendCodes);
            assert.strictEqual(MyError.setLogger, Terror.setLogger);
            assert.strictEqual(MyError.createError, Terror.createError);
            assert.strictEqual(MyError.ensureError, Terror.ensureError);
            assert.strictEqual(MyError.stackTraceLimit, Terror.stackTraceLimit);

            assert.deepEqual(MyError.CODES, Terror.CODES);
            assert.notStrictEqual(MyError.CODES, Terror.CODES);

            assert.deepEqual(MyError.MESSAGES, Terror.MESSAGES);
            assert.notStrictEqual(MyError.MESSAGES, Terror.MESSAGES);

            assert.strictEqual(MyError.DEFAULT_ERROR_LEVEL, Terror.DEFAULT_ERROR_LEVEL);
        });

        it('should create derived class from derived class with proper inheritance', function () {
            MyError = Terror.create('MyError');

            var Child = MyError.create('Child');

            terror = new Child();

            assert(terror instanceof Child);
            assert(terror instanceof MyError);

            checkInstance('UNKNOWN_ERROR', 'Unknown error', undefined, {}, 'Child');
        });

        it('derived constructor should create instance', function () {
            MyError = Terror.create('MyError');
            terror = new MyError();

            assert(terror instanceof MyError);
            assert(terror instanceof Terror);
            assert(terror instanceof Error);

            checkInstance('UNKNOWN_ERROR', 'Unknown error', undefined, {}, 'MyError');
        });

        it('should extend error codes and mesages', function () {
            MyError = Terror.create('MyError', {
                CODE: 'Message'
            });

            assert.deepEqual(MyError.CODES, {
                UNKNOWN_ERROR: 'UNKNOWN_ERROR',
                CODE: 'CODE'
            });

            assert.deepEqual(MyError.MESSAGES, {
                UNKNOWN_ERROR: 'Unknown error',
                CODE: 'Message'
            });
        });
    });

    describe('.isTerror()', function() {
        it('should returns false if argument is NOT an instance of Terror', function () {
            assert.isFalse(Terror.isTerror());
            assert.isFalse(Terror.isTerror(null));
            assert.isFalse(Terror.isTerror(123));
            assert.isFalse(Terror.isTerror('error'));
            assert.isFalse(Terror.isTerror({}));
            assert.isFalse(Terror.isTerror(new Error('error')));
        });

        it('should returns true if argument IS an instance of Terror', function() {
            assert(Terror.isTerror(new Terror()));
            assert(Terror.create('MyError').createError());
        });
    });

    describe('#is()', function() {
        it('should return `true` if error is an instanceof context error class and its code equals passed code',
            function() {
                MyError = Terror.create('MyError', { XCODE: 'code X' });

                var error = MyError.createError(MyError.CODES.XCODE);
                assert.isTrue(MyError.is(MyError.CODES.XCODE, error));
            });

        it('should return `false` if error is not an instance of constructor', function() {
                MyError = Terror.create('MyError');

                var error = Terror.createError();
                assert.isFalse(MyError.is(MyError.CODES.UNKNOWN_ERROR, error));
        });

        it('should return `false` if error code and passed code are not equals', function() {
                MyError = Terror.create('MyError', { XCODE: 'code X' });

                var error = MyError.createError();
                assert.isFalse(MyError.is(MyError.CODES.XCODE, error));
        });
    });

    describe('.extendCodes()', function () {
        it('should return current context', function () {
            assert.strictEqual(Terror.extendCodes({}), Terror);

            MyError = Terror.create('MyError');
            assert.strictEqual(MyError.extendCodes({}), MyError);
        });

        it('should merge error codes and messages', function () {
            MyError = Terror
                .create('MyError')
                .extendCodes({
                    CODE: 'Message'
                });

            assert.deepEqual(MyError.CODES, {
                UNKNOWN_ERROR: 'UNKNOWN_ERROR',
                CODE: 'CODE'
            });

            assert.deepEqual(MyError.MESSAGES, {
                UNKNOWN_ERROR: 'Unknown error',
                CODE: 'Message'
            });
        });

        it('should throw an exception if existing and extension codes overlaps', function () {
            assert.throws(function () {
                Terror.extendCodes({
                    UNKNOWN_ERROR: 'Unknown error'
                });
            });
        });
    });

    describe('.ensureError()', function () {
        it('should not create new error if first argument is an instance of the context constructor', function () {
            terror = new Terror();
            assert.strictEqual(Terror.ensureError(terror), terror);

            MyError = Terror.create('MyError');
            terror = new MyError();
            assert.strictEqual(MyError.ensureError(terror), terror);
            assert.strictEqual(Terror.ensureError(terror), terror);
        });

        it('should create new error if first argument is not an error', function () {
            terror = Terror.ensureError(123);
            checkInstance('UNKNOWN_ERROR', 'Unknown error');

            terror = Terror.ensureError({});
            checkInstance('UNKNOWN_ERROR', 'Unknown error');

            terror = Terror.ensureError();
            checkInstance('UNKNOWN_ERROR', 'Unknown error');

            terror = Terror.ensureError(null);
            checkInstance('UNKNOWN_ERROR', 'Unknown error');
        });

        it('should create new error if first argument is not an instance of Terror', function () {
            error = new Error('error');
            terror = Terror.ensureError(error);
            checkInstance('UNKNOWN_ERROR', 'Unknown error', error);
        });

        it('should create new error with message if first argument is string', function () {
            terror = Terror.ensureError('message');
            checkInstance('UNKNOWN_ERROR', 'message');
        });

        it('should wrap into new error if first argument is not an instance of the context constructor', function () {
            MyError = Terror.create('MyError');

            error = new Terror();
            terror = MyError.ensureError(error);
            checkInstance('UNKNOWN_ERROR', 'Unknown error', error, {}, 'MyError');
        });

        it('should create new error with proper error code', function() {
            MyError = Terror.create('MyError', { DOGGY: 'cat' });
            var error = Terror.createError();
            terror = MyError.ensureError(error, MyError.CODES.DOGGY);
            checkInstance('DOGGY', 'cat', error, {}, 'MyError');
        });
    });

    describe('.setLogger()', function() {
        it('should set value of Terror#logger', function() {
            var defaultLogger = terror.logger;
            var logger = function () {};

            Terror.setLogger(logger);

            assert.strictEqual(Terror.prototype.logger, logger);
            assert.strictEqual(terror.logger, logger);

            Terror.setLogger(defaultLogger);
        });
    });

    describe('.stackTraceLimit', function () {
        afterEach(function () {
            Terror.stackTraceLimit = 10;
        });

        it('should equals 10 by default', function () {
            assert.strictEqual(Terror.stackTraceLimit, 10);
        });

        it('should affect the stacktrace depth', function () {
            Terror.stackTraceLimit = 5;

            terror = new Terror();

            assert.strictEqual(terror.stack.split('\n').length, 6);
        });

        it('should leads to an empty stacktrace if value is 0', function () {
            Terror.stackTraceLimit = 0;

            terror = new Terror();

            assert.strictEqual((terror.stack || '').split('\n').length, 1);
        });

        it('may be applied to derived error class', function () {
            MyError = Terror.create('MyError');

            MyError.stackTraceLimit = 5;

            // base property is not affected
            assert.strictEqual(Terror.stackTraceLimit, 10);
            terror = new Terror();
            assert.strictEqual(terror.stack.split('\n').length, 11);

            terror = new MyError();
            assert.strictEqual(terror.stack.split('\n').length, 6);
        });

        it('should be inherited by derivatives', function () {
            Terror.stackTraceLimit = 5;

            MyError = Terror.create('MyError');

            assert.strictEqual(MyError.stackTraceLimit, 5);

            Terror.stackTraceLimit = 10;
        });
    });

    describe('#bind()', function () {
        it('should returns a context', function () {
            assert.strictEqual(terror.bind(), terror);
        });

        it('should copy properties from passed object', function () {
            data = {
                name: 'value'
            };

            terror.bind(data);

            assert.notStrictEqual(terror.data, data);
            assert.deepEqual(terror.data, data);
        });

        it('should fulfill placeholders in the error message with values of properties of passed object', function () {
            terror.setMessage('message %name% ');

            terror.bind({ name: 'value' });

            assert.equal(terror.message, 'message value ');
        });

        it('should keep placeholders in the message if passed object does not own properties with the same names',
            function () {
                terror.setMessage('message %name% ');

                terror.bind();
                assert.equal(terror.message, 'message %name% ');

                terror.bind(null);
                assert.equal(terror.message, 'message %name% ');

                terror.bind({ nick: 'doggy' });
                assert.equal(terror.message, 'message %name% ');
            });
    });

    describe('#setMessage()', function () {
        it('should set error message', function() {
            terror.setMessage('err0r');
            assert.equal(terror.message, 'err0r');
        });

        it('should fulfill placeholders in the new message with previously bound data', function() {
            terror
                .bind({
                    code: 100,
                    message: 'message',
                    some: 'bar'
                })
                .setMessage('error %code% %message%');

            assert.equal(terror.message, 'error 100 message');
        });

        it('should update error message in the first line of the stacktrace', function() {
            var msg = 'Test Message #956473';
            terror.setMessage(msg);
            var stackMsg = terror.stack.split('\n')[0];
            assert.include(stackMsg, msg);
        });
    });

    describe('#logger() [default logger]', function () {
        it('should call Terror#logMultilineError() by default', function () {
            terror.logMultilineError = sinon.spy();

            terror.logger('message', 'error');

            assert.calledWith(terror.logMultilineError, 'message', 'error');
        });
    });

    describe('#logMultilineError()', function () {
        var logger = sinon.spy();

        afterEach(function () {
            logger.reset();
            consoleLog.reset();
        });

        it('should use default log level if level is not passed', function () {
            terror.logMultilineError('message', null, logger);
            assert.calledWith(logger, Terror.DEFAULT_ERROR_LEVEL + ' message');
        });

        it('should use passed error level if any', function () {
            terror.logMultilineError('message', 'debug');
            assert.calledWith(consoleLog, 'DEBUG message');
        });

        it('should use console.log by default', function () {
            terror.logMultilineError('message');
            assert.called(consoleLog);
        });

        it('should use passed logger if any', function () {
            terror.logMultilineError('message', null, logger);
            assert.calledWith(logger, Terror.DEFAULT_ERROR_LEVEL + ' message');
        });

        it('should add padding to all rows after the first', function () {
            var stack = terror.stack.split('\n');

            terror.logMultilineError(terror.stack, 'ERR', function (message) {
                var padded = message.split('\n');
                var row;

                assert.equal(padded.length, stack.length);

                for (row = 1; row < padded.length; row++) {
                    assert.equal(padded[row], '>>> ' + stack[row]);
                }
            });
        });
    });

    describe('#getFullMessage()', function () {
        var myError;

        beforeEach(function () {
            MyError = Terror.create('MyError', {
                MY_CODE: 'Some message'
            });
        });

        it('should returns message including nested errors messages', function () {
            terror = new Terror(null, 'Parent message');
            myError = new MyError('MY_CODE', terror);

            assert.equal(myError.getFullMessage(), 'MY_CODE Some message. Parent message.');
        });

        it('should not include empty message', function () {
            terror = new Terror();
            myError = new MyError('MY_CODE', terror).setMessage(null);

            assert.equal(myError.getFullMessage(), 'MY_CODE Unknown error.');
        });

        it('should format error message', function () {
            myError = new MyError('MY_CODE').setMessage('My message');

            assert.equal(myError.getFullMessage(), 'MY_CODE My message.');
        });
    });

    describe('#getFullStack()', function () {
        it('should returns error stack including nested errors stack', function() {
            MyError = Terror.create('MyError');
            var limit = 3;
            MyError.stackTraceLimit = limit;

            var stack = new MyError(null, new Terror()).getFullStack().split('\n');

            assert.equal(stack.length, Terror.stackTraceLimit + limit + 4);
            assert.equal(stack[0], 'UNKNOWN_ERROR MyError: Unknown error');
            assert.equal(stack[limit + 2], '    UNKNOWN_ERROR Terror: Unknown error');
        });

        it('should not prepend messages of errors without code with "undefined"', function() {
            MyError = Terror.create('MyError');
            var limit = 3;
            MyError.stackTraceLimit = limit;

            var stack = new MyError(null, new Error('Something happen')).getFullStack().split('\n');

            assert.equal(stack.length, Terror.stackTraceLimit + limit + 4);
            assert.equal(stack[0], 'UNKNOWN_ERROR MyError: Unknown error');
            assert.equal(stack[limit + 2], '    Error: Something happen');
        });
    });

    describe('#log()', function () {
        var logger;

        beforeEach(function() {
            logger = sinon.spy();
        });

        afterEach(function() {
            Terror.setLogger(consoleLog);
        });

        it('should returns the context', function () {
            assert.strictEqual(terror.log(), terror);
        });

        it('should call instance logger', function () {
            Terror.setLogger(logger);

            terror.log('error');
            assert.called(terror.logger);
        });

        it('should call Terror#logger with full stack and log level', function () {
            Terror.setLogger(logger);

            terror.log('error');
            assert.calledWith(terror.logger, terror.getFullStack(), 'error');
        });

        it('should log single error only once', function () {
            Terror.setLogger(logger);

            terror.log('error');
            terror.log('error');
            assert.calledOnce(terror.logger);
        });

        it('should not log if logger set to non-function value', function () {
            var currentLogger = terror.logger;

            currentLogger.reset();

            Terror.setLogger(null);
            terror.log();
            assert.notCalled(currentLogger);
        });
    });
});
