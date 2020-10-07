const {transports, format, createLogger} = require('winston')
require('winston-daily-rotate-file')
require('process')

const json_format = format.combine(
    format.timestamp('YYYY-MM-DD HH:mm:ss.SSS ZZ'),
    format.errors({'stack': true}),
    format.json()
)

const simple_format = format.combine(
    format.timestamp('YYYY-MM-DD HH:mm:ss.SSS ZZ'),
    format.errors({'stack': true}),
    format.simple()
)

const logger = createLogger({
    transports: [
        new transports.Console({
            level: 'silly',
            stderrLevels: ['error'],
            consoleWarnLevels: ['warn'],
            format: simple_format,
            handleExceptions: true
        }),
        new transports.DailyRotateFile({ // error logger
            level: 'error', // warn
            datePattern: 'YYYYMMDD',
            filename: '%DATE%_error.log',
            dirname: 'logs/error',
            maxSize: '10m',
            maxFiles: '50',
            format: json_format,
            handleExceptions: true
        }),
        new transports.DailyRotateFile({ // info logger
            level: 'info', // info
            datePattern: 'YYYYMMDD',
            filename: '%DATE%_info.log',
            dirname: 'logs/info',
            maxSize: '50m',
            maxFiles: '14d',
            format: json_format
        }),
        new transports.DailyRotateFile({ // all logger
            level: 'silly',
            datePattern: 'YYYYMMDD',
            filename: '%DATE%_full.log',
            dirname: 'logs/full',
            maxSize: '50m',
            maxFiles: '4d',
            format: json_format
        })
    ]
})


function request_info(req, log_body) {

    var fields = {}

    // fields['IP'] = req.header('x-forwarded-for') || req.connection.remoteAddress
    
    if (req.body) {
        if (!process.env.NODE_ENV || process.env.NODE_ENV != "production" || log_body) {
            fields['body'] = req.body
        }

        if (req.body.msg_type) {
            fields['msg_type'] = req.body.msg_type
        }

        if (req.body.streamer) {
            fields['login'] = req.body.streamer.login
        }

        if (req.body.meta) {
            fields['meta'] = req.body.meta
        }
    }

    return fields
}

// middleware for logging all requests
function log_request(req, res, done) {
    logger.http("backend." + req.method.toLowerCase(), request_info(req))
    done()
}


function log_error(err, req, res, next) {
    logger.error(err, request_info(req))
    next(err)
}


exports.logger = logger
exports.request_logger = log_request
exports.error_logger = log_error
exports.request_info = request_info