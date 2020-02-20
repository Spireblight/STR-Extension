
var twitch = window.Twitch.ext;
var last_broadcast = ""
var last_relics = ""
var last_potions = ""
var last_player_powers = ""
var last_monster_powers_list = ""
var current_tooltip_id = ""
var last_broadcast_secs = new Date() / 1000

const MSG_TYPE_SET_CONTENT = "set_content"

const CHARACTERS = ["Ironclad", "TheSilent", "Defect", "Watcher"]

function receiveMessage(broadcast) {
    last_broadcast_secs = new Date() / 1000
    var broadcast = JSON.parse(broadcast)

    var msg_type = broadcast.msg_type
    var msg = broadcast.message

    if (msg_type == MSG_TYPE_SET_CONTENT) {
        if (last_broadcast !=  broadcast) {
            var character = sanitizeCharacter(msg.character)
            setRelics(msg.relics, msg.power_tips, character)
            setPotions(msg.potions, msg.power_tips, character)

            setPlayerPowers(msg.player_powers, msg.power_tips, character)

            setMonsterPowers(msg.monster_powers, msg.power_tips, character)
        }
    } else {
        log('unrecognized msg_type: ' + msg_type)
    }
}

const RELIC_HITBOX_WIDTH = 3.75 //%
const RELIC_HITBOX_LEFT = 1.458 //%
const RELIC_HITBOX_MULTIPAGE_OFFSET = 1.875 //%
const MAX_DISPLAY_RELICS = 25 //count
const POTION_HITBOX_WIDTH = 2.916 // %
const MAX_RIGHT = 99.0 //%
const POWERTIP_WIDTH = 16.406 //%
const MAX_POWERTIP_MULTICOL_HEIGHT = 70.0 //%
const CHARACTER_POWERS_OFFSET = 1.041 //%
const POWERTIP_BOTTOM_MARGIN = 0.365 //%
const MULTICOL_COLUMN_RIGHT_MARGIN = 0.469 //%
const MAX_BOTTOM = 99.0 //%
const MIN_TOP = 1.0 //%

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


function arraySubset(array, indexes) {
    subset = []
    for (let i = 0; i < indexes.length; i++) {
        const index = indexes[i];
        subset.push(array[index])
    }

    return subset
}


function clearItemsByClass(class_to_be_cleared) {
    console.log('before clear items')

    var items = document.getElementById('items')
    for (let i = items.children.length - 1; i >= 0; i--) {
        const child = items.children[i];
        
        if (child.classList.contains(class_to_be_cleared)) {
            console.log('clearing child ' + class_to_be_cleared)
            items.removeChild(child)
        }
    }

    console.log('after clear items')
}


function setRelics(relics, power_tips, character) {
    console.log('set relics, relics: ' + JSON.stringify(relics))

    if (JSON.stringify(relics)  == last_relics) // do not replace 
        return

    is_relics_multipage = relics.is_relics_multipage
    last_relics = JSON.stringify(relics)

    if (current_tooltip_id && current_tooltip_id.startsWith('relic'))
        current_tooltip_id = undefined

    clearItemsByClass('relic-marker')

    var items = document.getElementById('items')
    for (let i = 0; i < relics.items.length; i++) {
        console.log('adding relic ' + i)

        const power_tip_indexes = relics.items[i];
        
        var x_hitbox = RELIC_HITBOX_LEFT + i * RELIC_HITBOX_WIDTH + (is_relics_multipage == "true" ? 1 : 0) * RELIC_HITBOX_MULTIPAGE_OFFSET

        items.appendChild(createRelicHitbox('relic_' + i, x_hitbox))
        items.appendChild(createPowerTipStrip('relic_' + i, arraySubset(power_tips, power_tip_indexes), character, 'relic-marker'))
    }

    function createRelicHitbox(id, x) {
        var hitbox = document.createElement('div')
        hitbox.className = 'relic-hitbox relic-marker'
        hitbox.style = 'left: ' + x + '%;'
        hitbox.onmouseenter = function(e) {showPowerTipStrip(e, id)}
        hitbox.onmouseout = function(e) {hidePowerTipStrip(e, id)}
    
        return hitbox
    }
}


function setPotions(potions, power_tips, character) {
    console.log('set potions, potions: ' + JSON.stringify(potions))

    if (JSON.stringify(potions) == last_potions)
        return

    if (current_tooltip_id && current_tooltip_id.startsWith('potion'))
        current_tooltip_id = undefined

    last_potions = JSON.stringify(potions)

    clearItemsByClass('potion-marker')

    var x_hitbox_first = (potions.potion_x / 1920.0) * 100

    var items = document.getElementById('items')
    for (let i = 0; i < potions.items.length; i++) {
        console.log('adding potion ' + i)

        const power_tip_indexes = potions.items[i];
        
        var x_hitbox = x_hitbox_first - POTION_HITBOX_WIDTH / 2 + i * POTION_HITBOX_WIDTH

        items.appendChild(createPotionHitbox('potion_' + i, x_hitbox))
        items.appendChild(createPowerTipStrip('potion_' + i, arraySubset(power_tips, power_tip_indexes), character, 'potion-marker'))
    }

    function createPotionHitbox(id, x) {
        var hitbox = document.createElement('div')
        hitbox.className = 'potion-hitbox potion-marker'
        hitbox.style = 'left: ' + x + '%;'
        hitbox.onmouseenter = function(e) {showPowerTipStrip(e, id)}
        hitbox.onmouseout = function(e) {hidePowerTipStrip(e, id)}
    
        return hitbox
    }
}


function setPlayerPowers(player_powers, power_tips, character) {

    console.log('set player powers, player_powers: ' + JSON.stringify(player_powers))

    if (JSON.stringify(player_powers) == last_player_powers)
        return

    if (current_tooltip_id && current_tooltip_id.startsWith('player_powers'))
        current_tooltip_id = undefined

    last_player_powers = JSON.stringify(player_powers)

    clearItemsByClass('player-powers-marker')

    if (player_powers)
        setCharacterPowers(player_powers, power_tips, 'player-powers-marker', 'player_powers', character)
}


function setMonsterPowers(monster_powers_list, power_tips, character) {

    console.log('set monster powers, monster_powers_list: ' + JSON.stringify(monster_powers_list))

    if (JSON.stringify(monster_powers_list) == last_monster_powers_list)
        return

    if (current_tooltip_id && current_tooltip_id.startsWith('monster_powers'))
        current_tooltip_id = undefined

    last_monster_powers_list = JSON.stringify(monster_powers_list)

    clearItemsByClass('monster-powers-marker')

    if (monster_powers_list)
        for (let i = 0; i < monster_powers_list.length; i++) {
            const monster_powers = monster_powers_list[i];

            setCharacterPowers(monster_powers, power_tips, 'monster-powers-marker', 'monster_powers_' + i, character)
        }
}


function setCharacterPowers(char, power_tips, marker, id, character) {

    var items = document.getElementById('items')

    var hitbox = char.hitbox
    items.appendChild(createCharacterHitbox(id, hitbox.x, hitbox.y, hitbox.w, hitbox.h))
    items.appendChild(createPowertipMulticol(id, hitbox.x, hitbox.y, hitbox.w, hitbox.h, arraySubset(power_tips, char.power_tips), character, marker))

    function createCharacterHitbox(id, x, y, w, h) {
        var hitbox = document.createElement('div')
        hitbox.className = 'powers-hitbox ' + marker
        hitbox.style = 'left: ' + x + '%; top: ' + y + '%; width: ' + w + '%; height: ' + h + '%;'
        hitbox.onmouseenter = function(e) {showPowerTipMulticol(e, id)}
        hitbox.onmouseout = function(e) {hidePowerTipMulticol(e, id)}
    
        return hitbox
    }

    function createPowertipMulticol(id, x, y, w, h, power_tips, character, marker) {
        var multicol = document.createElement('div')
        multicol.className = 'powertip-multicol ' + marker
        multicol.id = id
        
        var stream_width = $('#items').width()
        // var stream_height = $('#items').height()
        var stream_height = document.body.offsetHeight
        console.log('stream height = ' + stream_height)

        var column = document.createElement('div')
        column.className = 'powertip-multicol-column'
        multicol.appendChild(column)
        var ncolumns = 1
        
        var temp = document.getElementById('temp')

        // create powertips and distribute them to columns
        var height = 0.0
        var max_height = 0.0
        for (let i = 0; i < power_tips.length; i++) {
            const powertip = power_tips[i];
            
            var powertip_elem = createPowerTip(powertip.name, powertip.description, powertip.img, character)
            
            temp.appendChild(powertip_elem)
            height_element = powertip_elem.offsetHeight / stream_height * 100 + POWERTIP_BOTTOM_MARGIN
            temp.removeChild(powertip_elem)

            console.log('element height: ' + height_element)
            
            if (height + height_element > MAX_POWERTIP_MULTICOL_HEIGHT) {
                if (height > max_height)
                    max_height = height

                column = document.createElement('div')
                column.className = 'powertip-multicol-column'
                multicol.appendChild(column)
                ncolumns += 1
                height = height_element

            } else {
                height += height_element
            }

            column.appendChild(powertip_elem)
        }

        if (height > max_height)
            max_height = height

        // place whole multicol block
        var mc_h = max_height
        var mc_w = ncolumns * (POWERTIP_WIDTH + MULTICOL_COLUMN_RIGHT_MARGIN)
        var mc_right_x = x + w + CHARACTER_POWERS_OFFSET
        var mc_left_x = x - CHARACTER_POWERS_OFFSET * 3 - mc_w
        var mc_x = 0.0

        console.log('mc_h ' + mc_h)
        
        // decide whether the multicol block will be placed on the left or on the right
        if (mc_right_x + mc_w > MAX_RIGHT) { // would be outside of the stream on the right, display on the left
            if (mc_left_x >= 0) { // left multicol fits into stream
                mc_x = mc_left_x
            } else { // neither left nor right display fits -> pick the one that fits more
                var outside_left = Math.abs(mc_left_x) // part that's outside with the left display
                var outside_right = Math.abs(mc_right_x + mc_w - 100) // part that's outside stream with the right display

                mc_x = (outside_left > outside_right) ? mc_right_x : mc_left_x
            }
        } else {
            mc_x = mc_right_x
        }

        var mc_y = y + h / 2 - mc_h / 2
        console.log('mc_y ' + mc_y)

        if (mc_y + mc_h > MAX_BOTTOM) { // would be below stream
            mc_y = MAX_BOTTOM - mc_h
        }

        if (mc_y < MIN_TOP) { // would be above stream
            mc_y = MIN_TOP
        }

        multicol.style = 'left: ' + mc_x + '%; top: ' + mc_y + '%; width: ' + mc_w + '%; height: ' + mc_h + '%;'

        return multicol
    }
}


function createPowerTipStrip(id, power_tips, character, marker) {
    var strip = document.createElement('div')
    strip.className = "powertip-strip " + marker
    strip.id = id

    for (power_tip of power_tips) {
        strip.appendChild(createPowerTip(power_tip.name, power_tip.description, power_tip.img, character))
    }

    return strip
}


function createPowerTip(name, description, img, character) {
    
    var tooltip = document.createElement('div')
    tooltip.className = 'powertip'
    var img_html = ""
    var img_class = ""
    if (img && fileExists('img/' + img + '.png')) {
        img_html = '<img src="img/' + img + '.png" alt=" " class="powertip-img" onerror="this.src=\'img/placeholder.png\'">'
        img_class = 'powertip-header powertip-header-wimg'
    } else {
        img_class = 'powertip-header powertip-header-noimg'
    }

    tooltip.innerHTML = '<div class="' + img_class + '">' + name + img_html + '</div><div>' + replaceManaSymbols(replaceColorCodes(description), character) + '</div>'
    return tooltip

    function replaceColorCodes(text) {
        var parts = text.split(' ')

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            
            if (part.charAt(0) == '#') {
                var text_class = ''

                switch(part.charAt(1)) {
                    case 'y': text_class = 'text-yellow'; break;
                    case 'b': text_class = 'text-blue'; break;
                    case 'r': text_class = 'text-red'; break;
                    case 'g': text_class = 'text-green'; break;
                    case 'p': text_class = 'text-pink'; break;
                    default:  text_class = 'text-other'; break;
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
                var imgPath = "img/orbs/orb" + character + ".png"
                parts[i] = '<img src="' + imgPath + '" alt="[E]" class="energy-orb-img">'
            }
        }

        return parts.join(' ')
    }
}


function showPowerTipStrip(e, id) {
    current_tooltip_id = id
    movePowerTipStrip(e)
    document.getElementById(id).style.display = 'block';
}


function hidePowerTipStrip(e, id) {
    current_tooltip_id = undefined
    document.getElementById(id).style.display = 'none';
}


function showPowerTipMulticol(e, id) {
    current_tooltip_id = id
    document.getElementById(id).style.display = 'block';
}


function hidePowerTipMulticol(e, id) {
    current_tooltip_id = undefined
    document.getElementById(id).style.display = 'none';
}


function movePowerTipStrip(e) {

    if (current_tooltip_id != null && (current_tooltip_id.startsWith('relic') || current_tooltip_id.startsWith('potion'))) {
        var left = e.pageX + 52
        var top = e.pageY + 7 // - 15
        var stream_width = $('#items').width()
        var max_left = (MAX_RIGHT - POWERTIP_WIDTH) / 100 * stream_width
        
        if (left > max_left) { // display tooltip on the left side of cursor
            left = e.pageX - 24 - 12 - POWERTIP_WIDTH / 100 * stream_width
            top = e.pageY + 7 // + 3
        }

        // console.log('left', left, 'stream_width', stream_width, 'max_left', max_left)

        $('#' + current_tooltip_id).css({
            left:  left + 'px',
            top:   top + 'px'
        });
    }
}


function fileExists(file_url){

    var http = new XMLHttpRequest();

    http.open('HEAD', file_url, false);
    http.send();

    return http.status != 404;

}


function log(msg) {
    console.log(msg)
    // twitch.rig.log(msg)
}


// checks for inactivity from Slay the Relics Exporter -> when inactive for long enough, essentially hide the extension
function checkIfSourceActive() {
    var seconds = new Date() / 1000;

    if (seconds - last_broadcast_secs > SECS_NOBROADCAST_REMOVE_CONTENT) {
        setRelics({is_relics_multipage: false, items: []}, [], "")
    }
}


$(function() {

    // listen for incoming broadcast message from our EBS
    twitch.listen('broadcast', function (target, contentType, message) {
        // console.log('received a broadcast message: ' + message)

        receiveMessage(message);
    });

    $('#items').on('mousemove', movePowerTipStrip);

    // TESTING RELICS
    // var relics = [{"name": "Cracked Core", "description": "At the start of each combat, #yChannel #b1 #yLightning."}, {"name": "Dolly's Mirror", "description": "Upon pickup, obtain an additional copy of a card in your deck."}, {"name": "Smiling Mask", "description": "The Merchant's card removal service now always costs #b50 #yGold."}, {"name": "Orichalcum", "description": "If you end your turn without #yBlock, gain #b6 #yBlock."}, {"name": "Coffee Dripper", "description": "Gain [E] at the start of your turn. You can no longer #yRest at Rest Sites."}, {"name": "Toy Ornithopter", "description": "Whenever you use a potion, heal #b5 HP."}, {"name": "Ink Bottle", "description": "Whenever you play #b10 cards, draw #b1 card."}, {"name": "Omamori", "description": "Negate the next #b2 #rCurses you obtain."}]
    // setRelics(relics, "false")

    window.setInterval(checkIfSourceActive, 5000);
});
