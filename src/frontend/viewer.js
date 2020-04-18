
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


function createPowerTip(header_text, raw_description_text, img_path, character) {
    header_text = sanitize(header_text)
    raw_description_text = sanitize(raw_description_text)
    img_path = sanitize(img_path)

    var tooltip = document.createElement('div')
    tooltip.className = 'powertip'

    var header = document.createElement('div')
    header.classList.add('powertip-header')
    header.innerHTML = header_text

    var img
    if (img_path) {
        img = document.createElement('img')
        img.src = 'img/' + img_path + '.png'
        img.alt = ' '
        img.classList.add('powertip-img')
        img.onerror = function() {this.src='img/placeholder.png'}
        
        header.appendChild(img)
        header.classList.add('powertip-header-wimg')
    } else {
        header.classList.add('powertip-header-noimg')
    }

    var description = document.createElement('div')
    description.innerHTML = replaceNewLines(replaceManaSymbols(replaceColorCodes(raw_description_text), character))
    
    tooltip.appendChild(header)
    tooltip.appendChild(description)
    
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


const PRELOAD_IMAGES = ['img/intents/attackBuff.png', 'img/intents/attackDebuff.png', 'img/intents/attackDefend.png', 'img/intents/buff1.png', 'img/intents/debuff1.png', 'img/intents/debuff2.png', 'img/intents/defend.png', 'img/intents/defendBuff.png', 'img/intents/escape.png', 'img/intents/magic.png', 'img/intents/sleep.png', 'img/intents/special.png', 'img/intents/stun.png', 'img/intents/tip/1.png', 'img/intents/tip/2.png', 'img/intents/tip/3.png', 'img/intents/tip/4.png', 'img/intents/tip/5.png', 'img/intents/tip/6.png', 'img/intents/tip/7.png', 'img/intents/unknown.png', 'img/magGlass2.png', 'img/orbs/orb.png', 'img/orbs/orbDefect.png', 'img/orbs/orbIronclad.png', 'img/orbs/orbTheSilent.png', 'img/orbs/orbWatcher.png', 'img/placeholder.png', 'img/powers/48/accuracy.png', 'img/powers/48/afterImage.png', 'img/powers/48/ai.png', 'img/powers/48/amplify.png', 'img/powers/48/anger.png', 'img/powers/48/armor.png', 'img/powers/48/artifact.png', 'img/powers/48/attackBurn.png', 'img/powers/48/backAttack.png', 'img/powers/48/backAttack2.png', 'img/powers/48/barricade.png', 'img/powers/48/beat.png', 'img/powers/48/berserk.png', 'img/powers/48/bias.png', 'img/powers/48/blur.png', 'img/powers/48/book.png', 'img/powers/48/brutality.png', 'img/powers/48/buffer.png', 'img/powers/48/burst.png', 'img/powers/48/carddraw.png', 'img/powers/48/cExplosion.png', 'img/powers/48/channel.png', 'img/powers/48/choke.png', 'img/powers/48/closeUp.png', 'img/powers/48/combust.png', 'img/powers/48/confusion.png', 'img/powers/48/conserve.png', 'img/powers/48/constricted.png', 'img/powers/48/controlled_change.png', 'img/powers/48/corruption.png', 'img/powers/48/curiosity.png', 'img/powers/48/darkembrace.png', 'img/powers/48/defenseNext.png', 'img/powers/48/demonForm.png', 'img/powers/48/deva.png', 'img/powers/48/deva2.png', 'img/powers/48/devotion.png', 'img/powers/48/dexterity.png', 'img/powers/48/doubleDamage.png', 'img/powers/48/doubleTap.png', 'img/powers/48/draw.png', 'img/powers/48/draw2.png', 'img/powers/48/echo.png', 'img/powers/48/end_turn_death.png', 'img/powers/48/energized_blue.png', 'img/powers/48/energized_green.png', 'img/powers/48/entangle.png', 'img/powers/48/envenom.png', 'img/powers/48/establishment.png', 'img/powers/48/evolve.png', 'img/powers/48/explosive.png', 'img/powers/48/fading.png', 'img/powers/48/fasting.png', 'img/powers/48/firebreathing.png', 'img/powers/48/flameBarrier.png', 'img/powers/48/flex.png', 'img/powers/48/flight.png', 'img/powers/48/focus.png', 'img/powers/48/forcefield.png', 'img/powers/48/frail.png', 'img/powers/48/fumes.png', 'img/powers/48/heartDef.png', 'img/powers/48/heatsink.png', 'img/powers/48/hello.png', 'img/powers/48/hex.png', 'img/powers/48/hymn.png', 'img/powers/48/infiniteBlades.png', 'img/powers/48/infinitegreen.png', 'img/powers/48/int.png', 'img/powers/48/intangible.png', 'img/powers/48/juggernaut.png', 'img/powers/48/lessdraw.png', 'img/powers/48/like_water.png', 'img/powers/48/lockon.png', 'img/powers/48/loop.png', 'img/powers/48/magnet.png', 'img/powers/48/malleable.png', 'img/powers/48/mantra.png', 'img/powers/48/mastery.png', 'img/powers/48/master_protect.png', 'img/powers/48/master_reality.png', 'img/powers/48/master_smite.png', 'img/powers/48/mayhem.png', 'img/powers/48/mental_fortress.png', 'img/powers/48/minion.png', 'img/powers/48/modeShift.png', 'img/powers/48/nightmare.png', 'img/powers/48/nirvana.png', 'img/powers/48/noattack.png', 'img/powers/48/noBlock.png', 'img/powers/48/noDraw.png', 'img/powers/48/noPain.png', 'img/powers/48/no_skill.png', 'img/powers/48/no_stance.png', 'img/powers/48/omega.png', 'img/powers/48/painfulStabs.png', 'img/powers/48/panache.png', 'img/powers/48/path_to_victory.png', 'img/powers/48/penNib.png', 'img/powers/48/phantasmal.png', 'img/powers/48/platedarmor.png', 'img/powers/48/poison.png', 'img/powers/48/pressure_points.png', 'img/powers/48/reactive.png', 'img/powers/48/rebound.png', 'img/powers/48/regen.png', 'img/powers/48/regrow.png', 'img/powers/48/repair.png', 'img/powers/48/retain.png', 'img/powers/48/ritual.png', 'img/powers/48/rupture.png', 'img/powers/48/rushdown.png', 'img/powers/48/sadistic.png', 'img/powers/48/shackle.png', 'img/powers/48/sharpHide.png', 'img/powers/48/shift.png', 'img/powers/48/skillBurn.png', 'img/powers/48/slow.png', 'img/powers/48/split.png', 'img/powers/48/sporeCloud.png', 'img/powers/48/stasis.png', 'img/powers/48/static_discharge.png', 'img/powers/48/storm.png', 'img/powers/48/strength.png', 'img/powers/48/surrounded.png', 'img/powers/48/swivel.png', 'img/powers/48/talk_to_hand.png', 'img/powers/48/the_bomb.png', 'img/powers/48/thievery.png', 'img/powers/48/thorns.png', 'img/powers/48/thousandCuts.png', 'img/powers/48/time.png', 'img/powers/48/tools.png', 'img/powers/48/unawakened.png', 'img/powers/48/vigor.png', 'img/powers/48/vulnerable.png', 'img/powers/48/wave_of_the_hand.png', 'img/powers/48/weak.png', 'img/powers/48/wireheading.png', 'img/powers/48/wraithForm.png']
const MAX_CONCURRENT_PRELOADS = 2
const PRELOAD_INTERVAL = 250
preload_workers_available = MAX_CONCURRENT_PRELOADS
image_preload_index = 0

function preloadImages(array) {
    // console.log('preloading images')
    if (!preloadImages.list) {
        preloadImages.list = [];
    }
    var list = preloadImages.list;
    for (var i = 0; i < array.length; i++) {
        var img = new Image();
        preload_workers_available -= 1

        img.onload = function() {
            preload_workers_available += 1
            var index = list.indexOf(this);
            if (index !== -1) {
                // remove image from the array once it's loaded
                // for memory consumption reasons
                list.splice(index, 1);
            }
        }
        list.push(img);
        img.src = array[i];
    }
}

function preloadNextImageBunch() {
    let urls = []
    let workers = preload_workers_available
    // console.log(workers + ' workers available')
    for (let i = image_preload_index; i < image_preload_index + workers && i < PRELOAD_IMAGES.length; i++) {
        urls.push(PRELOAD_IMAGES[i]);
        // console.log('adding ' + PRELOAD_IMAGES[i])
    }
    image_preload_index += workers
    preloadImages(urls)

    if(image_preload_index < PRELOAD_IMAGES.length)
        window.setTimeout(preloadNextImageBunch, PRELOAD_INTERVAL)
}


current_message_parts = []
current_update_id = null

function receiveBroadcast(message) {
    console.log('receive broadcast: ' + message)
    message = JSON.parse(message)

    let part_index = message[0]
    let nparts = message[1]
    let update_id = message[2] // this is common to all parts and identifies them together
    let content = message[3]

    // console.log('message: ' + message)

    console.log('parts len ' + current_message_parts.length + ' part index ' + part_index)
    console.log(typeof(nparts))
    console.log(typeof(content))

    if (current_message_parts.length == 0) {
        if (part_index == 0) {
            console.log('first message part')
            pushContent(update_id, content, nparts)
        }
    } else {
        if (update_id == current_update_id) {
            // following up previous update
            if (part_index == current_message_parts.length) {
                console.log('message follows previous update')
                pushContent(update_id, content, nparts)
            }
        } else {
            // received message with unexpected UID, pubsub update probably lost, so forget previous message and start receiveing this one
            if (part_index == 0) {
                console.log('unexpected message first message with new id, dropping old message')
                current_message_parts = []
                pushContent(update_id, content, nparts)
            }
        }
    }
}


function pushContent(update_id, content, nparts) {
    console.log('push content')

    current_update_id = update_id
    current_message_parts.push(content)

    console.log('nparts ' + nparts + ' curr len ' + current_message_parts.length)

    if (nparts == current_message_parts.length) { // all parts were received - process the message
        let message = ''
        for (var part of current_message_parts) {
            message += part
        }

        let decomp_message = LZString.decompressFromEncodedURIComponent(message);
        console.log('decomp message: ')
        console.log(decomp_message)
        decomp_message = JSON.parse(decomp_message)
        let msg_delay = Math.ceil(decomp_message[0] + latency * 1000.0)

        // console.log('all ' + current_message_parts.length + ' parts collected, resulting message:')
        // console.log(decomp_message)

        window.setTimeout(receiveMessage, Math.max(0, msg_delay), decomp_message)

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
        console.log("received message")
        // decomp_message = LZString.decompressFromEncodedURIComponent(message);
        
        // var broadcast = JSON.parse(decomp_message)
        // var msg_delay = Math.ceil(broadcast[0] + latency * 1000.0)

        // // console.log('queuing message with delay: ' + msg_delay + 'ms');
        // window.setTimeout(function () {receiveMessage(broadcast)}, Math.max(0, msg_delay))
        // // testingMessage()

        last_broadcast_secs = new Date() / 1000
        receiveBroadcast(message)
        // console.log(decomp_message)
    });

    $('#items').on('mousemove', movePowerTipStrip);

    window.setInterval(checkIfSourceActive, 2500);

    window.setTimeout(preloadNextImageBunch, PRELOAD_INTERVAL)
});
