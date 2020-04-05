
var twitch = window.Twitch.ext;
var last_broadcast = ""
var last_relics = ""
var last_potions = ""
var last_potion_tips = ""
var last_player_powers = ""
var last_player_power_tips = ""
var last_monster_powers_list = ""
var last_monster_powers_list_tips = ""
var last_custom_tips_list = ""
var last_custom_tips_list_tips = ""
var current_tooltip_id = ""
var last_broadcast_secs = new Date() / 1000
var latency = 0.0

const MSG_TYPE_SET_CONTENT = 1 // "set_content"

const CHARACTERS = ["Ironclad", "TheSilent", "Defect", "Watcher"]

function receiveMessage(broadcast) {
    // console.log(JSON.stringify(broadcast))

    var msg_type = broadcast[1]
    var msg = broadcast[2]

    if (msg_type == MSG_TYPE_SET_CONTENT) {
        if (last_broadcast !=  broadcast) {
            var character = sanitizeCharacter(msg.c)

            var power_tips = decompressPowerTips(msg.w)

            setRelics(msg.r, power_tips, character)        
            setPotions(msg.o, power_tips, character)
            setPlayerPowers(msg.p, power_tips, character)
            setMonsterPowers(msg.m, power_tips, character)
            setCustomTips(msg.u, power_tips, character)
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
const CHARACTER_POWERS_OFFSET_R = 1.0416 //%
const CHARACTER_POWERS_OFFSET_L = -2.917 //%
const CHARACTER_HEALTHBAR_HEIGHT = 6.666 //%
const POWERTIP_BOTTOM_MARGIN = 0.365 //%
const MULTICOL_COLUMN_RIGHT_MARGIN = 0.469 //% - don't mess with this number or the columns won't be separated
const MAX_BOTTOM = 98.0 //%
const MIN_TOP = 2.0 //%

const SECS_NOBROADCAST_REMOVE_CONTENT = 5

function sanitizeCharacter(character) {
    for (const char of CHARACTERS) {
        if (character == char) {
            return character
        }
    }
    // in case the character is not recognized, use Ironclad mana symbol
    return CHARACTERS[2]
}


function arraySubset(array, indexes) {
    var subset = []
    for (let i = 0; i < indexes.length; i++) {
        const index = indexes[i];
        subset.push(array[index])
    }

    return subset
}

function arraySlice(array, from, to) {
    var slice = []

    if (!to) {
        to = array.length
    }

    for (let i = from; i < to; i++) {
        slice.push(array[i])
    }

    return slice
}


function clearItemsByClass(class_to_be_cleared) {
    // console.log('clear items in class ' + class_to_be_cleared)

    var items = document.getElementById('items')
    for (let i = items.children.length - 1; i >= 0; i--) {
        const child = items.children[i];
        
        if (child.classList.contains(class_to_be_cleared)) {
            // console.log('clearing child ' + class_to_be_cleared)
            items.removeChild(child)
        }
    }

    // console.log('after clear items')
}


function decompressPowerTips(power_tips) {
    power_tips = decompress(power_tips)

    new_tips = []
    split = power_tips.split(';;')

    for (let i = 0; i < split.length; i++) {
        const tip = split[i];
        new_tips.push(tip.split(';'))
    }

    return new_tips
}


function setRelics(relics, power_tips, character) {
    // console.log('set relics, relics: ' + JSON.stringify(relics))

    if (JSON.stringify(relics)  == last_relics) // do not replace 
        return

    is_relics_multipage = relics[0]
    last_relics = JSON.stringify(relics)

    if (current_tooltip_id && current_tooltip_id.startsWith('relic'))
        current_tooltip_id = undefined

    clearItemsByClass('relic-marker')

    var items = document.getElementById('items')
    for (let i = 0; i < relics[1].length; i++) {
        // console.log('adding relic ' + i)

        const power_tip_indexes = relics[1][i];
        
        var x_hitbox = RELIC_HITBOX_LEFT + i * RELIC_HITBOX_WIDTH + is_relics_multipage * RELIC_HITBOX_MULTIPAGE_OFFSET

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
    // console.log('set potions, potions: ' + JSON.stringify(potions))

    if (potions) {
        var ids = []
        for (let i = 1; i < potions[1].length; i++) {
            ids = ids.concat(potions[1][i])
        }
        power_tips_subset = arraySubset(power_tips, ids);

        if (JSON.stringify(potions) == last_potions && JSON.stringify(power_tips_subset) == last_potion_tips) {
            return
        }
    }

    if (current_tooltip_id && current_tooltip_id.startsWith('potion'))
        current_tooltip_id = undefined

    last_potions = JSON.stringify(potions)
    last_potion_tips = JSON.stringify(power_tips_subset)

    clearItemsByClass('potion-marker')

    var x_hitbox_first = (potions[0] / 1920.0) * 100

    var items = document.getElementById('items')
    
    for (let i = 0; i < potions[1].length; i++) {
        // console.log('adding potion ' + i)

        const power_tip_indexes = potions[1][i];
        
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

    // console.log('set player powers, player_powers: ' + JSON.stringify(player_powers))

    if (player_powers) {

        power_tips_subset = arraySubset(power_tips, player_powers[4]);

        if (JSON.stringify(player_powers) == last_player_powers && JSON.stringify(power_tips_subset) == last_player_power_tips)
            return
    }

    if (current_tooltip_id && current_tooltip_id.startsWith('player_powers'))
        current_tooltip_id = undefined

    last_player_powers = JSON.stringify(player_powers)
    last_player_power_tips = JSON.stringify(power_tips_subset)

    clearItemsByClass('player-powers-marker')

    if (player_powers)
        setMulticolPowertips(player_powers, power_tips, 'player-powers-marker', 'player_powers', character, 1, true)
}


function setMonsterPowers(monster_powers_list, power_tips, character) {

    // console.log('set monster powers, monster_powers_list: ' + JSON.stringify(monster_powers_list))

    if (monster_powers_list) {
        
        var ids = []
        for (const monster of monster_powers_list) {
            ids = ids.concat(monster[4])
        }
        power_tips_subset = arraySubset(power_tips, ids);
        
        if (JSON.stringify(monster_powers_list) == last_monster_powers_list && JSON.stringify(power_tips_subset) == last_monster_powers_list_tips)
            return
    } 

    if (current_tooltip_id && current_tooltip_id.startsWith('monster_powers'))
        current_tooltip_id = undefined

    last_monster_powers_list = JSON.stringify(monster_powers_list)
    last_monster_powers_list_tips = JSON.stringify(power_tips_subset)

    clearItemsByClass('monster-powers-marker')

    if (monster_powers_list)
        for (let i = 0; i < monster_powers_list.length; i++) {
            const monster_powers = monster_powers_list[i];

            setMulticolPowertips(monster_powers, power_tips, 'monster-powers-marker', 'monster_powers_' + i, character, 0, true)
        }
}


function setCustomTips(custom_tips_list, power_tips, character) {

    // console.log('set custom tips, custom_tips_list: ' + JSON.stringify(custom_tips_list))

    if (custom_tips_list) {
        var ids = []
        for (const tip of custom_tips_list) {
            ids = ids.concat(tip[4])
        }
        power_tips_subset = arraySubset(power_tips, ids);

        if (JSON.stringify(custom_tips_list) == last_custom_tips_list && JSON.stringify(power_tips_subset) == last_custom_tips_list_tips)
            return
    }

    if (current_tooltip_id && current_tooltip_id.startsWith('custom_tips'))
        current_tooltip_id = undefined

    last_custom_tips_list = JSON.stringify(custom_tips_list)
    last_custom_tips_list_tips = JSON.stringify(power_tips_subset)

    clearItemsByClass('custom-tips-marker')

    if (custom_tips_list)
        for (let i = 0; i < custom_tips_list.length; i++) {
            const custom_tips = custom_tips_list[i];

            setMulticolPowertips(custom_tips, power_tips, 'custom-tips-marker', 'custom_tips_' + i, character, 2)
        }
}


function setMulticolPowertips(obj, power_tips, marker, id, character, hitbox_z, heuristic_y) {

    var items = document.getElementById('items')

    var hitbox = {
        x: obj[0],
        y: obj[1],
        w: obj[2],
        h: obj[3]
    }
    var obj_power_tips = obj[4]

    items.appendChild(createHitbox(id, hitbox.x, hitbox.y, hitbox.w, hitbox.h))
    items.appendChild(createPowertipMulticol(id, hitbox.x, hitbox.y, hitbox.w, hitbox.h, arraySubset(power_tips, obj_power_tips), character, marker))

    function createHitbox(id, x, y, w, h) {
        var hitbox = document.createElement('div')
        hitbox.className = 'powers-hitbox ' + marker
        hitbox.style = 'left: ' + x + '%; top: ' + y + '%; width: ' + w + '%; height: ' + h + '%; z-index: ' + hitbox_z + ';'
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
        // console.log('stream height = ' + stream_height)

        var column = document.createElement('div')
        column.className = 'powertip-multicol-column'
        multicol.appendChild(column)
        var ncolumns = 1
        
        var temp = document.getElementById('temp')

        // create powertips and distribute them to columns
        var height = 0.0
        var max_height = 0.0
        var power_tip_heights = []
        for (let i = 0; i < power_tips.length; i++) {
            const power_tip = power_tips[i];
            
            name = power_tip[0]
            description = power_tip[1]
            img = (power_tip.length == 3) ? power_tip[2]:undefined

            var powertip_elem = createPowerTip(name, description, img, character)
            
            temp.appendChild(powertip_elem)
            height_element = powertip_elem.offsetHeight / stream_height * 100 + POWERTIP_BOTTOM_MARGIN
            temp.removeChild(powertip_elem)

            power_tip_heights.push(height_element)

            // console.log('element height: ' + height_element)
            
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
        var mc_right_x = x + w + CHARACTER_POWERS_OFFSET_R
        var mc_left_x = x + CHARACTER_POWERS_OFFSET_L - mc_w
        var mc_x = 0

        // console.log('mc_h ' + mc_h)
        
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
            if (x + w < 80.416)
                mc_x = mc_right_x
            else
                mc_x = mc_left_x
        }

        // console.log('power_tip_heights[0] ' + power_tip_heights[0])

        if (heuristic_y) {
            // don't worry about this line, it just approximates what is in the game. You have spent several hours on this one line. It's a heuristic, it's good enough
            var mc_y = y + (h - CHARACTER_HEALTHBAR_HEIGHT) / 2 - (y + (h - CHARACTER_HEALTHBAR_HEIGHT)) / 100 * max_height * 0.98 + power_tip_heights[0] / 2.65
        } else {
            var mc_y = y + h / 2 - mc_h / 2
        }
            
        // console.log('mc_y ' + mc_y)

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
        name = power_tip[0]
        description = power_tip[1]
        img = (power_tip.length == 3) ? power_tip[2]:undefined

        strip.appendChild(createPowerTip(name, description, img, character))
    }

    return strip
}


function createPowerTip(name, description, img, character) {
    name = sanitize(name)
    description = sanitize(description)
    img = sanitize(img)

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

    description = replaceNewLines(replaceManaSymbols(replaceColorCodes(description), character))
    tooltip.innerHTML = '<div class="' + img_class + '">' + name + img_html + '</div><div>' + description + '</div>'
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

    function replaceNewLines(text) {
        parts = text.split(' ')
        new_text = ''
        previous_special = true

        for (let i = 0; i < parts.length; i++) {
            const word = parts[i];

            if (word == 'NL') {
                new_text += '<br>'
                previous_special = true
            } else if (word == 'TAB') {
                new_text += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'
                previous_special = true
            } else {
                if (!previous_special)
                    new_text += ' '
                new_text += word
                previous_special = false
            }
            
        }

        return new_text
    }
}


function sanitize(text) {
    if (text)
        return text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    else
        return text
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


const WILDCARDS = '0123456789abcdefghijklmnopqrstvwxyzABCDEFGHIJKLMNOPQRSTVWXYZ_`[]/^%?@><=-+*:;,.()#$!\'{}~'

function escapeRegex(str) {
    return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function decompress(msg) {

    parts = msg.split('||')

    compression_dict = parts[0].split('|')
    var text = parts[1]

    for (let i = compression_dict.length-1; i >= 0; i--) {
        const word = compression_dict[i];
        const wildcard = '&' + WILDCARDS[i];
        
        text = text.replace(new RegExp(escapeRegex(wildcard), 'g'), word)
    }

    return text
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
        receiveMessage(msg)
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
    receiveMessage(msg)
}


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
        decomp_message = LZString.decompressFromEncodedURIComponent(message);
        
        var broadcast = JSON.parse(decomp_message)
        var msg_delay = Math.ceil(broadcast[0] + latency * 1000.0)

        // console.log('queuing message with delay: ' + msg_delay + 'ms');
        window.setTimeout(function () {receiveMessage(broadcast)}, Math.max(0, msg_delay))
        // testingMessage()

        last_broadcast_secs = new Date() / 1000
        // console.log(decomp_message)
    });

    $('#items').on('mousemove', movePowerTipStrip);

    window.setInterval(checkIfSourceActive, 2500);
});
