var test = require('chai').assert,
    Terror = require('../lib/Terror'),
    originalConsoleLog = console.log,
    log = [];

function restoreConsoleLog() {
    console.log = originalConsoleLog;
}

function catchConsoleLog() {
    log = [];

    console.log = function(msg) {
        var _msg = msg.split('\n'),
            i = 0,
            line;
        while (/* jshint boss:true */line = _msg[i++]) {
            log.push(line);
        }
    };
}

module.exports = {
    constructor : function() {
        var testErrorName = 'TestError',
            errorMessage = 'Test Error message',
            TestError = Terror.create(testErrorName),
            testError = new TestError(TestError.CODES.UNKNOWN_ERROR),
            testError2 = new TestError(
                TestError.CODES.UNKNOWN_ERROR,
                TestError.MESSAGES[TestError.CODES.UNKNOWN_ERROR]),
            terrorDefaultCode = new TestError(),
            terrorViaCtor = new TestError(TestError.CODES.UNKNOWN_ERROR, errorMessage);

        test.ok(testError instanceof TestError, 'inheritance check #1');
        test.ok(testError instanceof Error, 'inheritance check #2');
        test.ok(testError instanceof Object, 'inheritance check #3');

        test.strictEqual(testError.message, testError2.message, 'constructor call with `code` argument only');
        test.strictEqual(testError.message, Terror.MESSAGES[Terror.CODES.UNKNOWN_ERROR], 'message by code selection');
        test.strictEqual(TestError.prototype.name, testErrorName, '`name` prototype property set');
        test.ok(Object.prototype.hasOwnProperty.call(TestError.prototype,'name'), 'Terror inheritor has own prototype property `name`');
        test.strictEqual(testError.name, testErrorName, '`name` property available in the instance');

        test.strictEqual(terrorDefaultCode.code, TestError.CODES.UNKNOWN_ERROR, 'use default code, if no one passed to createError');
        test.strictEqual(terrorViaCtor.message, errorMessage, 'message passed to constructor as string');

        test.strictEqual(typeof testError.stack, 'string', 'call stack available via `stack` property');
    },

    "createError & extendCodes" : function() {
        var testCodes = {
                USER_ERROR : 'User "%username%" leads to error',
                ABSOLUTE_ERROR : 'Our World Is Broken...'
            },
            TestError = Terror.create('TestError').extendCodes(testCodes),
            TestErrorWithCodes = Terror.create('TestErrorWithCodes', testCodes),
            errorMessage = 'Test Error message',
            userName = 'john_doe',
            originalError = new Error(errorMessage),
            terrorByError = TestError.createError(null, originalError),
            terrorWithData = TestError.createError(TestError.CODES.USER_ERROR, { username : userName }),
            terrorWithMessage = TestError.createError(TestError.CODES.USER_ERROR, errorMessage),
            terrorWithZeroErrorCode = TestError.createError(TestError.CODES.ABSOLUTE_ERROR);

        test.strictEqual(terrorByError.code, TestError.CODES.UNKNOWN_ERROR, 'use default code, if no one passed to createError');
        test.strictEqual(terrorByError.originalError, originalError, 'Error instance passed to createError');

        test.strictEqual(terrorWithZeroErrorCode.code, TestError.CODES.ABSOLUTE_ERROR, 'error with zero code doesn\'t use default code');

        test.strictEqual(terrorWithMessage.code, TestError.CODES.USER_ERROR, 'error code passed to createError with custom message');

        // Строка сообщения об ошибке не является оригинальным объектом ошибки!
        test.equal(terrorWithMessage.originalError, null, 'custom message passed to createError');

        test.notStrictEqual(TestError.CODES, Terror.CODES, 'static field CODE deep copied');
        test.notStrictEqual(TestError.MESSAGES, Terror.MESSAGES, 'static field MESSAGES deep copied');

        Object.getOwnPropertyNames(Terror.CODES).forEach(function(code) {
            test.strictEqual(
                TestError.CODES[code],
                Terror.CODES[code],
                ['error code "', code, '" inheritance from ', Terror.prototype.name].join(''));
            test.strictEqual(
                TestError.MESSAGES[code],
                Terror.MESSAGES[code],
                ['error message "', code, '" : ', code, ' inheritance from ', Terror.prototype.name].join(''));
        });

        Object.getOwnPropertyNames(testCodes).forEach(function(code) {
            [TestError, TestErrorWithCodes].forEach(function(toTest) {
                test.strictEqual(
                    toTest.MESSAGES[code],
                    testCodes[code],
                    ['Terror inheritor "',toTest.prototype.name,'" has it\'s own error message "', code, '" : ', code].join(''));
            });

        });

        test.strictEqual(
            terrorWithData.message,
            TestError.MESSAGES[TestError.CODES.USER_ERROR].replace('%username%', userName),
            'message data bindings via createError');

    },

    "logError, setLogger, logger and error formatting" : function() {
        var errorClassName = 'TestError',
            testCodes = { USER_ERROR : 'User "%username%" leads to error at %time%' },
            TestError = Terror.create(errorClassName).extendCodes(testCodes),
            errorMessage = 'Test Error message',
            //userName = 'john_doe',
            //time = '12:05',
            errorLevel = 'panic',
            originalError = new Error(errorMessage),
            terrorByError = TestError.createError(null, originalError),
            //terrorWithData = TestError.createError(TestError.CODES.USER_ERROR, { username : userName, time : time }),
            terrorWithMessage = TestError.createError(TestError.CODES.USER_ERROR, errorMessage);

        catchConsoleLog();
        terrorByError.log();
        restoreConsoleLog();

        test.ok(log.length > 1, 'multiline log');

        test.strictEqual(log[0].split(' ')[0], TestError.DEFAULT_ERROR_LEVEL, 'default error level');

        test.strictEqual(
            log[1].split(' ')[0],
            TestError.DEFAULT_ERROR_LEVEL.replace(/./g, '>'),
            'error level replaced with ">"');

        //test.strictEqual(log[0].split(' ')[2].replace(/:$/g, ''), errorClassName, 'log error class name');

        // Сообщение об ошибке не дублируется!
        /*test.strictEqual(
            log[0].split(' ').slice(3).join(' ').replace(/^.*\(Error: (.*)\)$/g, "$1"),
            errorMessage,
            'log original error message');*/

        catchConsoleLog();
        terrorByError.log();
        restoreConsoleLog();

        test.strictEqual(log.length, 0, 'log error only once');

        catchConsoleLog();
        terrorWithMessage.log(errorLevel);
        restoreConsoleLog();

        /*test.strictEqual(
            log[0].split(' ').slice(3).join(' ').replace(/.*\((.*)\)$/g, "$1"),
            errorMessage,
            'append original error message');*/
        test.strictEqual(
            log[0].split(' ')[0],
            errorLevel.toUpperCase(),
            'custom error level passed to logError');
        /*test.strictEqual(
            log[0].split(' ')[1],
            TestError.CODES.USER_ERROR,
            'custom error code');*/

        /*catchConsoleLog();
        terrorWithData.log();
        restoreConsoleLog();

        test.strictEqual(
            log[0].split(' ').slice(3).join(' '),
            TestError.MESSAGES[TestError.CODES.USER_ERROR].replace('%username%', userName).replace('%time%', time),
            'data binding via createError');*/
    },

    "bind" : function() {
        var testCodes = {
                USER_ERROR : 'User "%username%" leads to error at %time%',
                TO_STRING_TEST : '%toString%'
            },
            TestError = Terror.create('TestError').extendCodes(testCodes),
            //userName = 'john_doe',
            //time = '12:04',
            terrorNotBinded = TestError.createError(TestError.CODES.USER_ERROR)
            /*terrorBinded = TestError
                .createError(TestError.CODES.USER_ERROR)
                .bind({ username : userName, time : time }),
            terrorProto = TestError.createError(TestError.CODES.TO_STRING_TEST)*/;

        catchConsoleLog();
        terrorNotBinded.log();
        restoreConsoleLog();

        /*test.strictEqual(
            log[0].split(' ').slice(3).join(' '),
            TestError.MESSAGES[TestError.CODES.USER_ERROR],
            'not binded error message contains placeholder');*/

        /*catchConsoleLog();
        terrorBinded.log();
        restoreConsoleLog();

        test.strictEqual(
            log[0].split(' ').slice(3).join(' '),
            TestError.MESSAGES[TestError.CODES.USER_ERROR].replace('%username%', userName).replace('%time%', time),
            'bind placeholders replacement done');

        terrorProto.bind({});
        catchConsoleLog();
        terrorProto.log();
        restoreConsoleLog();

        test.strictEqual(
            log[0].split(' ').slice(3).join(' '),
            TestError.MESSAGES[TestError.CODES.TO_STRING_TEST],
            'placeholder still here');*/

        // Стек формируется один раз!
        /*terrorProto._isLogged = false;
        terrorProto.bind({ toString : userName });
        catchConsoleLog();
        terrorProto.log();
        restoreConsoleLog();

        test.strictEqual(
            log[0].split(' ').slice(3).join(' '),
            TestError.MESSAGES[TestError.CODES.TO_STRING_TEST],
            'placeholder still here');

        test.strictEqual(terrorBinded.data.username, userName,
            'binded data available via `data` property');*/
    },

    "ensureError" : function() {
        var rawError = new Error('test error'),
            terror = new Terror(null, 'test error'),
            ChildError = Terror.create('ChildError', {}),
            childError = new ChildError(null, 'test child terror error'),
            ensuredError,
            code = 'TEST_CODE',
            zeroCode = '',
            ensuredErrorWithCode,
            ensuredErrorWithZeroCode;

        try {
            throw rawError;
        } catch (err) {
            ensuredError = Terror.ensureError(err);

            test.notEqual(err, ensuredError, 'ensured error is not the same as raw Error');
            test.strictEqual(ensuredError.originalError, err, 'ensured error refers to the original raw Error');
            test.ok(ensuredError instanceof Terror, 'ensured error is an instance of the Terror');
        }

        ensuredError = undefined;

        try {
            throw rawError;
        } catch (err) {
            ensuredErrorWithCode = Terror.ensureError(err, code);
            ensuredErrorWithZeroCode = Terror.ensureError(err, zeroCode);

            test.strictEqual(ensuredErrorWithCode.code, code, 'ensured error code is the same as passed');
            test.strictEqual(ensuredErrorWithZeroCode.code, zeroCode, 'ensured error zero code is still zero');
        }

        ensuredError = undefined;

        try {
            throw terror;
        } catch (err) {
            ensuredError = Terror.ensureError(err);

            test.strictEqual(ensuredError, terror, 'original Terror instance is the same object as of ensured error');
        }

        ensuredError = undefined;

        try {
            throw rawError;
        } catch (err) {
            ensuredError = ChildError.ensureError(err);

            test.ok(ensuredError instanceof Terror, 'ensured as ChildError error is an instance of the Terror');
            test.ok(ensuredError instanceof ChildError, 'ensured as ChildError error is an instance of the ChildError');
        }

        ensuredError = undefined;

        try {
            throw terror;
        } catch (err) {
            ensuredError = ChildError.ensureError(err);

            test.notEqual(err, ensuredError, 'ensured as ChildError error is not the same as error of Terror');
            test.strictEqual(ensuredError.originalError, err, 'ensured as ChildError error refers to the original error of Terror');
            test.ok(ensuredError instanceof Terror, 'ensured as ChildError error is an instance of the Terror');
            test.ok(ensuredError instanceof ChildError, 'ensured as ChildError error is an instance of the ChildError');
        }

        ensuredError = undefined;

        try {
            throw childError;
        } catch (err) {
            ensuredError = ChildError.ensureError(err);

            test.strictEqual(err, ensuredError, 'original ChildError instance is the same object as of ensured error');
        }
    },

    "isTerror" : function() {
        var ChildError = Terror.create('ChildError', {}),
            rawError = new Error('test error'),
            terror = new Terror(null, 'test error'),
            childTerror = new ChildError(null, 'test child terror error'),
            ensuredError;

        test.notOk(Terror.isTerror(rawError), 'an instance of Error is not recognized as a Terror instance');
        test.ok(Terror.isTerror(terror), 'an instance of Terror is recognized');
        test.ok(Terror.isTerror(childTerror), 'an instance of descendant Terror class is recognized');

        try {
            throw rawError;
        } catch (err) {
            test.notOk(Terror.isTerror(err), 'an instance of catched Error is not recognized as a Terror instance');

            ensuredError = Terror.ensureError(err);
            test.ok(Terror.isTerror(ensuredError), 'an instance of ensured error is recognized');
        }

        ensuredError = undefined;

        try {
            throw terror;
        } catch (err) {
            test.ok(Terror.isTerror(err), 'an instance of catched Terror is recognized');

            ensuredError = Terror.ensureError(err);
            test.ok(Terror.isTerror(ensuredError), 'an instance of ensured error is recognized');
        }
    }
};
