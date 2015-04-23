Terror [![NPM version][npm-image]][npm-link] [![Build Status][build-image]][build-link]
======

[![Development Dependency status][devdeps-image]][devdeps-link]

Base error class which will help you organize errors, generate informative logs and as result grep logs more effectively.

## Trivial usage

```javascript
var Terror = require('terror'),

    // declare error type with custom error codes and messages
    MyError = Terror.create('MyError', {
        STRANGE_THING_HAPPENS: 'Something strange happens'
    });

try {
    // ...

    if (typeof userInput === 'undefined') {
        // throw error
        throw new MyError(MyError.CODES.STRANGE_THING_HAPPENS);
        // or
        // throw MyError.createError(MyError.CODES.STRANGE_THING_HAPPENS);
    }
} catch (err) {
    // ensureError method returns err if it is an instance of MyError,
    // otherwise wrap Error instance in the MyError with default code UNKNOWN_ERROR
    MyError.ensureError(err)
        .log();
}
```

## Constructor

```javascript
new Terror(code, originalError);
new Terror(code, message);
new Terror(code);
new Terror();
```

Also can be called as a function, then calls self as the constructor internally and returns created instance.

Both arguments are not required:
 * if only `code` passed, message will got from `Terror.MESSAGES` hash by the `code` value as the key;
 * if `code` is absent, will be used default value `Terror.CODES.UNKNOWN_ERROR`.

## Constructor methods

### create(name, codes)

Returns constructor inherited from Terror. You must specify `name` for logging purpose.

Arguments:
 * `{String} name` – Error class name for logging;
 * `{Object} [codes]` - CODES hash { CODE_NAME: 'error message', … }

Example:
```javascript
var AppError = Terror.create('AppError'),
    ControllerError = AppError.create('ControllerError', {
        IO_ERROR: 'Broken IO',
        FS_ERROR: 'Broken %fsName% file-system'
    });
```

### extendCodes(codes)

Extends `CODES` and associated `MESSAGES` hashes using `codes` declaration. Method throws an error if codes uniqueness violated by extension.

Example:
```javascript
var AppError = Terror
        .create('AppError')
        .extendCodes({
                BROKEN_CONFIG: 'Looks like configuration file is broken.',
                DB_CONNECTION_FAILED: 'Can not connect to database %db_host%'
        });

// now you can use AppError.CODES.BROKEN_CONFIG & AppError.CODES.DB_CONNECTION_FAILED to produce errors
new AppError(AppError.CODES.BROKEN_CONFIG);
```

### setLogger(logger)

Set function which error class and its inheritors will use for logging.
It called by `log` method with two arguments: `message` and `level`.

Example:
```javascript
var log = [],
    logger = function(message, level) {
        log.push([ new Date(), level, message ].join());
    },
    MyError = Terror.create('MyError').setLogger(logger);

MyError.createError().log();

console.log(log.join('\n'));
```

### createError(code, message | originalError | data)

Creates new `Terror` or its inheritor instance.

Arguments:
* `{Number} [code]` – error code from `CODES` hash, `Terror.CODES.UNKNOWN_ERROR` used as default value;
* `{String|Error|Terror|Object} [message|originalError|data]`
** if 2nd argument is String then use it as original error message;
** if 2nd argument is Error then use its message and call-stack to format original message;
** if 2nd argument is an Object then replace error message placeholders with provided data.

Example:
```javascript
var MyError = Terror.create('MyError', {
        IO_ERROR: 'Broken IO',
        FS_ERROR: 'Broken %fsName% file-system'
    });

// valid createError calls

// "UNKNOWN_ERROR Terror: Unknown error"
Terror.createError();

// same as above
Terror.createError(Terror.CODES.UNKNOWN_ERROR);

// "UNKNOWN_ERROR MyError: Unknown error"
MyError.createError();

// "IO_ERROR MyError: Broken IO"
MyError.createError(MyError.CODES.IO_ERROR);

// "IO_ERROR MyError: Broken IO (Error: kbd int broken)"
MyError.createError(MyError.CODES.IO_ERROR, new Error('kbd int broken'));

// "FS_ERROR MyError: Broken vfat file-system"
MyError.createError(MyError.CODES.FS_ERROR, { fsName: 'vfat' });

// fails, because code IO_ERROR is not defined for Terror
Terror.createError(MyError.CODES.IO_ERROR);
```

### ensureError(originalError, code)

Returns `originalError` if it's an instance of the owning class.
Otherwise wrap `originalError` into new owning class instance using `code` or `UNKNOWN_ERROR` code if second argument is absent.

Example:
```javascript
var MyError = Terror.create('MyError', {
        EMPTY_MESSAGE: 'Message string is empty',
        UNEXPECTED_ERROR: 'Unexpected error'
    }),
    arr = [ { msg: "hello" }, { msg: "" }, {} ];

arr.forEach(function(item) {
    try {
        if (item.msg.length > 0) {
            console.log(item.msg);
        } else {
            throw MyError.createError(MyError.CODES.EMPTY_MESSAGE);
        }
    } catch (err) {
        throw MyError.ensureError(err, MyError.CODES.UNEXPECTED_ERROR)
            .log(); // logging like MyError instance
    }
})
```

### isTerror(error)

Checks whether the `error` is an instance of Terror class.

Example:
```javascript
var err = new Error('average error here');
Terror.isTerror(err) === false;

var terr = Terror.ensureError(err);
Terror.isTerror(terr) === true;
```

### is(code, error)

Checks whether the `error` is an instance of the context class and an error code equals the passed one.

Example:
```javascript
var MyError = Terror.create('MyError', {
        XCODE: 'code X',
        ZCODE: 'code Z'
    });

MyError.is(MyError.CODES.XCODE, MyError.createError(MyError.CODES.XCODE)); // => true
MyError.is(MyError.CODES.ZCODE, MyError.createError(MyError.CODES.XCODE)); // => false
MyError.is(MyError.CODES.XCODE, Terror.createError()); // => false
```

## Methods of prototype

### log(level)

Log error with specified `level`. If method called twice or more for the same instance, logger will be called by first `log` call only.

Arguments:
* `{*} [level=constructor.DEFAULT_LOG_LEVEL]` – any type accepted by logger.

Example:
```javascript
var Terror = require('terror'),
    terr;

Terror.DEFAULT_LOG_LEVEL = 'INFO';

try {
    console.lag("hello!");
} catch (err) {
    terr = Terror.ensureError(err);
    terr.log()
        .log('warn')
        .log('error');
}
```

`terr` will be logged once with 'INFO' error level.

### bind(data)

Fill an error message with values from `data` object properties.

Arguments:
* `{Object} data` – hash, where key is a placeholder name to be replaced, value – a data to replace with.

Example:
```javascript
var IOError = Terror.create('MyError', {
        IO_ERROR: 'Broken IO pipe "%pipe%"'
    });

IOError.createError(IOError.CODES.IO_ERROR)
    .bind({ pipe: 'main bus' })
    .log('PANIC');
// or
IOError.createError(IOError.CODES.IO_ERROR, { pipe: 'main bus' })
    .log('PANIC');
```

## Internal, but useful prototype methods

Following methods used by built-in logger routine, but may be useful for any simple text logger.

### logMultilineError(message, level, logger)

Formats error message and calls `logger(formattedMessage)`.

Formatting is optimized for output call-stacks to the text files and future grep through.

Format:
```
LEVEL CODE CLASS: MESSAGE
>>>>>   CALL STACK ROW 1
…
>>>>>   CALL STACK ROW N
```

Example:
```
ERROR UNKNOWN_ERROR Terror: Unknown error (TypeError: Object #<Console> has no method 'lag')
>>>>>     at repl:2:9
>>>>>     at REPLServer.self.eval (repl.js:110:21)
>>>>>     at repl.js:249:20
>>>>>     at REPLServer.self.eval (repl.js:122:7)
>>>>>     at Interface.<anonymous> (repl.js:239:12)
>>>>>     at Interface.EventEmitter.emit (events.js:95:17)
>>>>>     at Interface._onLine (readline.js:202:10)
>>>>>     at Interface._line (readline.js:531:8)
>>>>>     at Interface._ttyWrite (readline.js:754:14)
>>>>>     at ReadStream.onkeypress (readline.js:99:10)
```

[npm-image]: https://img.shields.io/npm/v/terror.svg?style=flat
[npm-link]: https://npmjs.org/package/terror
[build-image]: https://img.shields.io/travis/nodules/terror.svg?style=flat
[build-link]: https://travis-ci.org/nodules/terror
[devdeps-image]: https://img.shields.io/david/dev/nodules/terror.svg?style=flat
[devdeps-link]: https://david-dm.org/nodules/terror#info=devDependencies
