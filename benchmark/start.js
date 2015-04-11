var Benchmark = require('benchmark');
var oldTerror = require('terror');
var newTerror = require('../lib/terror');

var MSG = 'Error %value%';
var DATA = {
    value: 'message'
};

var MyOldError = oldTerror.create('MyOldError', {
    MY: MSG
});

var MyNewError = newTerror.create('MyNewError', {
    MY: MSG
});

var suits = [{
    name: 'new Terror(null, message)',
    Old: function () {
        new oldTerror(null, MSG);
    },
    New: function () {
        new newTerror(null, MSG);
    }
}, {
    name: 'Terror.createError(null, message)',
    Old: function () {
        oldTerror.createError(null, MSG);
    },
    New: function () {
        newTerror.createError(null, MSG);
    }
}, {
    name: 'Terror.ensureError(error)',
    Old: function () {
        oldTerror.ensureError(new Error(MSG));
    },
    New: function () {
        newTerror.ensureError(new Error(MSG));
    }
}, {
    name: 'new MyError(null, message)',
    Old: function () {
        new MyOldError(null, MSG);
    },
    New: function () {
        new MyNewError(null, MSG);
    }
}, {
    name: 'MyError.createError(null, message)',
    Old: function () {
        MyOldError.createError(null, MSG);
    },
    New: function () {
        MyNewError.createError(null, MSG);
    }
}, {
    name: 'MyError.createError(code, data)',
    Old: function () {
        MyOldError.createError(MyOldError.CODES.MY, DATA);
    },
    New: function () {
        MyNewError.createError(MyNewError.CODES.MY, DATA);
    }
}, {
    name: 'MyError.ensureError(error, code)',
    Old: function () {
        MyOldError.ensureError(MSG, MyNewError.CODES.MY);
    },
    New: function () {
        MyNewError.createError(MSG, MyNewError.CODES.MY);
    }
}];

function onComplete() {
    console.log('\tFastest is "' + this.filter('fastest').pluck('name') + '"\n');
}

function onStart() {
    console.log(this.name + ':');
}

function onCycle(event) {
    console.log('\t' + String(event.target));
}

var length = suits.length;
var index = 0;

while (index < length) {
    var suit = suits[index++];

    new Benchmark.Suite(suit.name)
        .add('Old', suit.Old)
        .add('New', suit.New)
        .on('start', onStart)
        .on('cycle', onCycle)
        .on('complete', onComplete)
        .run();
}
