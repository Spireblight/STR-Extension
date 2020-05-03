const bodyParser = require('body-parser')
const streamers = require('./streamers').streamers
const express = require('express')
const https = require('https')
// const winston = require('winston')
const fs = require('fs')
const cors = require('cors')
const ext = require('commander')
const jsonwebtoken = require('jsonwebtoken');
const request = require('request')
const logging = require('./logging')
const logger = logging.logger
const app = express()
const constants = require('./constants')
const MessageProcessor = require('./message_processor').MessageProcessor

////////////// CONSTANTS
// const PORT = 8080

const BEARER_PREFIX = 'Bearer ';             // HTTP authorization headers have this prefix

// const MSG_TYPE_SET_TIPS = 1 // "set_tips"
// const MSG_TYPE_SET_DECK = 4 // "set_deck"
// const MSG_TYPE_ADD_STREAMER = 2 // "add_streamer"
// const MSG_TYPE_STREAMER_EXISTS = 3 // "streamer_exists"

const RESPONSE_SUCCESS = "Success"
const RESPONSE_TRUE = "true"
const RESPONSE_FALSE = "false"
const RESPONSE_INVALID_SECRET = "Invalid streamer secret"

const serverTokenDurationSec = 30;          // our tokens for pubsub expire after 30 seconds
const userCooldownMs = 1000;                // maximum input rate per user to prevent bot abuse
const userCooldownClearIntervalMs = 60000;  // interval to reset our tracking object
const channelCooldownMs = 1000;             // maximum broadcast rate per channel

const BROADCAST_INTERVAL = 1005;

ext.
  version('1.0.0').
  option('-s, --secret <secret>', 'Extension secret').
  option('-c, --client-id <client_id>', 'Extension client ID').
  option('-o, --owner-id <owner_id>', 'Extension owner ID').
  option('-p, --cert-private-key-path <private_key_path>').
  option('-u, --cert-public-key-path <public_key_path>').
  option('-a, --cert-ca-paths <ca_key_paths>', "").
  option('-r, --port <port>', "").
  parse(process.argv);


const STRINGS = {
  secretEnv: usingValue('secret'),
  clientIdEnv: usingValue('client-id'),
  ownerIdEnv: usingValue('owner-id'),
  certPrivateKeyPath: usingValue('cert-private-key-path'),
  certPublicKeyPath: usingValue('cert-public-key-path'),
  certCaPaths: usingValue('cert-ca-paths'),
  port: usingValue('port'),
  serverStarted: 'Server running at %s',
  secretMissing: missingValue('secret', 'EXT_SECRET'),
  clientIdMissing: missingValue('client ID', 'EXT_CLIENT_ID'),
  ownerIdMissing: missingValue('owner ID', 'EXT_OWNER_ID'),
  certPrivateKeyPathMissing: missingValue('certificate private key path', 'EXT_PRIVATE_KEY_PATH'),
  certPublicKeyPathMissing: missingValue('certificate public key path', 'EXT_PUBLIC_KEY_PATH'),
  certCaPathsMissing: missingValue('certificate CA paths', 'EXT_CA_PATHS'),
  portMissing: missingValue('port', 'PORT')
};


const ownerId = getOption('ownerId', 'EXT_OWNER_ID');
const secret = Buffer.from(getOption('secret', 'EXT_SECRET'), 'base64');
const clientId = getOption('clientId', 'EXT_CLIENT_ID');
const privateKeyPath = getOption('certPrivateKeyPath', 'EXT_PRIVATE_KEY_PATH');
const publicKeyPath = getOption('certPublicKeyPath', 'EXT_PUBLIC_KEY_PATH');
const caPaths = getOption('certCaPaths', 'EXT_CA_PATHS');
const port = getOption('port', 'PORT');

////////////////////////////////////////////////////

msg_processors = {}

streamers.init()

app.use(cors())
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(bodyParser.json()); // support json encoded bodies
app.use(logging.request_logger)
app.use(logging.error_logger)

app.post('/', function (req, res) {

    const msg_type = req.body.msg_type
    const login = req.body.streamer.login.toLowerCase()
    const secret = req.body.streamer.secret
    const channel_id = req.body.streamer.channel_id
    const message = req.body.message
    const delay = req.body.delay

    if (msg_type == constants.MSG_TYPE_ADD_STREAMER) {
        streamers.addStreamer(login, channel_id, secret)
        streamers.save()

        res.status(201).send(RESPONSE_SUCCESS)
    } else if (msg_type == constants.MSG_TYPE_STREAMER_EXISTS) {
        
        if (streamers.isStreamerPresent(login)) {
            res.status(200).send(RESPONSE_TRUE)
        } else {
            res.status(200).send(RESPONSE_FALSE)
        }
    } else if (msg_type == constants.MSG_TYPE_SET_TIPS || msg_type == constants.MSG_TYPE_SET_DECK || msg_type == constants.MSG_TYPE_OKAY_STILL_ALIVE) {

        if (streamers.isStreamerValid(login, secret)) {

          if (!(login in msg_processors)) {
            let processor = new MessageProcessor(login)
            msg_processors[login] = processor
          }

          let processor = msg_processors[login]

          // logger.info({name: 'update message', msg: req.body})
          processor.update(delay, msg_type, message)

          // sendBroadcast(login, streamers.getChannelId(login), msg_compressed_uri)
          res.status(200).send(RESPONSE_SUCCESS)
        } else {
            logger.warn('backend.post.is_streamer_valid.false', logging.request_info(req, true))
            res.status(401).send(RESPONSE_INVALID_SECRET)
        }
      } else {
        logger.warn('backend.post.invalid_msg_type.' + msg_type, logging.request_info(req, true))

        res.status(400).send('msg_type "' + msg_type + '" not recognized')
    }
})


function broadcastToTwitch() {
  for (var login in msg_processors) {
    let processor = msg_processors[login]

    if (processor.isActive()) {
      let msg = processor.getNextBroadcast();

      if (msg != null) {
        sendBroadcast(login, streamers.getChannelId(login), msg)
      }
    } else {
      logger.info("backend.broadcast_to_twitch.remove_inactive_broadcaster", {login: login})
      delete msg_processors[login]
    }
  }
}


function getCaPaths(caPaths) {
  if (caPaths == 'null') {
    return []
  } else {
    var certs = []
    var paths = caPaths.split(',')
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      certs.push(fs.readFileSync(path))
    }
    return certs
  }
}


function sendBroadcast(login, channelId, message) {
    // Set the HTTP headers required by the Twitch API.
    const headers = {
      'Client-ID': clientId,
      'Content-Type': 'application/json',
      'Authorization': BEARER_PREFIX + makeServerToken(channelId),
    };
  
    // Create the POST body for the Twitch API request.
    const body = JSON.stringify({
      content_type: 'application/json',
      message: message,
      targets: ['broadcast'],
    });
    
    body_size = Buffer.byteLength(body, 'utf8') / 1024
    // logger.info("pubsub msg " + body.length + " " + body_size + "bytes")
    // logger.info(body)

    if (body_size > 5.0) {
      logger.warn('backend.pubsub.broadcast pubsub message exceeds 5kb', {login: login, channelId: channelId, body: body})
    }

    // Send the broadcast request to the Twitch API.
    logger.http('backend.pubsub.broadcast', {login: login, channelId: channelId})

    request(
      `https://api.twitch.tv/extensions/message/${channelId}`,
      {
        method: 'POST',
        headers,
        body,
      }
      , (err, res) => {
        if (err) {
          logger.warn('backend.pubsub.error', {channelId: channelId, error: err})
        } else {
          logger.http('backend.pubsub.success')
        }
      });
  }
  
// Create and return a JWT for use by this service.
function makeServerToken(channelId) {
    const payload = {
        exp: Math.floor(Date.now() / 1000) + serverTokenDurationSec,
        channel_id: channelId,
        user_id: ownerId, // extension owner ID for the call to Twitch PubSub
        role: 'external',
        pubsub_perms: {
            send: ['*'],
        },
    };
    return jsonwebtoken.sign(payload, secret, { algorithm: 'HS256' });
}


// Get options from the command line or the environment.
function getOption(optionName, environmentName) {
    const option = (() => {
      if (ext[optionName]) {
        return ext[optionName];
      } else if (process.env[environmentName]) {
        logger.info(STRINGS[optionName + 'Env'])
        return process.env[environmentName];
      }
      logger.info(STRINGS[optionName + 'Missing'])
      process.exit(1);
    })();
    logger.info('Using "${option}" for ${optionName}')
    return option;
  }

function usingValue(name) {
  return `Using environment variable for ${name}`;
}

function missingValue(name, variable) {
  const option = name.charAt(0);
  return `Extension ${name} required.\nUse argument "-${option} <${name}>" or environment variable "${variable}".`;
}

https.createServer({
  key: fs.readFileSync(privateKeyPath),
  cert: fs.readFileSync(publicKeyPath),
  ca: getCaPaths(caPaths)
}, app).listen(port)

setInterval(broadcastToTwitch, BROADCAST_INTERVAL)