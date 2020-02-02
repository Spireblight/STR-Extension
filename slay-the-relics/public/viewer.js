
var twitch = window.Twitch.ext;
var last_relics = []
var current_tooltip_id = -1

const MSG_TYPE_SET_RELICS = "set_relics"



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

const ITEM_WIDTH = 3.75 //%
const ITEM_LEFT = 1.458 //%
const ITEM_OFFSET_LARGE = 1.875 //%
const MAX_DISPLAY_ITEMS = 25 //count
const MAX_RIGHT = 97.083 //%
const TOOLTIP_WIDTH = 315 //px

function setRelics(relics) {
    current_tooltip_id = Math.min(relics.length, current_tooltip_id)
    last_relics = relics

    var items = document.getElementById('items')
    
    var html = ''

    for (let i = 0; i < relics.length && i < MAX_DISPLAY_ITEMS; i++) {
        const item = relics[i];
        
        var x_placeholder = ITEM_LEFT + i * ITEM_WIDTH + (relics.length > 25 ? 1 : 0) * ITEM_OFFSET_LARGE
        var stream_width = $('#items').width()
        var max_x_tooltip = ((stream_width * MAX_RIGHT) - TOOLTIP_WIDTH) / stream_width
        var x_tooltip = Math.min(x_placeholder, max_x_tooltip)

        console.log(i, 'stream width', stream_width, 'x_placeholder', x_placeholder, 'max_x_tooltip', max_x_tooltip)

        html = html.concat(createItemHTML(x_placeholder, x_tooltip, item.name, item.description, i))
    }

    items.innerHTML = html

    console.log('setting inner html to: ' + html)

    function createItemHTML(x_placeholder, x_tooltip, name, description, id) {
        var html = '<div class="item_placeholder" style="left: ' + x_placeholder + '%" ' // title="' + name + ': ' + description + '"
        html = html.concat('onmouseover="showTooltip(\'tooltip_' + id + '\')" ')
        html = html.concat('onmouseout="hideTooltip(\'tooltip_' + id + '\')"></div>')
        html = html.concat('<div class="tooltip" id="tooltip_' + id + '" style="left: ' + x_tooltip + '%">')
        html = html.concat('<div class="tooltip_header">' + name + '</div>')
        html = html.concat('<div>' + replaceColorCodes(description) + '</div>')
        html = html.concat('</div>');
        return html

        function replaceColorCodes(text) {
            var parts = text.split(' ')

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                
                if (part.charAt(0) == '#') {
                    var text_class = ''

                    switch(part.charAt(1)) {
                        case 'y': text_class = 'text_yellow'; break;
                        case 'b': text_class = 'text_blue'; break;
                        case 'r': text_class = 'text_red'; break;
                    }
    
                    var text = part.substring(2)
                    parts[i] = '<span class="' + text_class + '">' + text + '</span>'
                }
            }

            return parts.join(' ')
        }
    }
}


function showTooltip(id) {
    current_tooltip_id = id
    document.getElementById(id).style.display = 'block';
}


function hideTooltip(id) {
    current_tooltip_id = undefined
    document.getElementById(id).style.display = 'none';
}


function log(msg) {
    twitch.rig.log(msg)
    console.log(msg)
}


$(function() {

    console.log('initialized')

    new ResizeSensor($('#items'), function() {
        console.log('stream resized')
        setRelics(last_relics);
    });

    // listen for incoming broadcast message from our EBS
    twitch.listen('broadcast', function (target, contentType, message) {
        console.log('received a broadcast message: ' + message)

        receiveMessage(message);
    });

    $('#items').on('mousemove', function(e) {
        if (current_tooltip_id) {
            var left = e.pageX + 46
            var top = e.pageY + 7 // - 15
            var stream_width = $('#items').width()
            var max_left = ((stream_width * MAX_RIGHT) / 100 - TOOLTIP_WIDTH)
            
            if (left > max_left) { // display tooltip on the left side of cursor
                left = e.pageX - 24 - 25 - TOOLTIP_WIDTH
                top = e.pageY + 7 // + 3
            }

            console.log('left', left, 'stream_width', stream_width, 'max_left', max_left)

            $('#' + current_tooltip_id).css({
                left:  left + 'px',
                top:   top + 'px'
            });
        }
    });

    // TESTING RELICS
    // var relics = [{"name": "Cracked Core", "description": "At the start of each combat, #yChannel #b1 #yLightning."}, {"name": "Dolly's Mirror", "description": "Upon pickup, obtain an additional copy of a card in your deck."}, {"name": "Smiling Mask", "description": "The Merchant's card removal service now always costs #b50 #yGold."}, {"name": "Orichalcum", "description": "If you end your turn without #yBlock, gain #b6 #yBlock."}, {"name": "Toy Ornithopter", "description": "Whenever you use a potion, heal #b5 HP."}, {"name": "Ink Bottle", "description": "Whenever you play #b10 cards, draw #b1 card."}, {"name": "Omamori", "description": "Negate the next #b2 #rCurses you obtain."}]
    // setRelics(relics)
});
