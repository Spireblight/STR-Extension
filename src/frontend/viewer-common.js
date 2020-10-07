
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
const MAX_CONCURRENT_PRELOADS = 3
const PRELOAD_INTERVAL = 250
var imagePreloadQueue

var temp_card_title
var temp_card_description

class CustomElement{
    constructor(root = null) {
        this.root = root
    }
}


class PlaceholderElement extends CustomElement {
    constructor() {
        const elem = document.createElement('div')
        elem.display = 'none'
        super(elem)
    }
}


function appendChild(parent, child) {
    if (child instanceof Element)
        parent.appendChild(child)
    else if (child instanceof CustomElement)
        parent.appendChild(child.root)
    else
        error('invalid child type: ' + typeof(child))
}


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
    if (text == '-')
        return []

    array = []
    split = text.split(';;')

    for (let i = 0; i < split.length; i++) {
        const element = split[i];
        array.push(element.split(';'))
    }

    return array
}


function parseCommaDelimitedIntegerArray(text) {
    if (text == '-')
        return []
    else
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
            const element = collections[category][i];

            if (element instanceof CustomElement)
                element.root.parentNode.removeChild(element.root)
            else
                element.parentNode.removeChild(element)
        }

        collections[category] = []
    }
}


function addToCollection(category, element) {
    if (!(element instanceof Element || element instanceof CustomElement))
        error('element is neither the instance of Element nor CustomElement but ' + typeof(element))

    if (category in collections) {
        collections[category].push(element)
    } else {
        collections[category] = [element]
    }
}


////////////////////////////////////// TIPS


class PowerTip {
    constructor(header_text, raw_description_text, img_path) {
        name = power_tip[0]
        description = power_tip[1]
        img = (power_tip.length == 3) ? power_tip[2]:undefined
    }
}


class PowerTipElement extends CustomElement {
    constructor (header_text, raw_description_text, img_path, character) {
        header_text = sanitizeHtmlText(header_text)
        raw_description_text = sanitizeHtmlText(raw_description_text)
        img_path = sanitizeHtmlText(img_path)

        let root = document.createElement('div')
        root.className = 'powertip'

        let header = document.createElement('div')
        header.classList.add('powertip-header')
        header.classList.add('outline')
        header.innerHTML = replaceManaSymbols(header_text, character)

        let img
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

        let description = document.createElement('div')
        description.innerHTML = replaceNewLines(replaceManaSymbols(replaceColorCodes(raw_description_text), character))
        
        root.appendChild(header)
        root.appendChild(description)

        super(root)
    }
}

class HitboxElement extends CustomElement {
    constructor(hitbox) {
        let root = document.createElement('div')
        root.className = 'hitbox'
        root.style = 'left: ' + hitbox.x + '; top: ' + hitbox.y + '; width: ' + hitbox.w + '; height: ' + hitbox.h + '; z-index: ' + hitbox.z + ';'

        super(root)
    }

    setMagnifyingGlassCursor() {
        this.root.classList.add('mag-glass')
    }
}

class PowerTipBlock {
    constructor(parent, hitbox, tips, category, character, id_prefix) {

        if (!id_prefix) {
            id_prefix = ""
        }
        let id = id_prefix + getNextId()
        
        let hitboxElem = new HitboxElement(hitbox)
        hitboxElem.root.onmouseenter = function(e) {showPowerTipMulticol(e, id, category)}
        hitboxElem.root.onmouseout = function(e) {hidePowerTipMulticol(e, id, category)}
        let tipsElem = this.createPowertipMulticol(id, tips, character)

        addToCollection(category, hitboxElem)
        addToCollection(category, tipsElem)
        
        appendChild(parent, hitboxElem)
        appendChild(parent, tipsElem)

        this.tipsElem = tipsElem
        this.hitboxElem = hitboxElem
    }

    createPowertipMulticol(id, power_tips, character) {
        let multicol = document.createElement('div')
        multicol.className = 'powertip-multicol'
        multicol.id = id
        
        let stream_height = document.body.offsetHeight

        let column = document.createElement('div')
        column.className = 'powertip-multicol-column'
        multicol.appendChild(column)
        let ncolumns = 1
        
        let temp = document.getElementById('temp')

        // create powertips and distribute them to columns
        let height = 0.0
        let max_height = 0.0
        let power_tip_heights = []
        for (let i = 0; i < power_tips.length; i++) {
            const power_tip = power_tips[i];
            
            let name = power_tip[0]
            let description = power_tip[1]
            let img = (power_tip.length == 3) ? power_tip[2]:undefined

            let powertip_elem = new PowerTipElement(name, description, img, character)
            temp.appendChild(powertip_elem.root)
            let height_element = powertip_elem.root.offsetHeight / stream_height * 100 + POWERTIP_BOTTOM_MARGIN
            temp.removeChild(powertip_elem.root)

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

            column.appendChild(powertip_elem.root)
        }

        if (height > max_height)
            max_height = height

        // place whole multicol block
        let mc_h = max_height
        let mc_w = ncolumns * (POWERTIP_WIDTH + MULTICOL_COLUMN_RIGHT_MARGIN)
        multicol.style = 'width: ' + mc_w + '%; height: ' + mc_h + '%;'

        return multicol
    }
}


class PowerTipStrip {
    constructor (parent, hitbox, tips, category, character) {
        let id = getNextId()

        let hitboxElem = new HitboxElement(hitbox)
        hitboxElem.root.onmouseenter = function(e) {showPowerTipStrip(e, id, category)}
        hitboxElem.root.onmouseout = function(e) {hidePowerTipStrip(e, id, category)}
        let tipsElem = this.createStrip(id, tips, character)
    
        addToCollection(category, hitboxElem)
        addToCollection(category, tipsElem)
    
        appendChild(parent, hitboxElem)
        appendChild(parent, tipsElem)

        this.hitboxElem = hitboxElem
        this.tipsElem = tipsElem
    }

    createStrip(id, tips, character) {
        let strip = document.createElement('div')
        strip.className = 'powertip-strip'
        strip.id = id
    
        for (let power_tip of tips) {
            let name = power_tip[0]
            let description = power_tip[1]
            let img = (power_tip.length == 3) ? power_tip[2]:undefined
            
            appendChild(strip, new PowerTipElement(name, description, img, character))
        }
    
        return strip
    }
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

function replaceManaSymbols(text, character, scalable=false) {
    var parts = text.split(' ')

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        
        if (part.length > 0 && part.charAt(0) == '[' && part.includes('[E]')) {
            let imgPath = "img/orbs/orb" + character + ".png"
            let cls = 'energy-orb-img'
            if (scalable) {
                cls = 'energy-orb-img-scalable'
            }

            parts[i] = part.replace('[E]', '<img src="' + imgPath + '" alt="[E]" class="' + cls + '">')
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


function sanitizeHtmlText(text) {
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



////////////////////////////////////// CARDS

// these are defaults from the base game that are integer encoded, the one from mods get sent by their full name
CARD_TYPE = ['ATTACK', 'SKILL', 'POWER', 'STATUS', 'CURSE']
CARD_RARITY = ['BASIC', 'SPECIAL', 'COMMON', 'UNCOMMON', 'RARE', 'CURSE']
CARD_COLOR = ['RED', 'GREEN', 'BLUE', 'PURPLE', 'COLORLESS', 'CURSE']


class Card {
    constructor(name, cost, type, rarity, color, description, keyword_ids, card_to_preview, upgrades, bottle_status, mod_name) {
        this.name = name
        this.cost = cost
        this.type = type
        this.rarity = rarity
        this.color = color
        this.description = description
        this.keyword_ids = keyword_ids
        this.card_to_preview = card_to_preview
        this.upgrades = upgrades
        this.bottle_status = bottle_status
        this.mod_name = mod_name
        
        this.upgraded_version = null
    }

    equals(card) {
        let eq = this.name == card.name && this.cost == card.cost && this.type == card.type && this.rarity == card.rarity && this.color == card.color && this.description == card.description && JSON.stringify(this.keyword_ids) == JSON.stringify(card.keyword_ids) && this.card_to_preview == card.card_to_preview && this.upgrades == card.upgrades && this.bottle_status == card.bottle_status && this.mod_name == card.mod_name

        if (this.upgraded_version != null) {
            if (card.upgraded_version == null)
                return false;

            eq = eq && this.upgraded_version.equals(card.upgraded_version)
        }

        return eq
    }

    static parseCard(array) {
        // name ; bottleStatus ; cardToPreview ; cardToPreview upgraded ; nameUpgraded ; upgrades ; keyword upgraded ; descriptionUpgraded ; keywords ; cost ; cost upgraded ; type ; rarity ; color ; description

        let name = array[0]
        let card_to_preview = parseInt(array[3])
        let card_to_preview_upgraded = parseInt(array[4])
        let name_upgraded = this.parseUpgradedName(name, array[5])
        let upgrades = parseInt(array[6])

        let keyword_ids_upgraded = this.parseUpgradedKeywords(array[9], array[7])
        let description_upgraded = this.parseUpgradedDesc(array[15], array[8])
        let keyword_ids = this.parseKeywords(array[9])
        let cost = this.parseCost(array[10])
        let cost_upgraded = this.parseCost(array[11])
        let type = this.parseCardType(array[12])
        let rarity = this.parseCardRarity(array[13])
        let color = this.parseCardColor(array[14])
        let description = array[15]
        let bottle_status = parseInt(array[1])
        let mod_name = this.parseModName(array[2])

        let card = new Card(name, cost, type, rarity, color, description, keyword_ids, card_to_preview, upgrades, bottle_status, mod_name)
        if (name_upgraded != null) {
            card.upgraded_version = new Card(name_upgraded, cost_upgraded, type, rarity, color, description_upgraded, keyword_ids_upgraded, card_to_preview_upgraded, upgrades+1, 0, mod_name)
        }

        return card
    }

    
    static parseUpgradedName(name, upgName) {
        if (upgName == '-')
            return null

        if (upgName == '_')
            return name

        if (upgName == '+')
            return name + '+'

        return upgName
    }

    static parseUpgradedDesc(desc, upgDesc) {
        if (upgDesc == '-')
            return null

        if (upgDesc == '_')
            return desc

        return upgDesc
    }

    static parseUpgradedKeywords(keywords, keywordsUpg) {
        if (keywordsUpg == '_')
            return this.parseKeywords(keywords)
        
        return this.parseKeywords(keywordsUpg)
    }

    static parseCardType(type) {
        let parsed = parseInt(type)
        return isNaN(parsed) ? type : CARD_TYPE[parsed]
    }
    
    static parseCardRarity(rarity) {
        let parsed = parseInt(rarity)
        return isNaN(parsed) ? rarity : CARD_RARITY[parsed]
    }
    
    static parseCardColor(color) {
        let parsed = parseInt(color)
        return isNaN(parsed) ? color : CARD_COLOR[parsed]
    }

    static parseCost(cost) {
        if (cost == -2)
            return null
        else if (cost == -1)
            return "X"
        else
            return parseInt(cost)
    }
    
    static parseKeywords(keywords) {
        if (keywords == '-')
            return []
        else {
            return JSON.parse('[' + keywords + ']')
        }
    }

    static parseModName(mod_name) {
        return mod_name == '-' ? null : mod_name
    }
}


const CARD_BASE_WIDTH = 12.361 //rem
const CARD_BASE_HEIGHT = 15.926 //rem
const CARD_BASE_FONT_SIZE = 1 //rem

const BOTTLE_RELICS = ['bottled_flame', 'bottled_lightning', 'bottled_tornado']


const CARD_MIN_FONT_SCALING = 0.69
const CARD_FONT_SCALING_STEP = 0.05

const CARD_TITLE_FONT_SIZE = 0.984 //em
const CARD_TITLE_FONT_SIZE_SMALL = 0.839 //em
const CARD_DESCRIPTION_FONT_SIZE = 0.875 //em


class CardElement extends CustomElement {

    constructor(card, character, target_width=12.361, colorize_upgrades=true, small_title_font=false, display_bottle=true, description_shadow=false) {

        if (target_width == undefined)
            target_width = CARD_BASE_WIDTH

        const cardElem = document.createElement('div')
        cardElem.classList.add('card')
        super(cardElem)
        this.setWidth(target_width)

        this.shadow_blur = document.createElement('div')
        this.shadow_blur.className = 'card-shadow-blur'
        cardElem.appendChild(this.shadow_blur)

        this.shadow_drop = document.createElement('div')
        this.shadow_drop.className = 'card-shadow-drop'
        cardElem.appendChild(this.shadow_drop)

        const bg = document.createElement('div')
        bg.className = 'card-img'
        // bg.style.backgroundImage = this.getBackgroundPath(card)
        bg.style.zIndex = -4
        // let bg_path = this.getBackgroundPath(card)
        imagePreloadQueue.highPriorityLoadImg(this.getBackgroundPath(card), this.getBackgroundPath(card, true), imagePreloadQueue.loadBackgroundCallback, bg, this.getBackgroundPath(card))
        cardElem.appendChild(bg)

        const portrait = document.createElement('div')
        portrait.className = 'card-portrait'
        // portrait.style.backgroundImage = this.getPortraitPath(card)
        portrait.style.zIndex = -3
        imagePreloadQueue.lowPriorityLoadImg(this.getPortraitPath(card), null, imagePreloadQueue.loadBackgroundCallback, portrait, this.getPortraitPath(card))
        cardElem.appendChild(portrait)

        const frame = document.createElement('div')
        frame.className = 'card-img'
        // frame.style.backgroundImage = this.getFramePath(card)
        frame.style.zIndex = -2
        imagePreloadQueue.highPriorityLoadImg(this.getFramePath(card), this.getFramePath(card, true), imagePreloadQueue.loadBackgroundCallback, frame, this.getFramePath(card))
        cardElem.appendChild(frame)
        
        if (card.cost != null) {
            const energyOrb = document.createElement('div')
            energyOrb.className = 'card-img'
            energyOrb.style.backgroundImage = this.getEnergyOrbPath(card)
            energyOrb.style.zIndex = -1
            imagePreloadQueue.highPriorityLoadImg(this.getEnergyOrbPath(card), this.getEnergyOrbPath(card, true), imagePreloadQueue.loadBackgroundCallback, energyOrb, this.getEnergyOrbPath(card))
            cardElem.appendChild(energyOrb)
            
            const energyCost = document.createElement('div')
            energyCost.className = 'card-cost outline-black'
            energyCost.innerHTML = card.cost
            energyCost.zIndex = 1
            cardElem.appendChild(energyCost)
        }

        const title = document.createElement('div')
        title.className = 'card-title'
        let name_aux = card.name
        if (card.upgrades > 0 && colorize_upgrades && card.name.indexOf("+") >= 0)
            name_aux = colorizeString(name_aux, '#g')
        let title_text = replaceColorCodes(sanitizeHtmlText(name_aux))
        let title_font_size = small_title_font ? CARD_TITLE_FONT_SIZE_SMALL : CARD_TITLE_FONT_SIZE
        let title_scaling = this.computeFontScaling(title_text, title_font_size, temp_card_title, 1.3, 0.5)
        title.style.fontSize = title_font_size * title_scaling + 'em'
        title.innerHTML = title_text
        cardElem.appendChild(title)

        // if (title_scaling < 1) {
        //     console.log(card.name, 'title scaling', title_scaling)
        // }

        const bottle = document.createElement('div')
        bottle.className = 'card-bottle'
        cardElem.appendChild(bottle)

        if(display_bottle && card.bottle_status > 0) {
            imagePreloadQueue.lowPriorityLoadImg(this.getBottlePath(card), null, imagePreloadQueue.loadBackgroundCallback, bottle, this.getBottlePath(card))
            // bottle.style.backgroundImage = 'url(img/relics/' + BOTTLE_RELICS[card.bottle_status - 1] + '.png)'
        }

        const desc = document.createElement('div')
        desc.className = 'card-description'
        const descText = document.createElement('span')
        let desc_text = replaceNewLines(replaceManaSymbols(replaceColorCodes(sanitizeHtmlText(card.description)), 
        character, true))
        descText.innerHTML = desc_text
        descText.className = 'card-description-text'
        if (description_shadow)
            descText.classList.add('card-description-text-shadow')
        let desc_scaling = this.computeFontScaling(desc_text, CARD_DESCRIPTION_FONT_SIZE, temp_card_description, 4.873, 0.5)
        descText.style.fontSize = CARD_DESCRIPTION_FONT_SIZE * desc_scaling + 'em'
        desc.appendChild(descText)
        cardElem.appendChild(desc)

        // console.log(JSON.stringify(keywords))
    }

    getBackgroundPath(card, get_default=false) {
        if (!get_default)
            return this.getBaseCardPath(card) + card.color + '/background_' + card.type + '.png'
        else
            return 'img/cards/basegame/COLORLESS/background_' + card.type + '.png'
    }

    getFramePath(card, get_default=false) {
        if (!get_default)
            return this.getBaseCardPath(card) + card.color + '/frame_' + card.type + '_' + card.rarity + '.png'
        else
            return 'img/cards/basegame/COLORLESS/frame_' + card.type + '_' + card.rarity + '.png'
    }

    getEnergyOrbPath(card, get_default=false) {
        if (!get_default)
            return this.getBaseCardPath(card) + card.color + '/energy_orb.png'
        else
            return 'img/cards/basegame/COLORLESS/energy_orb.png'
    }

    sanitizeFilename(filename) {
        return filename.replace(/[\\/:*?"<>|\s]/g, '_')
    }

    getModName(card) {
        return card.mod_name == null ? "basegame" : card.mod_name
    }

    getPortraitPath(card) {
        let name = card.name
        if (card.upgrades > 0 && name.lastIndexOf('+') != -1)
            name = name.substring(0, name.lastIndexOf('+'))
        name = this.sanitizeFilename(name)

        let subfolder = ''
        if (card.color == 'CURSE' && card.mod_name != null) {
            subfolder = card.mod_name + '/'
        }
        return this.getBaseCardPath(card) + card.color + '/portraits/' + subfolder + name + '.png'
    }

    getBottlePath(card) {return 'img/relics/' + BOTTLE_RELICS[card.bottle_status - 1] + '.png'}

    getBaseCardPath(card) {
        if (card.mod_name) {
            return 'https://slay-the-relics-assets.s3.eu-west-2.amazonaws.com/cards/' + this.sanitizeFilename(this.getModName(card)) + '/'
        } else {
            return 'img/cards/basegame/'
        }
    }

    setWidth(target_width) {
        this.scale = target_width / CARD_BASE_WIDTH
    
        const width = CARD_BASE_WIDTH * this.scale + 'rem'
        const height = CARD_BASE_HEIGHT * this.scale + 'rem'
        const font_size = CARD_BASE_FONT_SIZE * this.scale + 'rem'
    
        this.root.style.width = width
        this.root.style.height = height
        this.root.style.fontSize = font_size
    }

    setShadowDrop(is_visible) {
        this.shadow_drop.style.visibility = is_visible ? 'visible' : 'hidden'
    }

    setShadowBlur(is_visible) {
        this.shadow_blur.style.visibility = is_visible ? 'visible' : 'hidden'
    }

    computeFontScaling(text, base_font_size_em, temp_element, max_height_em, min_scaling, verbose) {
        
        let stream_scale = document.body.offsetWidth / 1920
        let scaling = 1.0 + CARD_FONT_SCALING_STEP
        let max_height_px = max_height_em * REM_PX * stream_scale
        let max_width_px = temp_element.offsetWidth
        let height
        let width

        if (verbose)
            console.log('stream scale', stream_scale)

        do {
            scaling -= CARD_FONT_SCALING_STEP

            temp_element.innerHTML = text
            temp_element.style.fontSize = base_font_size_em * scaling + 'rem'
            height = temp_element.offsetHeight
            width = temp_element.scrollWidth

            if (verbose)
                console.log('height', height, 'max height', max_height_px, 'max height em', max_height_em)
        } 
        while ((height > max_height_px || width > max_width_px)&& scaling - CARD_FONT_SCALING_STEP > min_scaling)

        temp_element.innerHTML = ""

        return scaling
    }
}

function colorizeString(str, color_prefix) {
    let split = str.split(' ')
    str = ""
    for (let i = 0; i < split.length; i++) {
        const part = split[i];
        str += color_prefix + part 
        if (i < split.length - 1)
            str += " "
    }
    return str
}





////////////////////////////////////// IMAGE PRELOAD


const PRELOAD_IMAGES = ['img/magGlass2.png', 'img/orbs/orb.png', 'img/orbs/orbDefect.png', 'img/orbs/orbIronclad.png', 'img/orbs/orbTheSilent.png', 'img/orbs/orbWatcher.png', 'img/placeholder.png', 'img/ui/deck.png', 'img/ui/checkbox_upgrade_checked_hover.png', 'img/ui/checkbox_upgrade_hover.png', 'img/ui/btn_next_base.png', 'img/ui/btn_next_hover.png', 'img/ui/btn_prev_base.png', 'img/ui/btn_prev_hover.png', 'img/ui/btn_return_base.png', 'img/ui/btn_return_hover.png', 'img/ui/checkbox_checked.png', 'img/ui/checkbox_unchecked.png', 'img/ui/checkbox_upgrade.png', 'img/ui/checkbox_upgrade_checked.png', 'img/intents/attackBuff.png', 'img/intents/attackDebuff.png', 'img/intents/attackDefend.png', 'img/intents/buff1.png', 'img/intents/debuff1.png', 'img/intents/debuff2.png', 'img/intents/defend.png', 'img/intents/defendBuff.png', 'img/intents/escape.png', 'img/intents/magic.png', 'img/intents/sleep.png', 'img/intents/special.png', 'img/intents/stun.png', 'img/intents/tip/1.png', 'img/intents/tip/2.png', 'img/intents/tip/3.png', 'img/intents/tip/4.png', 'img/intents/tip/5.png', 'img/intents/tip/6.png', 'img/intents/tip/7.png', 'img/intents/unknown.png', 'img/powers/48/accuracy.png', 'img/powers/48/afterImage.png', 'img/powers/48/ai.png', 'img/powers/48/amplify.png', 'img/powers/48/anger.png', 'img/powers/48/armor.png', 'img/powers/48/artifact.png', 'img/powers/48/attackBurn.png', 'img/powers/48/backAttack.png', 'img/powers/48/backAttack2.png', 'img/powers/48/barricade.png', 'img/powers/48/beat.png', 'img/powers/48/berserk.png', 'img/powers/48/bias.png', 'img/powers/48/blur.png', 'img/powers/48/book.png', 'img/powers/48/brutality.png', 'img/powers/48/buffer.png', 'img/powers/48/burst.png', 'img/powers/48/carddraw.png', 'img/powers/48/cExplosion.png', 'img/powers/48/channel.png', 'img/powers/48/choke.png', 'img/powers/48/closeUp.png', 'img/powers/48/combust.png', 'img/powers/48/confusion.png', 'img/powers/48/conserve.png', 'img/powers/48/constricted.png', 'img/powers/48/controlled_change.png', 'img/powers/48/corruption.png', 'img/powers/48/curiosity.png', 'img/powers/48/darkembrace.png', 'img/powers/48/defenseNext.png', 'img/powers/48/demonForm.png', 'img/powers/48/deva.png', 'img/powers/48/deva2.png', 'img/powers/48/devotion.png', 'img/powers/48/dexterity.png', 'img/powers/48/doubleDamage.png', 'img/powers/48/doubleTap.png', 'img/powers/48/draw.png', 'img/powers/48/draw2.png', 'img/powers/48/echo.png', 'img/powers/48/end_turn_death.png', 'img/powers/48/energized_blue.png', 'img/powers/48/energized_green.png', 'img/powers/48/entangle.png', 'img/powers/48/envenom.png', 'img/powers/48/establishment.png', 'img/powers/48/evolve.png', 'img/powers/48/explosive.png', 'img/powers/48/fading.png', 'img/powers/48/fasting.png', 'img/powers/48/firebreathing.png', 'img/powers/48/flameBarrier.png', 'img/powers/48/flex.png', 'img/powers/48/flight.png', 'img/powers/48/focus.png', 'img/powers/48/forcefield.png', 'img/powers/48/frail.png', 'img/powers/48/fumes.png', 'img/powers/48/heartDef.png', 'img/powers/48/heatsink.png', 'img/powers/48/hello.png', 'img/powers/48/hex.png', 'img/powers/48/hymn.png', 'img/powers/48/infiniteBlades.png', 'img/powers/48/infinitegreen.png', 'img/powers/48/int.png', 'img/powers/48/intangible.png', 'img/powers/48/juggernaut.png', 'img/powers/48/lessdraw.png', 'img/powers/48/like_water.png', 'img/powers/48/lockon.png', 'img/powers/48/loop.png', 'img/powers/48/magnet.png', 'img/powers/48/malleable.png', 'img/powers/48/mantra.png', 'img/powers/48/mastery.png', 'img/powers/48/master_protect.png', 'img/powers/48/master_reality.png', 'img/powers/48/master_smite.png', 'img/powers/48/mayhem.png', 'img/powers/48/mental_fortress.png', 'img/powers/48/minion.png', 'img/powers/48/modeShift.png', 'img/powers/48/nightmare.png', 'img/powers/48/nirvana.png', 'img/powers/48/noattack.png', 'img/powers/48/noBlock.png', 'img/powers/48/noDraw.png', 'img/powers/48/noPain.png', 'img/powers/48/no_skill.png', 'img/powers/48/no_stance.png', 'img/powers/48/omega.png', 'img/powers/48/painfulStabs.png', 'img/powers/48/panache.png', 'img/powers/48/path_to_victory.png', 'img/powers/48/penNib.png', 'img/powers/48/phantasmal.png', 'img/powers/48/platedarmor.png', 'img/powers/48/poison.png', 'img/powers/48/pressure_points.png', 'img/powers/48/reactive.png', 'img/powers/48/rebound.png', 'img/powers/48/regen.png', 'img/powers/48/regrow.png', 'img/powers/48/repair.png', 'img/powers/48/retain.png', 'img/powers/48/ritual.png', 'img/powers/48/rupture.png', 'img/powers/48/rushdown.png', 'img/powers/48/sadistic.png', 'img/powers/48/shackle.png', 'img/powers/48/sharpHide.png', 'img/powers/48/shift.png', 'img/powers/48/skillBurn.png', 'img/powers/48/slow.png', 'img/powers/48/split.png', 'img/powers/48/sporeCloud.png', 'img/powers/48/stasis.png', 'img/powers/48/static_discharge.png', 'img/powers/48/storm.png', 'img/powers/48/strength.png', 'img/powers/48/surrounded.png', 'img/powers/48/swivel.png', 'img/powers/48/talk_to_hand.png', 'img/powers/48/the_bomb.png', 'img/powers/48/thievery.png', 'img/powers/48/thorns.png', 'img/powers/48/thousandCuts.png', 'img/powers/48/time.png', 'img/powers/48/tools.png', 'img/powers/48/unawakened.png', 'img/powers/48/vigor.png', 'img/powers/48/vulnerable.png', 'img/powers/48/wave_of_the_hand.png', 'img/powers/48/weak.png', 'img/powers/48/wireheading.png', 'img/powers/48/wraithForm.png', 'img/relics/bottled_flame.png', 'img/relics/bottled_lightning.png', 'img/relics/bottled_tornado.png']


class ImagePreloadQueue {
    constructor(nworkers=3) {
        this.nworkers = nworkers
        this.avaliable_workers = nworkers
        this.load_queue = []
        this.preload_queue = []
        this.img_list = []
        this.loaded = []
        this.not_available = []
    }

    extendPreloadQueue(list) {
        this.preload_queue = this.preload_queue.concat(list)
        this.preloadNext()
    }

    highPriorityLoadImg(url, default_url, onload, ...args) {
        if (!this.load_queue.includes(url)) {
            this.load_queue.unshift({url:url, default_url: default_url, callback:onload, args:args})
            this.preloadNext()
        }
    }

    lowPriorityLoadImg(url, default_url, onload, ...args) {
        if (!this.load_queue.includes(url)) {
            this.load_queue.push({url:url, default_url: default_url, callback:onload, args:args})
            this.preloadNext()
        }
    }

    preloadNext() {
        // console.log('loading next, avail workers ', this.avaliable_workers)
        let this_object = this

        while (this.avaliable_workers > 0) {
            let url
            let callback
            let args
            let default_url

            if (this.load_queue.length > 0) {
                let elem = this.load_queue.shift()
                url = elem.url
                default_url = elem.default_url
                callback = elem.callback
                args = elem.args
            } else if (this.preload_queue.length > 0) {
                url = this.preload_queue.shift()
            }

            // try loading each image only once, then store it as not_available
            if (url && this.not_available.includes(url)) {
                if(default_url && this.not_available.includes(default_url)) {
                    url = null
                } else {
                    url = default_url
                    default_url = null
                }
            }

            if (url) {
                if (this.loaded.includes(url)) {
                    // console.log('already loaded', url)

                    if (callback)
                        callback(url, ...args)
                } else {

                    // console.log('loading', url)

                    this.avaliable_workers -= 1
                    
                    let img = new Image();
                    img.onload = function() {
                        this_object.avaliable_workers += 1
                        let index = this_object.img_list.indexOf(this);
                        if (index !== -1) {
                            // remove image from the array once it's loaded
                            // for memory consumption reasons
                            this_object.img_list.splice(index, 1);
                        }
        
                        // console.log('image loaded ', img.src)
        
                        if (callback)
                            callback(url, ...args)
                        
                        this_object.loaded.push(url)
                        this_object.preloadNext()
                    }
    
                    img.onerror = function() {
                        this_object.avaliable_workers += 1
                        let index = this_object.img_list.indexOf(this);
                        if (index !== -1) {
                            // remove image from the array once it's loaded
                            // for memory consumption reasons
                            this_object.img_list.splice(index, 1);
                        }
                        
                        // if (default_url) {
                        //     console.log('image error', img.src, 'loading default', default_url)
                        // } else {
                        //     console.log('image error', img.src, 'no default')
                        // }

                        this_object.not_available.push(url)
                        this_object.lowPriorityLoadImg(default_url, null, callback, ...args)
                        this_object.preloadNext()
                    }
    
                    this_object.img_list.push(img);
                    img.src = url;
                }
            } else {
                break
            }
        }
    }

    loadBackgroundCallback(url, elem) {
        elem.style.backgroundImage = 'url("' + url + '")'
    }
}

