
const CHARACTERS = ["Ironclad", "TheSilent", "Defect", "Watcher"]
const WILDCARDS = '0123456789abcdefghijklmnopqrstvwxyzABCDEFGHIJKLMNOPQRSTVWXYZ_`[]/^%?@><=-+*:;,.()#$!\'{}~'

const REM_PX = 21.6

const RELIC_HITBOX_WIDTH = 3.75 //%
const RELIC_HITBOX_LEFT = 1.458 //%
const RELIC_HITBOX_MULTIPAGE_OFFSET = 1.875 //%
const POTION_HITBOX_WIDTH = 2.916 // %
const POWERTIP_WIDTH = 16.406 //%
const POWERTIP_WIDTH_REM = 14.583 //%
const MAX_POWERTIP_MULTICOL_HEIGHT = 70.0 //%
const POWERTIP_BOTTOM_MARGIN = 0.365 //%
const MULTICOL_COLUMN_RIGHT_MARGIN = 0.469 //% - don't mess with this number or the columns won't be separated

var collections = {}

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


function splitSemicolonDelimited2DArray(text) {
    array = []
    split = text.split(';;')

    for (let i = 0; i < split.length; i++) {
        const element = split[i];
        array.push(element.split(';'))
    }

    return array
}


function parseCommaDelimitedIntegerArray(text) {
    return JSON.parse('[' + text + ']')
}


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


function getNextId() {
    if (getNextId.uid == undefined) {
        getNextId.uid = 0
    }

    getNextId.uid = (getNextId.uid + 1) % 1000

    return "id" + getNextId.uid
}


function clearCollection(category) {
    if (category in collections) {
        for (let i = 0; i < collections[category].length; i++) {
            const element = array[i];
            element.parentNode.removeChild(element)
        }

        collections[category] = []
    }
}


function addToCollection(category, element) {
    if (category in collections) {
        collections[category].push(element)
    } else {
        collections[category] = [element]
    }
}

MULTICOL_PLACEMENT_AUTO_HEURISTIC = 'auto_heuristic'
MULTICOL_PLACEMENT_AUTO_SIMPLE = 'auto_simple'
MULTICOL_PLACEMENT_MANUAL_TOPLEFT = 'manual_topleft'
MULTICOL_PLACEMENT_MANUAL_CENTER = 'manual_center'

class MulticolPowertipsPlacement {
    constructor(type, x, y) {

    }
}


function createMulticolPowertips(parent, hitbox, tips, category, character, id_prefix) {

    if (!id_prefix) {
        id_prefix = ""
    }

    // var items = document.getElementById('items')
    let id = id_prefix + getNextId()

    let hitboxElem = createHitbox(id, category, hitbox.x, hitbox.y, hitbox.z, hitbox.w, hitbox.h)
    let tipsElem = createPowertipMulticol(id, hitbox.x, hitbox.y, hitbox.w, hitbox.h, tips, character)

    addToCollection(category, hitboxElem)
    addToCollection(category, tipsElem)

    parent.appendChild(hitboxElem)
    parent.appendChild(tipsElem)

    return {hitbox: hitboxElem, tips: tipsElem}

    function createHitbox(id, category, x, y, z, w, h) {
        var hitbox = document.createElement('div')
        hitbox.className = 'hitbox'
        hitbox.style = 'left: ' + x + '; top: ' + y + '; width: ' + w + '; height: ' + h + '; z-index: ' + z + ';'
        hitbox.id = id + '_hitbox'
        hitbox.onmouseenter = function(e) {showPowerTipMulticol(e, id, category)}
        hitbox.onmouseout = function(e) {hidePowerTipMulticol(e, id, category)}
    
        return hitbox
    }

    function createPowertipMulticol(id, x, y, w, h, power_tips, character) {
        var multicol = document.createElement('div')
        multicol.className = 'powertip-multicol'
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
        multicol.style = 'width: ' + mc_w + '%; height: ' + mc_h + '%;'

        return multicol
    }
}


function createPowerTipStrip(parent, hitbox, tips, category, character) {
    
    let id = getNextId()

    let hitboxElem = createHitbox(id, category, hitbox.x, hitbox.y, hitbox.z, hitbox.w, hitbox.h)
    let tipsElem = createStrip(id, tips, character)

    addToCollection(category, hitboxElem)
    addToCollection(category, tipsElem)

    parent.appendChild(hitboxElem)
    parent.appendChild(tipsElem)

    return {hitbox: hitboxElem, tips: tipsElem}

    function createStrip(id, tips, character) {
        var strip = document.createElement('div')
        strip.className = 'powertip-strip'
        strip.id = id
    
        for (power_tip of tips) {
            name = power_tip[0]
            description = power_tip[1]
            img = (power_tip.length == 3) ? power_tip[2]:undefined
    
            strip.appendChild(createPowerTip(name, description, img, character))
        }
    
        return strip
    }

    function createHitbox(id, category, x, y, z, w, h) {
        var hitbox = document.createElement('div')
        hitbox.className = 'hitbox'
        hitbox.style = 'left: ' + x + '; top: ' + y + '; width: ' + w + '; height: ' + h + '; z-index: ' + z + ';'
        hitbox.onmouseenter = function(e) {showPowerTipStrip(e, id, category)}
        hitbox.onmouseout = function(e) {hidePowerTipStrip(e, id, category)}
    
        return hitbox
    }
}


function createPowerTip(header_text, raw_description_text, img_path, character) {
    header_text = sanitize(header_text)
    raw_description_text = sanitize(raw_description_text)
    img_path = sanitize(img_path)

    var tooltip = document.createElement('div')
    tooltip.className = 'powertip'

    var header = document.createElement('div')
    header.classList.add('powertip-header')
    header.classList.add('outline')
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
}



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


function sanitize(text) {
    if (text)
        return text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    else
        return text
}


function parseRem(val) {
    val = val.substring(0, val.length-3)
    return parseFloat(val)
}


function parsePercentage(val) {
    val = val.substring(0, val.length-1)
    return parseFloat(val)
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