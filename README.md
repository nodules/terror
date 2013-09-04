# Terror [![Build Status](https://secure.travis-ci.org/nodules/terror.png)](http://travis-ci.org/nodules/terror)

Base error class which will help you organize errors, generate informative logs and as result grep logs more effectively.

## Trivial usage

```javascript
var Terror = require('terror'),

    // declare error type with custom error codes and messages
    MyError = Terror.create('MyError', {
        STRANGE_THING_HAPPENS: [ 2001, 'Something strange happens' ]
    });

try {
    // ...

    if (typeof userInput === 'undefined') {
        // throw error
        throw MyError.createError(MyError.CODES.STRANGE_THING_HAPPENS);
        // or
        // throw new MyError(MyError.CODES.STRANGE_THING_HAPPENS);
    }
} catch (err) {
    // ensureError method returns err if it is an instance of Terror,
    // otherwise wrap Error instance in the Terror with default code UNKNOWN_ERROR
    MyError.ensureError(err)
        .log();
}
```

## Constructor

```javascript
new Terror(code, message);
new Terror(code);
new Terror();
new Terror(null, message);
```

Also can be called as a function, then calls self as the constructor internally and returns created instance.

Both arguments are not required:
 * if only `code` passed, message will got from `Terror.MESSAGES` hash by the `code` value as the key;
 * if `code` is absent, will be used default value `Terror.CODES.UNKNOWN_ERROR`.

## Constructor methods

### create(name, constructor, codes)

Returns constructor inherited from Terror or it's inheritor. You must specify `name` for logging purpose.

Arguments:
 * `{String} name` – Error Class name for logging;
 * `{Function} [constructor]` – don't forget to call `<YouErrorClass>.__super.apply(this, arguments)`.
 * `{Object} [codes]` - CODES hash { CODE_NAME: [ 2001, 'error message' ], … }

Example:
```javascript
var AppError = Terror.create('AppError'),
    ControllerError = AppError.create('ControllerError', function(controller) {
        ControllerError.__super.apply(this, Array.prototype.slice.call(arguments, 1));
        this.controller = controller;
    }, {
        IO_ERROR: [ 2001, 'Broken IO' ],
        FS_ERROR: [ 2002, 'Broken %fsName% file-system' ]
    });
```

### extendCodes(codes)

Extends `CODES` and associated `MESSAGES` hashes using `codes` declaration. Method throws an error if codes uniqueness violated by extension.

Example:
```javascript
var AppError = Terror
        .create('AppError')
        .extendCodes({
                BROKEN_CONFIG: [ 2001, 'Looks like configuration file is broken.' ],
                DB_CONNECTION_FAILED: [ 2002, 'Can not connect to database %db_host%' ]
        });

// now you can use AppError.CODES.BROKEN_CONFIG & AppError.CODES.DB_CONNECTION_FAILED to produce errors
AppError.createError(AppError.CODES.BROKEN_CONFIG);
```

Previous example produces following `CODES`, `MESSAGES` and `CODE_NAMES` structures:
```javascript
AppError.CODES = {
    UNKNOWN_ERROR: 101,
    BROKEN_CONFIG: 2001,
    DB_CONNECTION_FAILED: 2002
}

AppError.MESSAGES = {
    101: 'Unknown error',
    2001: 'Looks like configuration file is broken.',
    2002: 'Can not connect to database %db_host%'
}

AppError.CODE_NAMES = {
    101: 'UNKNOWN_ERROR',
    2001: 'BROKEN_CONFIG',
    2002: 'DB_CONNECTION_FAILED'
}
```

Where error `101` inherited from the `Terror`.

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
        IO_ERROR: [ 2001, 'Broken IO' ],
        FS_ERROR: [ 2002, 'Broken %fsName% file-system' ]
    });

// valid createError calls

// "101 Terror: Unknown error"
Terror.createError();

// same as above
Terror.createError(Terror.CODES.UNKNOWN_ERROR);

// "101 MyError: Unknown error"
MyError.createError();

// "2001 MyError: Broken IO"
MyError.createError(MyError.CODES.IO_ERROR);

// "2001 MyError: Broken IO (Error: kbd int broken)"
MyError.createError(MyError.CODES.IO_ERROR, new Error('kbd int broken'));

// "2002 MyError: Broken vfat file-system"
MyError.createError(MyError.CODES.FS_ERROR, { fsName: 'vfat' });

// fails, because Terror.MESSAGES[2001] is undefined
Terror.createError(MyError.CODES.IO_ERROR);
```

### ensureError(originalError, code)

Returns `originalError` if it's an instance of `Terror`.
Otherwise wrap `originalError` into new `Terror` instance using `code` or `UNKNOWN_ERROR` code if second argument is absent.

Example:
```javascript
var MyError = Terror.create('MyError', {
        EMPTY_MESSAGE: [ 1000, 'Message string is empty' ],
        UNEXPECTED_ERROR: [ 1999, 'Unexpected error' ]
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
            .log();
    }
})
```

## Constructor fields

### CODES and MESSAGES

Hashes contains error names to codes and codes to messages mappings. Proposed to generate them by `extendCodes` method call, but if you want to override inherited code, you can do it manually using those hashes.

Example:
```javascript
var MyError = Terror.create('MyError');

// following call leads to error, because UNKNOWN_ERROR name already exist – it's inherited from Terror
MyError.extendCodes({
    UNKNOWN_ERROR: [ 2001, 'Unbelievable!' ]
});

// it's fine
MyError.CODES.UNKNOWN_ERROR = 2001;
MyError.CODE_NAMES['2001'] = 'UNKNOWN_ERROR';
MyError.MESSAGES['2001'] = 'Unbelievable!';
```

Also you can simply reset inherited codes:
```javascript
// @see http://npm.im/extend
MyError.CODES = extend({}, Terror.CODES);
MyError.MESSAGES = extend({}, Terror.MESSAGES);
MyError.CODE_NAMES = extend({}, Terror.CODE_NAMES);
```

### DEFAULT_LOG_LEVEL

Log level, which `log` method use as default value if the `level` argument isn't passed.

It equals `"ERROR"` by default.

## Prototype methods

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
        IO_ERROR: [ 2001, 'Broken IO pipe "%pipe%"' ]
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
YYYY-MM-DD HH:MM:SS LEVEL CODE CLASS: MESSAGE
YYYY-MM-DD HH:MM:SS >>>>>   CALL STACK ROW 1
…
YYYY-MM-DD HH:MM:SS >>>>>   CALL STACK ROW N
```

Example:
```
2013-04-15 12:50:57 ERROR 100 Terror: Unknown error (TypeError: Object #<Console> has no method 'lag')
2013-04-15 12:50:57 >>>>> TypeError: Object #<Console> has no method 'lag'
2013-04-15 12:50:57 >>>>>     at repl:2:9
2013-04-15 12:50:57 >>>>>     at REPLServer.self.eval (repl.js:110:21)
2013-04-15 12:50:57 >>>>>     at repl.js:249:20
2013-04-15 12:50:57 >>>>>     at REPLServer.self.eval (repl.js:122:7)
2013-04-15 12:50:57 >>>>>     at Interface.<anonymous> (repl.js:239:12)
2013-04-15 12:50:57 >>>>>     at Interface.EventEmitter.emit (events.js:95:17)
2013-04-15 12:50:57 >>>>>     at Interface._onLine (readline.js:202:10)
2013-04-15 12:50:57 >>>>>     at Interface._line (readline.js:531:8)
2013-04-15 12:50:57 >>>>>     at Interface._ttyWrite (readline.js:754:14)
2013-04-15 12:50:57 >>>>>     at ReadStream.onkeypress (readline.js:99:10)
```

### formatErrorTimestamp(date)

Method is internally used by the `logMultilineError` to create log line timestamp formatted as `YYYY-MM-DD HH:MM:SS`.

Arguments:
* `{Date} date` – oh, assumed it's really Date instance always, no casting, no magic.
