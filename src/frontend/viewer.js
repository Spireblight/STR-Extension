
var twitch = window.Twitch.ext;

var current_tooltip_id = ""
var current_tooltip_category = null

var last_broadcast_secs = new Date() / 1000
var latency = 0.0

var items

const MSG_TYPE_SET_TIPS = 1
const MSG_TYPE_SET_DECK = 4

const SECS_NOBROADCAST_REMOVE_CONTENT = 5

function processMessage(broadcast) {
    // console.log(JSON.stringify(broadcast))

    var msg_type = broadcast[1]
    var msg = broadcast[2]

    if (msg_type == MSG_TYPE_SET_TIPS) {
        var character = sanitizeCharacter(msg.c)

        var power_tips = decompressPowerTips(msg.w)

        setRelics(msg.r, power_tips, character)        
        setPotions(msg.o, power_tips, character)
        setPlayerPowers(msg.p, power_tips, character)
        setMonsterPowers(msg.m, power_tips, character)
        setCustomTips(msg.u, power_tips, character)
    } else if (msg_type == MSG_TYPE_SET_DECK) {
        var character = sanitizeCharacter(msg.c)
        var deck = decompressDeck(msg.k)

        // TODO - check inside the functions and remove if
        if (msg.k != last_deck) {
            last_deck = msg.k

            setDeck(deck.deck, deck.cards, deck.tips, character)
            console.log('set deck finished')
            setCardView(deck.deck, deck.cards, deck.tips, character)
            console.log('set card view finished')
        }
        
    } else {
        log('unrecognized msg_type: ' + msg_type)
    }
}

function showPowerTipStrip(e, id, category) {
    current_tooltip_id = id
    current_tooltip_category = category
    movePowerTipStrip(e)
    document.getElementById(id).style.display = 'block';
}


function hidePowerTipStrip(e, id) {
    current_tooltip_id = null
    current_tooltip_category = null
    document.getElementById(id).style.display = 'none';
}


function showPowerTipMulticol(e, id, category) {
    current_tooltip_id = id
    current_tooltip_category = category
    document.getElementById(id).style.display = 'block';
}


function hidePowerTipMulticol(e, id) {
    current_tooltip_id = null
    current_tooltip_category = null
    document.getElementById(id).style.display = 'none';
}


function movePowerTipStrip(e) {

    if (current_tooltip_id != null && current_tooltip_category == CATEGORY_RELICS) {

        var stream_width = items.offsetWidth
        var scale = stream_width / 1920
        var left = e.pageX + 52 * scale
        var top = e.pageY + 7 * scale // - 15
        var max_left = (MAX_RIGHT - POWERTIP_WIDTH) / 100 * stream_width
        
        if (left > max_left) { // display tooltip on the left side of cursor
            left = e.pageX - 36 * scale - POWERTIP_WIDTH / 100 * stream_width
            top = e.pageY + 7 * scale // + 3
        }

        $('#' + current_tooltip_id).css({
            left:  left + 'px',
            top:   top + 'px'
        });

    } else if (current_tooltip_id != null && current_tooltip_category == CATEGORY_POTIONS) {
        
        var stream_width = items.offsetWidth
        var scale = stream_width / 1920

        var left = e.pageX - (POWERTIP_WIDTH_REM * REM_PX / 2 - 17) * scale
        var top = 89 * scale// - 15

        $('#' + current_tooltip_id).css({
            left:  left + 'px',
            top:   top + 'px'
        });

    }
}


// checks for inactivity from Slay the Relics Exporter -> when inactive for long enough, essentially hide the extension
function checkIfSourceActive() {
    var seconds = new Date() / 1000;

    if (seconds - last_broadcast_secs > SECS_NOBROADCAST_REMOVE_CONTENT) {
        msg = [
            0, // delay
            1, // message type
            {  // message
                c: "", 
                r: [0, []],
                o: [0, []],
                w: "||",
            }
        ]
        processMessage(msg)
    }
}


function testingMessage() {
    msg = [
        0, // delay
        1, // message type
        {  // message
            c: "", 
            r: [0, []],
            o: [0, []],
            u: [[20.0, 20.0, 20.0, 20.0, [0]]],
            w: "||This is a Tip;#yHey there how  are you? NL NL NL TAB this is a tab test NL TAB TAB double NL TAB a TAB a",
        }
    ]
    processMessage(msg)
}

current_message_parts = []
current_update_id = null

function receiveBroadcast(message) {
    // console.log('receive broadcast: ' + message)
    message = JSON.parse(message)

    let part_index = message[0]
    let nparts = message[1]
    let update_id = message[2] // this is common to all parts and identifies them together
    let content = message[3]

    // console.log('message: ' + message)

    // console.log('parts len ' + current_message_parts.length + ' part index ' + part_index)
    // console.log(typeof(nparts))
    // console.log(typeof(content))

    if (current_message_parts.length == 0) {
        if (part_index == 0) {
            // console.log('first message part')
            pushContent(update_id, content, nparts)
        }
    } else {
        if (update_id == current_update_id) {
            // following up previous update
            if (part_index == current_message_parts.length) {
                // console.log('message follows previous update')
                pushContent(update_id, content, nparts)
            }
        } else {
            // received message with unexpected UID, pubsub update probably lost, so forget previous message and start receiveing this one
            if (part_index == 0) {
                // console.log('unexpected message first message with new id, dropping old message')
                current_message_parts = []
                pushContent(update_id, content, nparts)
            }
        }
    }
}


function pushContent(update_id, content, nparts) {
    // console.log('push content')

    current_update_id = update_id
    current_message_parts.push(content)

    // console.log('nparts ' + nparts + ' curr len ' + current_message_parts.length)

    if (nparts == current_message_parts.length) { // all parts were received - process the message
        let message = ''
        for (var part of current_message_parts) {
            message += part
        }

        let decomp_message = LZString.decompressFromEncodedURIComponent(message);
        // console.log('decomp message: ')
        // console.log(decomp_message)
        decomp_message = JSON.parse(decomp_message)
        let msg_delay = Math.ceil(decomp_message[0] + latency * 1000.0)

        // console.log('all ' + current_message_parts.length + ' parts collected, resulting message:')
        // console.log(decomp_message)
        
        processMessage(decomp_message)

        // window.setTimeout(receiveMessage, Math.max(0, msg_delay), decomp_message)

        current_message_parts = []
        current_update_id = null
    }
}


console.log('looading')

$(function() {

    window.Twitch.ext.onContext((ctx) => {
        // console.log('The delay is', ctx.hlsLatencyBroadcaster);
        // console.log(JSON.stringify(ctx));
        if (ctx.hlsLatencyBroadcaster)
            latency = ctx.hlsLatencyBroadcaster;
    });

    // listen for incoming broadcast message from our EBS
    twitch.listen('broadcast', function (target, contentType, message) {
        // console.log("received message")

        // // console.log('queuing message with delay: ' + msg_delay + 'ms');
        // window.setTimeout(function () {receiveMessage(broadcast)}, Math.max(0, msg_delay))
        receiveBroadcast(message)
        // // testingMessage()

        last_broadcast_secs = new Date() / 1000
        // console.log(decomp_message)
    });

    items = document.getElementById('items')
    body = document.getElementsByTagName('body')[0]
    btn = document.getElementById('deck_button')

    $('#items').on('mousemove', movePowerTipStrip);
    body.onmouseenter = function(e) {
        btn.classList.add('button-border')
    }

    body.onmouseleave = function(e) {
        if (!deck_view_open) {
            btn.classList.remove('button-border')
        }
    }

    // window.setInterval(checkIfSourceActive, 2500);

    window.setTimeout(preloadNextImageBunch, PRELOAD_INTERVAL)

    initializeDeck()
    initializeCardView()

    window.Twitch.ext.onError(function(e) {
        console.log('error')
        error(e)
    })
});
