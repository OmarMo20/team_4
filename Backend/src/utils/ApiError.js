
class ApiError extends Error {

    constructor(statusCodeOrMessage, messageOrStatusCode, isOperational = true) {
        // Normalize arguments
        let statusCode;
        let message;

        if (typeof statusCodeOrMessage === 'number') {
            // Signature: (statusCode: number, message?: string)
            statusCode = statusCodeOrMessage;
            message = messageOrStatusCode || 'Error';
        } else {
            // Signature: (message: string, statusCode?: number)
            message = statusCodeOrMessage || 'Error';
            statusCode = typeof messageOrStatusCode === 'number' ? messageOrStatusCode : 500;
        }

        super(message);

        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = isOperational;

        Error.captureStackTrace(this, this.constructor);
    }


    static badRequest(message = 'Bad request') {
        return new ApiError(400, message);
    }


    static unauthorized(message = 'Unauthorized') {
        return new ApiError(401, message);
    }


    static forbidden(message = 'Forbidden') {
        return new ApiError(403, message);
    }


    static notFound(message = 'Not found') {
        return new ApiError(404, message);
    }


    static conflict(message = 'Data conflict') {
        return new ApiError(409, message);
    }

    static internal(message = 'Internal server error') {
        return new ApiError(500, message, false);
    }
}

module.exports = ApiError;
