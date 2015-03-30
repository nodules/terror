var Terror = require('../lib/terror');

describe('Terror.', function () {
    var terror;
    var error;
    var data;
    var MyError;
    var customLogger = jasmine.createSpy();

    console.log = customLogger;

    function checkInstance(code, message, original, data, name) {
        expect(terror.code).toBe(code);
        expect(terror.message).toBe(message);
        expect(terror.originalError).toBe(original);

        if (arguments.length >= 4) {
            expect(terror.data).toEqual(data);
        } else {
            expect(terror.data).toEqual({});
        }

        if (arguments.length === 5) {
            expect(terror.name).toBe(name);
        } else {
            expect(terror.name).toBe('Terror');
        }
    }

    beforeEach(function () {
        terror = new Terror();
    });

    it('Check exports', function () {
        expect(typeof Terror).toBe('function');
        expect(Terror.DEFAULT_ERROR_LEVEL).toBe('ERROR');

        expect(Terror.CODES).toEqual({
            UNKNOWN_ERROR: 'UNKNOWN_ERROR'
        });

        expect(Terror.MESSAGES).toEqual({
            UNKNOWN_ERROR: 'Unknown error'
        });
    });

    it('Prototype should be inherit from Error', function () {
        expect(Terror.prototype instanceof Error).toBeTruthy();
        expect(Terror.prototype.constructor).toBe(Terror);
    });

    describe('Create instance.', function () {
        it('Check inherits', function () {
            expect(terror instanceof Error).toBeTruthy();
            expect(terror instanceof Terror).toBeTruthy();

            expect(terror.constructor).toBe(Terror);
        });

        it('Check error code', function () {
            terror = new Terror();
            checkInstance('UNKNOWN_ERROR', 'Unknown error');

            terror = new Terror(null);
            checkInstance('UNKNOWN_ERROR', 'Unknown error');

            terror = new Terror('code');
            checkInstance('code');
        });

        it('Check message', function () {
            terror = new Terror('code', 'message');
            checkInstance('code', 'message');

            terror = new Terror(null, 'message');
            checkInstance('UNKNOWN_ERROR', 'message');
        });

        it('Define original error', function () {
            error = new Error('message');
            terror = new Terror(null, error);

            checkInstance('UNKNOWN_ERROR', 'Unknown error', error);

            terror = new Terror('code', error);
            checkInstance('code', undefined, error);
        });

        it('Check capture stack trace', function () {
            var error = new Error().stack.split('\n')[1];
            var terror = new Terror().stack.split('\n')[1];

            expect(error.substr(0, error.length - 7)).toBe(terror.substr(0, terror.length - 7));
        });
    });

    describe('Terror.createError', function () {
        it('Check inherits', function () {
            terror = Terror.createError();

            expect(terror instanceof Error).toBeTruthy();
            expect(terror instanceof Terror).toBeTruthy();

            expect(terror.constructor).toBe(Terror);
        });

        it('Check error code', function () {
            terror = new Terror();
            checkInstance('UNKNOWN_ERROR', 'Unknown error');

            terror = Terror.createError(null);
            checkInstance('UNKNOWN_ERROR', 'Unknown error');

            terror = Terror.createError('code');
            checkInstance('code');
        });

        it('Check message', function () {
            terror = Terror.createError('code', 'message');
            checkInstance('code', 'message');

            terror = Terror.createError(null, 'message');
            checkInstance('UNKNOWN_ERROR', 'message');
        });

        it('Define original error', function () {
            error = new Error('message');
            terror = Terror.createError(null, error);

            checkInstance('UNKNOWN_ERROR', 'Unknown error', error);

            terror = Terror.createError('code', error);
            checkInstance('code', undefined, error);
        });

        it('Check capture stack trace', function () {
            var error = new Error().stack.split('\n')[1];
            var terror = Terror.createError().stack.split('\n')[1];

            expect(error.substr(0, error.length - 7)).toBe(terror.substr(0, terror.length - 7));
        });

        it('Should bind a data', function () {
            data = {
                name: 'value'
            };
            terror = Terror.createError(null, data);

            checkInstance('UNKNOWN_ERROR', 'Unknown error', undefined, data);
            expect(terror.data).not.toBe(data);
        });
    });

    describe('Terror.create', function () {
        it('Check inherits', function () {
            MyError = Terror.create('MyError');

            expect(typeof MyError).toBe('function');
            expect(MyError.name).toBe('MyError');
            expect(MyError.prototype instanceof Terror).toBeTruthy();
            expect(MyError.prototype.constructor).toBe(MyError);
        });

        it('Check static properties', function () {
            MyError = Terror.create('MyError');

            expect(MyError.create).toBe(Terror.create);
            expect(MyError.extendCodes).toBe(Terror.extendCodes);
            expect(MyError.setLogger).toBe(Terror.setLogger);
            expect(MyError.createError).toBe(Terror.createError);
            expect(MyError.ensureError).toBe(Terror.ensureError);
            expect(MyError.stackTraceLimit).toBe(Terror.stackTraceLimit);

            expect(MyError.CODES).toEqual(Terror.CODES);
            expect(MyError.CODES).not.toBe(Terror.CODES);

            expect(MyError.MESSAGES).toEqual(Terror.MESSAGES);
            expect(MyError.MESSAGES).not.toBe(Terror.MESSAGES);

            expect(MyError.DEFAULT_ERROR_LEVEL).toBe(Terror.DEFAULT_ERROR_LEVEL);
        });

        it('Check multiple inheritance', function () {
            MyError = Terror.create('MyError');

            var Child = MyError.create('Child');

            terror = new Child();

            expect(terror instanceof Child).toBeTruthy();
            expect(terror instanceof MyError).toBeTruthy();

            checkInstance('UNKNOWN_ERROR', 'Unknown error', undefined, {}, 'Child');
        });

        it('Check instance', function () {
            MyError = Terror.create('MyError');
            terror = new MyError();

            expect(terror instanceof MyError).toBeTruthy();
            expect(terror instanceof Terror).toBeTruthy();
            expect(terror instanceof Error).toBeTruthy();

            checkInstance('UNKNOWN_ERROR', 'Unknown error', undefined, {}, 'MyError');
        });

        it('Should merge CODES and MESSAGES', function () {
            MyError = Terror.create('MyError', {
                CODE: 'Message'
            });

            expect(MyError.CODES).toEqual({
                UNKNOWN_ERROR: 'UNKNOWN_ERROR',
                CODE: 'CODE'
            });

            expect(MyError.MESSAGES).toEqual({
                UNKNOWN_ERROR: 'Unknown error',
                CODE: 'Message'
            })
        });
    });

    it('Terror.isTerror', function () {
        expect(Terror.isTerror()).toBeFalsy();
        expect(Terror.isTerror(null)).toBeFalsy();
        expect(Terror.isTerror(123)).toBeFalsy();
        expect(Terror.isTerror('error')).toBeFalsy();
        expect(Terror.isTerror({})).toBeFalsy();
        expect(Terror.isTerror(new Error('error'))).toBeFalsy();

        expect(Terror.isTerror(new Terror())).toBeTruthy();
        expect(Terror.create('MyError').createError()).toBeTruthy();
        expect(Terror.isTerror({
            _isTerror: true
        })).toBeTruthy();
    });

    describe('Terror.extendCodes', function () {
        it('Should return current context', function () {
            expect(Terror.extendCodes({})).toBe(Terror);

            MyError = Terror.create('MyError');
            expect(MyError.extendCodes({})).toBe(MyError);
        });

        it('Should merge CODES and MESSAGES', function () {
            MyError = Terror
                .create('MyError')
                .extendCodes({
                    CODE: 'Message'
                });

            expect(MyError.CODES).toEqual({
                UNKNOWN_ERROR: 'UNKNOWN_ERROR',
                CODE: 'CODE'
            });

            expect(MyError.MESSAGES).toEqual({
                UNKNOWN_ERROR: 'Unknown error',
                CODE: 'Message'
            });
        });

        it('Should throw an exception if a code is exists', function () {
            expect(function () {
                Terror.extendCodes({
                    UNKNOWN_ERROR: 'Unknown error'
                });
            }).toThrow();
        });
    });

    describe('Terror.ensureError', function () {
        it('Should don`t wrap if the message it is instance of a current constructor', function () {
            terror = new Terror();
            expect(Terror.ensureError(terror)).toBe(terror);

            MyError = Terror.create('MyError');
            terror = new MyError();
            expect(MyError.ensureError(terror)).toBe(terror);
        });

        it('Should wrap if the message is not an error', function () {
            terror = Terror.ensureError(123);
            checkInstance('UNKNOWN_ERROR', 'Unknown error');

            terror = Terror.ensureError({});
            checkInstance('UNKNOWN_ERROR', 'Unknown error');

            terror = Terror.ensureError();
            checkInstance('UNKNOWN_ERROR', 'Unknown error');

            terror = Terror.ensureError(null);
            checkInstance('UNKNOWN_ERROR', 'Unknown error');
        });

        it('Should set an original error if message is a error', function () {
            error = new Error('error');
            terror = Terror.ensureError(error);
            checkInstance('UNKNOWN_ERROR', 'Unknown error', error);
        });

        it('Should set the property message, if the argument is an error message', function () {
            terror = Terror.ensureError('message');
            checkInstance('UNKNOWN_ERROR', 'message');
        });

        it('Should wrap if the message is not instance of this constructor', function () {
            MyError = Terror.create('MyError');

            error = new Terror();
            terror = MyError.ensureError(error);
            checkInstance('UNKNOWN_ERROR', 'Unknown error', error, {}, 'MyError');
        });

        it('Should don`t wrap if the message inherits from current constructor', function () {
            terror = new Terror();
            expect(Terror.ensureError(terror)).toBe(terror);

            MyError = Terror.create('MyError');
            terror = new MyError();
            expect(Terror.ensureError(terror)).toBe(terror);
        });

        it('Should set a code of an error', function () {
            terror = Terror.ensureError('message', 'code');
            checkInstance('code', 'message');

            error = new Terror();
            terror = Terror.ensureError(error, 'code');
            checkInstance('UNKNOWN_ERROR', 'Unknown error');
        });
    });

    it('Terror.setLogger', function () {
        var defaultLogger = terror.logger;
        var logger = function () {};

        Terror.setLogger(logger);

        expect(terror.logger).toBe(logger);

        Terror.setLogger(defaultLogger);
    });

    describe('Terror.stackTraceLimit', function () {
        afterEach(function () {
            Terror.stackTraceLimit = 10;
        });

        it('Should be default is 10', function () {
            expect(Terror.stackTraceLimit).toBe(10);
        });

        it('Check effect', function () {
            Terror.stackTraceLimit = 5;

            terror = new Terror();

            expect(terror.stack.split('\n').length).toBe(6);
        });

        it('Stack trace should be empty if value set to 0', function () {
            Terror.stackTraceLimit = 0;

            terror = new Terror();

            expect((terror.stack || '').split('\n').length).toBe(1);
        });

        it('Change for custom error', function () {
            MyError = Terror.create('MyError');

            MyError.stackTraceLimit = 5;

            expect(Terror.stackTraceLimit).toBe(10);

            terror = new MyError();
            expect(terror.stack.split('\n').length).toBe(6);

            terror = new Terror();
            expect(terror.stack.split('\n').length).toBe(11);
        });

        it('Stack trace limit should be equal to parent', function () {
            Terror.stackTraceLimit = 5;

            MyError = Terror.create('MyError');

            expect(MyError.stackTraceLimit).toBe(5);

            Terror.stackTraceLimit = 10;
        });
    });

    describe('Terror#bind', function () {
        it('Should returns a instance of terror', function () {
            expect(terror.bind()).toBe(terror);
        });

        it('Should copy bind object', function () {
            data = {
                name: 'value'
            };

            terror.bind(data);

            expect(terror.data).toEqual(data);
            expect(terror.data).not.toBe(data);
        });

        it('Should change message', function () {
            terror.setMessage('message %name% ');

            expect(terror.message).toBe('message %name% ');

            terror.bind({
                name: 'value'
            });

            expect(terror.message).toBe('message value ');
        });

        it('Don`t should change message if data equal null or undefined', function () {
            terror
                .setMessage('message %name% ')
                .bind();

            expect(terror.message).toBe('message %name% ');

            terror.bind(null);

            expect(terror.message).toBe('message %name% ');
        });
    });

    it('Terror#setMessage', function () {
        var message = 'error %code% %message%';

        terror
            .bind({
                code: 100,
                message: 'message',
                some: 'bar'
            })
            .setMessage(message);

        expect(terror.message).toBe('error 100 message');

        terror.setMessage('error');

        expect(terror.message).toBe('error');
    });

    describe('Terror#logger', function () {
        it('should be default call Terror#logMultilineError', function () {
            terror.logMultilineError = jasmine.createSpy();

            terror.logger('message', 'error');

            expect(terror.logMultilineError).toHaveBeenCalledWith('message', 'error');
        });
    });

    describe('Terror#log', function () {
        it('should returns the current context', function () {
            expect(terror.log()).toBe(terror);
        });

        it('should use default console.log', function () {
            terror.log();

            expect(customLogger).toHaveBeenCalled();

            customLogger.calls.reset();
        });

        it('should call Terror#logger with full stack and log level', function () {
            terror.logger = jasmine.createSpy();
            terror.log('error');

            expect(terror.logger).toHaveBeenCalledWith(terror.getFullStack(), 'error');
        });

        it('should be once log', function () {
            terror.logger = jasmine.createSpy();
            terror.log('error');
            terror.log('error');

            expect(terror.logger.calls.count()).toBe(1);
        });

        it('should don`t log if logger is not a function', function () {
            terror.logger = null;
            terror.log();

            expect(customLogger).not.toHaveBeenCalled();
        });
    });

    describe('Terror#logMultilineError', function () {
        var logger = jasmine.createSpy();

        afterEach(function () {
            logger.calls.reset();
        });

        it('should be returns the current context', function () {
            expect(terror.logMultilineError('message')).toBe(terror);
        });

        it('should use default log level', function () {
            terror.logMultilineError('message', null, logger);

            expect(logger).toHaveBeenCalledWith('ERROR message');
        });

        it('should use default console.log', function () {
            terror.logMultilineError('message');

            expect(customLogger).toHaveBeenCalled();

            customLogger.calls.reset();
        });

        it('should use custom logger', function () {
            terror.logMultilineError('message', 'Debug', logger);

            expect(logger).toHaveBeenCalledWith('DEBUG message');
        });

        it('should add arrows to stack', function () {
            var stack = terror.stack.split('\n');

            terror.logMultilineError(terror.stack, 'ERR', function (message) {
                message = message.split('\n');

                var length = message.length;
                var index = 1;

                expect(index < length).toBeTruthy();

                while (index < length) {
                    expect(message[index]).toBe('>>> ' + stack[index]);

                    index++;
                }
            });
        });
    });

    describe('Terror#getFullMessage', function () {
        var myError;

        beforeEach(function () {
            MyError = Terror.create('MyError', {
                MY_CODE: 'Some message'
            });
        });

        it('should includes all messages', function () {
            terror = new Terror(null, 'Parent message');
            myError = new MyError('MY_CODE', terror);

            expect(myError.getFullMessage()).toBe('MY_CODE Some message. Parent message.')
        });

        it('should don`t include empty message', function () {
            terror = new Terror();
            myError = new MyError('MY_CODE', terror).setMessage(null);

            expect(myError.getFullMessage()).toBe('MY_CODE Unknown error.');
        });

        it('should be format error message', function () {
            terror = new Terror(null, 'Error');
            myError = new MyError('MY_CODE', terror).setMessage('My message.');

            expect(myError.getFullMessage()).toBe('MY_CODE My message. Error.');
        });
    });

    it('Terror#getFullStack', function () {
        MyError = Terror.create('MyError');
        MyError.stackTraceLimit = 3;

        var stack = new MyError(null, new Terror()).getFullStack().split('\n');

        expect(stack.length).toBe(17);
        expect(stack[0]).toBe('UNKNOWN_ERROR MyError: Unknown error');
        expect(stack[5]).toBe('    UNKNOWN_ERROR Terror: Unknown error');
    });
});
