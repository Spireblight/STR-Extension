const bodyParser = require('body-parser')
const streamers = require('./streamers').streamers
const app = require('express')()
const https = require('https')
// const winston = require('winston')
const fs = require('fs')
const cors = require('cors')
const ext = require('commander')
const jsonwebtoken = require('jsonwebtoken');
const request = require('request')

////////////// CONSTANTS
const PORT = 8080

const BEARER_PREFIX = 'Bearer ';             // HTTP authorization headers have this prefix

const MSG_TYPE_SET_RELICS = "set_relics"
const MSG_TYPE_ADD_STREAMER = "add_streamer"
const MSG_TYPE_STREAMER_EXISTS = "streamer_exists"

const RESPONSE_SUCCESS = "Success"
const RESPONSE_TRUE = "true"
const RESPONSE_FALSE = "false"
const RESPONSE_INVALID_SECRET = "Invalid streamer secret"

const serverTokenDurationSec = 30;          // our tokens for pubsub expire after 30 seconds
const userCooldownMs = 1000;                // maximum input rate per user to prevent bot abuse
const userCooldownClearIntervalMs = 60000;  // interval to reset our tracking object
const channelCooldownMs = 1000;             // maximum broadcast rate per channel


ext.
  version(require('../package.json').version).
  option('-s, --secret <secret>', 'Extension secret').
  option('-c, --client-id <client_id>', 'Extension client ID').
  option('-o, --owner-id <owner_id>', 'Extension owner ID').
  option('-p, --cert-private-key-path <private_key_path>').
  option('-u, --cert-public-key-path <public_key_path>').
  option('-a, --cert-ca-paths <ca_key_paths>', "").
  parse(process.argv);


const STRINGS = {
  secretEnv: usingValue('secret'),
  clientIdEnv: usingValue('client-id'),
  ownerIdEnv: usingValue('owner-id'),
  certPrivateKeyPath: usingValue('cert-private-key-path'),
  certPublicKeyPath: usingValue('cert-public-key-path'),
  certCaPaths: usingValue('cert-ca-paths'),
  serverStarted: 'Server running at %s',
  secretMissing: missingValue('secret', 'EXT_SECRET'),
  clientIdMissing: missingValue('client ID', 'EXT_CLIENT_ID'),
  ownerIdMissing: missingValue('owner ID', 'EXT_OWNER_ID'),
  certPrivateKeyPathMissing: missingValue('certificate private key path', 'EXT_PRIVATE_KEY_PATH'),
  certPublicKeyPathMissing: missingValue('certificate public key path', 'EXT_PUBLIC_KEY_PATH'),
  certCaPaths: missingValue('certificate CA paths', 'EXT_CA_PATHS')
};


const ownerId = getOption('ownerId', 'EXT_OWNER_ID');
const secret = Buffer.from(getOption('secret', 'EXT_SECRET'), 'base64');
const clientId = getOption('clientId', 'EXT_CLIENT_ID');
const privateKeyPath = getOption('certPrivateKeyPath', 'EXT_PRIVATE_KEY_PATH');
const publicKeyPath = getOption('certPublicKeyPath', 'EXT_PUBLIC_KEY_PATH');
const caPaths = getOption('certCaPaths', 'EXT_CA_PATHS');


streamers.init()

app.use(cors())
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(bodyParser.json()); // support json encoded bodies


app.post('/', function (req, res) {
    console.log('received POST request ' + JSON.stringify(req.body))

    const msg_type = req.body.msg_type
    const login = req.body.streamer.login
    const secret = req.body.streamer.secret
    const channel_id = req.body.streamer.channel_id

    if (msg_type == MSG_TYPE_ADD_STREAMER) {
        console.log('add streamer ' + login + ' secret ' + secret)
        streamers.addStreamer(login, channel_id, secret)
        streamers.save()

        res.status(201).send(RESPONSE_SUCCESS)
    } else if (msg_type == MSG_TYPE_STREAMER_EXISTS) {
        console.log('streamer exists? ' + login)
        
        if (streamers.isStreamerPresent(login)) {
            console.log('true')
            res.status(200).send(RESPONSE_TRUE)
        } else {
            console.log('false')
            res.status(200).send(RESPONSE_FALSE)
        }
    } else if (msg_type == MSG_TYPE_SET_RELICS) {
        const relics = req.body.relics
        const is_relics_multipage = req.body.is_relics_multipage
        console.log('set relics for ' + login + ': are relics multipage: ' + is_relics_multipage + ', relics: ' + JSON.stringify(relics))

        if (streamers.isStreamerValid(login, secret)) {
            console.log('valid streamer secret')

            var msg = {
                'msg_type': MSG_TYPE_SET_RELICS,
                'relics': relics,
                'is_relics_multipage': is_relics_multipage
            }

            sendBroadcast(streamers.getChannelId(login), JSON.stringify(msg))

            res.status(200).send(RESPONSE_SUCCESS)
        } else {
            console.log('invalid streamer secret ' + secret)
            res.status(401).send(RESPONSE_INVALID_SECRET)
        }
    } else {
        console.log('msg_type "' + msg_type + '" not recognized')
        res.status(400).send('msg_type "' + msg_type + '" not recognized')
    }

    // res.send(JSON.stringify(streamers))
})


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


https.createServer({
    key: fs.readFileSync(privateKeyPath),
    cert: fs.readFileSync(publicKeyPath),
    ca: getCaPaths(caPaths)
}, app).listen(PORT)


function sendBroadcast(channelId, message) {
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
  
    // Send the broadcast request to the Twitch API.
    console.log('sending a broadcast Channel-ID:' + channelId + ' msg: ' + JSON.stringify(message))
    request(
      `https://api.twitch.tv/extensions/message/${channelId}`,
      {
        method: 'POST',
        headers,
        body,
      }
      , (err, res) => {
        if (err) {
            console.log('sendBroadcast error', channelId, err);
        } else {
            console.log('pubsub response statusCode: ' + res.statusCode)
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
        console.log(STRINGS[optionName + 'Env']);
        return process.env[environmentName];
      }
      console.log(STRINGS[optionName + 'Missing']);
      process.exit(1);
    })();
    console.log(`Using "${option}" for ${optionName}`);
    return option;
  }

function usingValue(name) {
  return `Using environment variable for ${name}`;
}

function missingValue(name, variable) {
  const option = name.charAt(0);
  return `Extension ${name} required.\nUse argument "-${option} <${name}>" or environment variable "${variable}".`;
}
