
var twitch = window.Twitch.ext;
var last_relics = []
var last_is_relics_multipage = "false"
var last_character = ""
var current_tooltip_id = -1
var last_broadcast_secs = new Date() / 1000

const MSG_TYPE_SET_RELICS = "set_relics"

const CHARACTERS = ["Ironclad", "TheSilent", "Defect", "Watcher"]

function receiveMessage(broadcast) {
    last_broadcast_secs = new Date() / 1000
    var broadcast = JSON.parse(broadcast)

    var msg_type = broadcast.msg_type
    var msg = broadcast.message

    if (msg_type == MSG_TYPE_SET_RELICS) {
        if (JSON.stringify(last_relics) != JSON.stringify(msg.relics) || last_is_relics_multipage != msg.is_relics_multipage || last_character != msg.character) {
            setRelics(msg.relics, msg.is_relics_multipage, msg.character)
        }
    } else {
        log('unrecognized msg_type: ' + msg_type)
    }
}

const ITEM_WIDTH = 3.75 //%
const ITEM_LEFT = 1.458 //%
const ITEM_OFFSET_LARGE = 1.875 //%
const MAX_DISPLAY_ITEMS = 25 //count
const MAX_RIGHT = 99.0 //%
const TOOLTIP_WIDTH = 315 //px

const SECS_NOBROADCAST_REMOVE_CONTENT = 70

function sanitizeCharacter(character) {
    for (const char of CHARACTERS) {
        if (character == char) {
            return character
        }
    }
    // in case the character is not recognized, use Ironclad mana symbol
    return CHARACTERS[0]
}


function setRelics(relics, is_relics_multipage, character) {
    // console.log('set relics, is multipage: ' + is_relics_multipage + ' relics: ' + JSON.stringify(relics))

    character = sanitizeCharacter(character)
    current_tooltip_id = Math.min(relics.length, current_tooltip_id)
    last_relics = relics
    last_is_relics_multipage = is_relics_multipage
    last_character = character

    var items = document.getElementById('items')
    while (items.lastChild) { // clear the items div
        items.removeChild(items.lastChild)
    }

    for (let i = 0; i < relics.length; i++) {
        const item = relics[i];
        
        var x_placeholder = ITEM_LEFT + i * ITEM_WIDTH + (is_relics_multipage == "true" ? 1 : 0) * ITEM_OFFSET_LARGE
        var stream_width = $('#items').width()
        var max_x_tooltip = ((stream_width * MAX_RIGHT) - TOOLTIP_WIDTH) / stream_width
        var x_tooltip = Math.min(x_placeholder, max_x_tooltip)
        
        createItem(items, x_placeholder, x_tooltip, item.name, item.description, character, i)
    }

    function createItem(parent, x_placeholder, x_tooltip, name, description, character, id) {
        var placeholder = document.createElement('div')
        placeholder.className = 'item_placeholder'
        placeholder.style = 'left: ' + x_placeholder + '%'
        placeholder.onmouseenter = function(e) {showTooltip(e, 'tooltip_' + id)}
        placeholder.onmouseout = function(e) {hideTooltip(e, 'tooltip_' + id)}

        var tooltip = document.createElement('div')
        tooltip.className = 'tooltip'
        tooltip.id = 'tooltip_' + id
        tooltip.style = 'left: ' + x_tooltip + '%'
        tooltip.innerHTML = '<div class="tooltip_header">' + name + '</div><div>' + replaceManaSymbols(replaceColorCodes(description), character) + '</div>'

        parent.appendChild(placeholder)
        parent.appendChild(tooltip)

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

        function replaceManaSymbols(text, character) {
            var parts = text.split(' ')

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                
                if (part == '[E]') {
                    var imgPath = "img/orb" + character + ".png"
                    parts[i] = '<img style="vertical-align:top" src="' + imgPath + '" alt="[E]">'
                }
            }

            return parts.join(' ')
        }
    }
}


function showTooltip(e, id) {
    current_tooltip_id = id
    moveTooltip(e)
    document.getElementById(id).style.display = 'block';
}


function hideTooltip(e, id) {
    current_tooltip_id = undefined
    document.getElementById(id).style.display = 'none';
}


function moveTooltip(e) {

    if (current_tooltip_id != null) {
        var left = e.pageX + 52
        var top = e.pageY + 7 // - 15
        var stream_width = $('#items').width()
        var max_left = ((stream_width * MAX_RIGHT) / 100 - TOOLTIP_WIDTH)
        
        if (left > max_left) { // display tooltip on the left side of cursor
            left = e.pageX - 24 - 12 - TOOLTIP_WIDTH
            top = e.pageY + 7 // + 3
        }

        // console.log('left', left, 'stream_width', stream_width, 'max_left', max_left)

        $('#' + current_tooltip_id).css({
            left:  left + 'px',
            top:   top + 'px'
        });
    }
}


function log(msg) {
    console.log(msg)
    // twitch.rig.log(msg)
}


// checks for inactivity from Slay the Relics Exporter -> when inactive for long enough, essentially hide the extension
function checkIfSourceActive() {
    var seconds = new Date() / 1000;

    if (seconds - last_broadcast_secs > SECS_NOBROADCAST_REMOVE_CONTENT) {
        setRelics([], false, "")
    }
}


$(function() {

    console.log('hello there!')

    // listen for incoming broadcast message from our EBS
    twitch.listen('broadcast', function (target, contentType, message) {
        // console.log('received a broadcast message: ' + message)

        receiveMessage(message);
    });

    $('#items').on('mousemove', moveTooltip);

    // TESTING RELICS
    var relics = [{"name": "Cracked Core", "description": "At the start of each combat, #yChannel #b1 #yLightning."}, {"name": "Dolly's Mirror", "description": "Upon pickup, obtain an additional copy of a card in your deck."}, {"name": "Smiling Mask", "description": "The Merchant's card removal service now always costs #b50 #yGold."}, {"name": "Orichalcum", "description": "If you end your turn without #yBlock, gain #b6 #yBlock."}, {"name": "Coffee Dripper", "description": "Gain [E] at the start of your turn. You can no longer #yRest at Rest Sites."}, {"name": "Toy Ornithopter", "description": "Whenever you use a potion, heal #b5 HP."}, {"name": "Ink Bottle", "description": "Whenever you play #b10 cards, draw #b1 card."}, {"name": "Omamori", "description": "Negate the next #b2 #rCurses you obtain."}]
    setRelics(relics, "false")

    console.log('init done!')

    window.setInterval(checkIfSourceActive, 5000);
});
