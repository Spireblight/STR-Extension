// because who wants to type this every time?
var twitch = window.Twitch.ext;


const MSG_TYPE_SET_RELICS = "set_relics"

// create the request options for our Twitch API calls

twitch.onContext(function(context) {
    twitch.rig.log(context);
});

twitch.onAuthorized(function(auth) {
    // save our credentials
    // token = auth.token;
    // tuid = auth.userId;
});


function receiveMessage(msg) {
    var msg = JSON.parse(msg)

    var msg_type = msg.msg_type

    if (msg_type == MSG_TYPE_SET_RELICS) {
        setRelics(msg.relics)
    } else {
        log('unrecognized msg_type: ' + msg_type)
    }
}


const ITEM_WIDTH = 3.75
const ITEM_LEFT = 1.458//3.3333
const ITEM_OFFSET_LARGE = 1.875
const MAX_DISPLAY_ITEMS = 25


function setRelics(relics) {
    var items = document.getElementById('items')
    
    var html = ''

    for (let i = 0; i < relics.length && i < MAX_DISPLAY_ITEMS; i++) {
        const item = relics[i];
        
        var x = ITEM_LEFT + i * ITEM_WIDTH + (relics.length > 25 ? 1 : 0) * ITEM_OFFSET_LARGE

        html = html.concat(createItemHTML(x, item.name, item.description))
    }

    items.innerHTML = html

    log('setting inner html to: ' + html)

    function createItemHTML(x, name, description) {
        var html = '<div class="item_placeholder" style="left: ' + x + '%" title="' + name + ': ' + description + '"></div>'
        return html
    }
}


function log(msg) {
    twitch.rig.log(msg)
    console.log(msg)
}


$(function() {

    // listen for incoming broadcast message from our EBS
    twitch.listen('broadcast', function (target, contentType, message) {
        log('received a broadcast message: ' + message)

        receiveMessage(message);
    });

});
