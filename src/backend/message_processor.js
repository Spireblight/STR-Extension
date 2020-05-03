const constants = require('./constants')
const logger = require('./logging').logger
const lzstring = require('lz-string')

class MessageProcessor {
    /*
    This is a class that receives updates from StR Exporter and outputs the next message for broadcast
    */

    tipsMessage;
    deckMessage;
    lastOkayTime;
    tipsMessage;
    deckMessage;
    tipsDelay;
    deckDelay;
    tipsUpdated = false;
    deckUpdated = false;
    lastDeckBroadcastAgo = 0;
  
    messagePartQueue = [];
  
    N_TIPS_TO_ONE_DECK_BROADCAST = 1;
    MAX_DECK_BROADCAST_PERIOD = 1;
    MAX_ALLOWED_DELAY_SINCE_LAST_UPDATE = 3000;
    MUTEX_TIMEOUT = 150;
  
    PUBSUB_MESSAGE_OVERHEAD = 72 // characters
    PART_MESSAGE_OVERHEAD = 28 // 20 should be exact characters but let's leave some safety margin
    MESSAGE_CHARACTER_LIMIT = 5 * 1024 - this.PUBSUB_MESSAGE_OVERHEAD - this.PART_MESSAGE_OVERHEAD
  
    constructor(login) {
      this.login = login
    }
    
    update(delay, msg_type, msg) {

      // logger.info('update message type: ' + msg_type + ' update message delay: ' + delay + ' msg: ' + msg)
      logger.info('message_processor.update', {login: this.login, msg_type: msg_type})

      if (msg_type == constants.MSG_TYPE_SET_TIPS) {
        this.tipsMessage = msg;
        this.tipsDelay = delay;
        this.tipsUpdated = true;
      } else if (msg_type == constants.MSG_TYPE_SET_DECK) {
        this.deckMessage = msg;
        this.deckDelay = delay;
        this.deckUpdated = true;
      } else { // streamer okay
        this.lastOkayTime = new Date().getTime()
      }
    }

    getNextBroadcast() {
      // logger.info('get next broadcast')
      // enqueue new message if no parts are in queue
      if (this.messagePartQueue.length == 0) {
  
        if (this.tipsUpdated) {
          if (this.deckUpdated && this.lastDeckBroadcastAgo >= this.MAX_DECK_BROADCAST_PERIOD) {
            // logger.info('---->both tips and deck have been updated but last deck broadcast was ' + this.lastDeckBroadcastAgo + ' broadcasts ago, max permitted is ' + this.MAX_DECK_BROADCAST_PERIOD)
            this._enqueueBroadcastDeck();
          } else {
            // logger.info('---->either both tips and deck have been updated and tips have priority or just tips were updated')
            this._enqueueBroadcastTips();
          }
        } else {
          if (this.deckUpdated) {
            // logger.info('---->the deck was updated and tips not, deck is broadcasted')
            this._enqueueBroadcastDeck();
          } else {
            if (this.lastDeckBroadcastAgo >= this.N_TIPS_TO_ONE_DECK_BROADCAST) {
              // logger.info('---->nothing was updated but deck was last broadcasted: ' + this.lastDeckBroadcastAgo + ' broadcasts ago, max permitted: ' + this.N_TIPS_TO_ONE_DECK_BROADCAST)
              this._enqueueBroadcastDeck()
            } else {
              // logger.info('---->nothing has been updated and tips have the priority')
              this._enqueueBroadcastTips();
            }
          }
        }
      }
  
      if (this.messagePartQueue.length > 0) {
        return this.messagePartQueue.shift()
      } else {
        return null
      }
    }
  
    _enqueueBroadcastDeck() {
      this.lastDeckBroadcastAgo = 0;
      this.deckUpdated = false;
      if (this.deckMessage == undefined)
        return
      
      let messageParts = this._splitMessageToParts(this.deckDelay, constants.MSG_TYPE_SET_DECK, this.deckMessage)
      this.messagePartQueue = this.messagePartQueue.concat(messageParts);
      
      logger.info('message_processor._enqueue_broadcast_deck', {login: this.login, nparts: messageParts.length})
    }
  
    _enqueueBroadcastTips() {
      this.lastDeckBroadcastAgo += 1;
      this.tipsUpdated = false;
      if (this.tipsMessage == undefined)
        return
      
      let messageParts = this._splitMessageToParts(this.tipsDelay, constants.MSG_TYPE_SET_TIPS, this.tipsMessage)
      this.messagePartQueue = this.messagePartQueue.concat(messageParts);

      logger.info('message_processor._enqueue_broadcast_tips', {login: this.login, nparts: messageParts.length})
    }
  
    _splitMessageToParts(delay, msg_type, message) {
      // logger.info('split message to parts')

      var msg = [delay, msg_type, message]
      var msg_uncompressed = JSON.stringify(msg);
      // logger.info("msg uncompressed")
      // logger.info(msg_uncompressed)

      var msg_compressed_uri = lzstring.compressToEncodedURIComponent(msg_uncompressed)

      // logger.info('compressed message size: ' + msg_compressed_uri.length + ', character limit: ' + this.MESSAGE_CHARACTER_LIMIT)
  
      var n_parts = Math.ceil(msg_compressed_uri.length / this.MESSAGE_CHARACTER_LIMIT)
      var uid = this._randomId(3)

      // logger.info('nparts: ' + n_parts)
      // logger.info('whole message: ' + msg_compressed_uri)
  
      let parts = []  

      for (let i = 0; i < n_parts; i++) {
        let part_content = msg_compressed_uri.substr(i * this.MESSAGE_CHARACTER_LIMIT, this.MESSAGE_CHARACTER_LIMIT);
        
        //format : [part index, total number of parts, unique id common to all the parts, the content itself]
        let part = [i, n_parts, uid, part_content]
        parts.push(JSON.stringify(part))

        // logger.info(JSON.stringify(part))
      }
      
      return parts
    }
  
    _randomId(length) {
      var result           = '';
      var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      var charactersLength = characters.length;
      for ( var i = 0; i < length; i++ ) {
         result += characters.charAt(Math.floor(Math.random() * charactersLength));
      }
      return result;
   }
  
    isActive() {
      return new Date().getTime() - this.lastOkayTime < this.MAX_ALLOWED_DELAY_SINCE_LAST_UPDATE
    }
  }

exports.MessageProcessor = MessageProcessor