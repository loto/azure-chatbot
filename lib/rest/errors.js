'use strict';

class RestError extends Error {
    constructor(status, ...args) {
        // Pass remaining arguments (including vendor specific ones) to parent constructor
        super(...args);

        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) Error.captureStackTrace(this, RestError);

        // Custom debugging information
        this.name = 'REST error'
        this.status = status;
    }
}

module.exports = {
    RestError
}