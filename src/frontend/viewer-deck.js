
var last_deck = ""

const CATEGORY_CARDS = 'cards'


// these are defaults from the base game that are integer encoded, the one from mods get sent by their full name
CARD_TYPE = ['ATTACK', 'SKILL', 'POWER', 'STATUS', 'CURSE']
CARD_RARITY = ['BASIC', 'SPECIAL', 'COMMON', 'UNCOMMON', 'RARE', 'CURSE']
CARD_COLOR = ['RED', 'GREEN', 'BLUE', 'PURPLE', 'COLORLESS', 'CURSE']


const CARD_BASE_WIDTH = 12.361 //rem
const CARD_BASE_HEIGHT = 15.926 //rem
const CARD_BASE_FONT_SIZE = 1 //rem


const CARD_VIEW_SCALE = 0.97
const CARD_VIEW_WIDTH = CARD_BASE_WIDTH * CARD_VIEW_SCALE
const CARD_VIEW_HEIGHT = CARD_BASE_HEIGHT * CARD_VIEW_SCALE
const CARD_VIEW_Y_MARGIN = 0.55 // rem
const CARD_VIEW_X_OFFSET = 13.541 // rem
const CARD_VIEW_Y_OFFSET = 3 // rem

const CARD_HOVER_SCALE = 1.32


const CARD_VIEW_TIPS_X_OFFSET = -0.15 // rem
const CARD_VIEW_TIPS_Y_OFFSET = 0.71 // rem

const DECK_VIEW_SHOW_TIP_STRIP_DELAY = 200


function decompressDeck(deck) {
    deck = decompress(deck)

    // console.log(deck)

    parts = deck.split(";;;")
    
    deck = parseCommaDelimitedIntegerArray(parts[0])
    cards = splitSemicolonDelimited2DArray(parts[1])
    tips = splitSemicolonDelimited2DArray(parts[2])

    // console.log(JSON.stringify([deck, cards, tips]))

    return {deck: deck, cards: cards, tips: tips}
}


function hideDeck() {
    $('#deck_view').css('display', 'none')
}


function initializeDeck() {
    $('#deck_button').click(function (e) {
        $('#deck_view').css('display', 'block')
        console.log('deck button click')
    })

    $('#deck_view_left_bar').click(hideDeck)

    $('#deck_view_right_bar').click(hideDeck)

    $('#deck_view_return_btn').click(hideDeck)


    // $('#deck_view').onclick = function() {
        // $('#deck_view').style.display = 'none'
    // }
}


function clearDeck() {
    const content = document.getElementById('deck_view_content')

    while(content.firstChild)
        content.removeChild(content.lastChild)
}


function setDeck(deck, cards, tips, character) {

    console.log('set deck')

    if (deck == '-')
        return

    if (JSON.stringify([deck, cards, tips]) == last_deck)
        return

    if (current_tooltip_id && current_tooltip_category == CATEGORY_CARDS) {
        current_tooltip_id = null
        current_tooltip_category = null    
    }

    last_deck = JSON.stringify([deck, cards, tips])
    clearDeck()

    console.log('cleared deck')
    console.log(JSON.stringify(deck))
    console.log(JSON.stringify(cards))
    console.log(JSON.stringify(tips))

    const content = document.getElementById('deck_view_content')
    
    // const scale = 0.9
    // card_width = CARD_BASE_WIDTH * scale
    // card_height = CARD_BASE_HEIGHT * scale
    xoffset = CARD_VIEW_WIDTH * (1 - CARD_VIEW_SCALE) / 2
    yoffset = CARD_BASE_HEIGHT * (1 - CARD_VIEW_SCALE) / 2
    // card_width = 12.361 // rem
    // card_height = 15.926 // rem
    ncards_row = 5
    x = xoffset + CARD_VIEW_X_OFFSET
    y = yoffset + CARD_VIEW_Y_OFFSET

    for (let i = 0; i < deck.length; i++) {
        const card = cards[deck[i]];

        // name ; bottleStatus ; cardToPreview ; cardToPreview upgraded ; nameUpgraded ; upgrades ; keyword upgraded ; descriptionUpgraded ; keywords ; cost ; type ; rarity ; color ; description

        console.log(JSON.stringify(card))

        let name = card[0]
        let bottle_status = card[1]
        let card_to_preview = parseInt(card[2])
        let card_to_preview_upgraded = parseInt(card[3])
        let name_upgraded = card[4]
        let upgrades = parseInt(card[5])
        let keyword_ids_upgraded = parseKeywords(card[6])
        let description_upgraded = card[7]
        let keyword_ids = parseKeywords(card[8])
        let cost = parseCost(card[9])
        let type = parseCardType(card[10])
        let rarity = parseCardRarity(card[11])
        let color = parseCardColor(card[12])
        let description = card[13]

        const cardElem = createCardElement(name, type, rarity, color, cost, upgrades, description, character, CARD_VIEW_WIDTH)

        let keywords = arraySubset(tips, keyword_ids)
        let keywords_upgraded = arraySubset(tips, keyword_ids_upgraded)

        hitbox = {
            x: x - xoffset + 'rem',
            y: y - yoffset - CARD_VIEW_Y_MARGIN / 2+ 'rem',
            z: 5,
            w: CARD_BASE_WIDTH + 'rem',
            h: CARD_BASE_HEIGHT + CARD_VIEW_Y_MARGIN + 'rem',
        }

        content.appendChild(cardElem)
        addToCollection(CATEGORY_CARDS, cardElem)
        const strip = createPowerTipStrip(content, hitbox, keywords, CATEGORY_CARDS, character)

        cardElem.style.left = x + 'rem'
        cardElem.style.top = y + 'rem'
        cardElem.id = strip.tips.id + '_card'
        strip.tips.style.zIndex = 5

        // add custom card hitbox handlers
        strip.hitbox.classList.add("mag-glass")
        strip.hitbox.onmouseenter = function(e) {cardMouseEnter(e, strip.tips.id)}
        strip.hitbox.onmouseleave = function(e) {cardMouseExit(e, strip.tips.id)}
        strip.hitbox.onclick = function(e) {cardClick(e, strip.tips.id)}

        // add shadow
        for (powertip of strip.tips.childNodes) {
            powertip.classList.add('powertip-shadow')
        }

        // place tips beside the card
        placeDeckViewTipStrip(cardElem, strip)

        x += CARD_BASE_WIDTH
        if (i % ncards_row == ncards_row - 1) {
            x = xoffset + CARD_VIEW_X_OFFSET
            y += CARD_BASE_HEIGHT + CARD_VIEW_Y_MARGIN
        }
    }

    const footer = document.createElement('div')
    footer.className = 'deck-view-footer'
    footer.style.left = 0
    footer.style.top = y + CARD_BASE_HEIGHT + CARD_VIEW_Y_MARGIN + 'rem'
    content.appendChild(footer)

    addToCollection(CATEGORY_CARDS, footer)
}


function cardClick(e, id) {
    e.stopPropagation()
}


function cardMouseEnter(e, id) {
    const card = document.getElementById(id + '_card')

    let x = parseRem(card.style.left)
    let y = parseRem(card.style.top)

    let xdiff = CARD_VIEW_WIDTH * (CARD_HOVER_SCALE - 1) / 2
    let ydiff = CARD_VIEW_HEIGHT * (CARD_HOVER_SCALE - 1) / 2

    card.style.left = (x - xdiff) + 'rem'
    card.style.top = (y - ydiff) + 'rem'
    card.style.zIndex = 4

    const shadow = card.getElementsByClassName('card-shadow')[0]
    shadow.style.visibility = 'visible'

    setCardWidth(card, CARD_VIEW_WIDTH * CARD_HOVER_SCALE)

    current_tooltip_id = id
    current_tooltip_category = CATEGORY_CARDS

    setTimeout(showTipStrip, DECK_VIEW_SHOW_TIP_STRIP_DELAY, id)
}


function showTipStrip(id) {
    if (current_tooltip_id == id) {
        const tips = document.getElementById(id)
        tips.style.display = 'block'
    }
}


function cardMouseExit(e, id) {

    const tips = document.getElementById(id)
    const card = document.getElementById(id + '_card')

    let x = parseRem(card.style.left)
    let y = parseRem(card.style.top)

    let xdiff = CARD_VIEW_WIDTH * (CARD_HOVER_SCALE - 1) / 2
    let ydiff = CARD_VIEW_HEIGHT * (CARD_HOVER_SCALE - 1) / 2

    card.style.left = (x + xdiff) + 'rem'
    card.style.top = (y + ydiff) + 'rem'
    card.style.zIndex = 1

    const shadow = card.getElementsByClassName('card-shadow')[0]
    shadow.style.visibility = 'hidden'

    setCardWidth(card, CARD_VIEW_WIDTH)

    current_tooltip_id = null
    current_tooltip_category = null

    tips.style.display = 'none'
}


function setCardWidth(card, target_width) {
    const scale = target_width / CARD_BASE_WIDTH

    const width = CARD_BASE_WIDTH * scale + 'rem'
    const height = CARD_BASE_HEIGHT * scale + 'rem'
    const font_size = CARD_BASE_FONT_SIZE * scale + 'rem'

    card.style.width = width
    card.style.height = height
    card.style.fontSize = font_size
}


function createCardElement(name, type, rarity, color, cost, upgrades, description, character, target_width) {

    if (target_width == undefined)
        target_width = CARD_BASE_WIDTH

    const card = document.createElement('div')
    card.classList.add('card')
    setCardWidth(card, target_width)

    const shadow = document.createElement('div')
    shadow.className = 'card-shadow'
    card.appendChild(shadow)

    const bg = document.createElement('div')
    bg.className = 'card-img'
    bg.style.backgroundImage = getBackgroundPath(color, type)
    bg.style.zIndex = -4
    card.appendChild(bg)

    const portrait = document.createElement('div')
    portrait.className = 'card-portrait'
    portrait.style.backgroundImage = getPortraitPath(color, name, upgrades)
    portrait.style.zIndex = -3
    card.appendChild(portrait)

    const frame = document.createElement('div')
    frame.className = 'card-img'
    frame.style.backgroundImage = getFramePath(color, type, rarity)
    frame.style.zIndex = -2
    card.appendChild(frame)
    
    if (cost != null) {
        const energyOrb = document.createElement('div')
        energyOrb.className = 'card-img'
        energyOrb.style.backgroundImage = getEnergyOrbPath(color)
        energyOrb.style.zIndex = -1
        card.appendChild(energyOrb)
        
        const energyCost = document.createElement('div')
        energyCost.className = 'card-cost outline-black'
        energyCost.innerHTML = cost
        energyCost.zIndex = 1
        card.appendChild(energyCost)
    }

    let name_aux = name
    if (upgrades > 0)
        name_aux = colorizeString(name_aux, '#g')
    const title = document.createElement('div')
    title.className = 'card-title'
    title.innerHTML = replaceColorCodes(name_aux)
    card.appendChild(title)

    const desc = document.createElement('div')
    desc.className = 'card-description'
    const descText = document.createElement('span')
    descText.className = 'card-description-text'
    descText.innerHTML = replaceNewLines(replaceManaSymbols(replaceColorCodes(description), character))
    desc.appendChild(descText)
    card.appendChild(desc)

    // console.log(JSON.stringify(keywords))

    return card

    function getBackgroundPath(color, type) {return 'url("img/cards/' + color + '/background_' + type + '.png")'}
    function getFramePath(color, type, rarity) {return 'url("img/cards/' + color + '/frame_' + type + '_' + rarity + '.png")'}
    function getEnergyOrbPath(color) {return 'url("img/cards/' + color + '/energy_orb.png")'}
    function getPortraitPath(color, name, upgrades) {
        if (upgrades > 0)
            name = name.substring(0, name.lastIndexOf('+'))
        name = name.replace(/[\\/:*?"<>|]/g, '_')
        return 'url("img/cards/' + color + '/portraits/' + name + '.png")'
    }
}

function parseCost(cost) {
    if (cost == -2)
        return null
    else if (cost == -1)
        return "X"
    else
        return parseInt(cost)
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

function parseCardType(type) {
    let parsed = parseInt(type)
    return isNaN(parsed) ? type : CARD_TYPE[parsed]
}

function parseCardRarity(rarity) {
    let parsed = parseInt(rarity)
    return isNaN(parsed) ? rarity : CARD_RARITY[parsed]
}

function parseCardColor(color) {
    let parsed = parseInt(color)
    return isNaN(parsed) ? color : CARD_COLOR[parsed]
}

function parseKeywords(keywords) {
    if (keywords == '-')
        return []
    else {
        split = keywords.split(',')
        for (let i = 0; i < split.length; i++) {
            split[i] = parseInt(split[i])      
        }
        return split
    }
}

function placeDeckViewTipStrip(card, strip) {

    let x = parseRem(card.style.left)
    let y = parseRem(card.style.top)

    let xdiff = CARD_VIEW_WIDTH * (CARD_HOVER_SCALE - 1) / 2
    let ydiff = CARD_VIEW_HEIGHT * (CARD_HOVER_SCALE - 1) / 2

    strip.tips.style.top = y - ydiff + CARD_VIEW_TIPS_Y_OFFSET + 'rem'

    if (x < 55) { // card column 1-4
        strip.tips.style.left = x + CARD_VIEW_WIDTH + xdiff + CARD_VIEW_TIPS_X_OFFSET + 'rem'
    } else { // card column 5
        strip.tips.style.left = x - xdiff - CARD_VIEW_TIPS_X_OFFSET - POWERTIP_WIDTH_REM + 'rem'
    }
}