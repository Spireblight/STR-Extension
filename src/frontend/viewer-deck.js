
var last_cards = ""

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


const CARD_HOVER_SCALE = 1.32


function decompressDeck(deck) {
    deck = decompress(deck)

    parts = deck.split(";;;")

    // console.log(deck)

    cards = splitSemicolonDelimited2DArray(parts[0])
    tips = splitSemicolonDelimited2DArray(parts[1])

    return {cards: cards, tips: tips}
}



function initializeDeck() {
    $('#deck_button').click(function (e) {
        $('#deck_view').css('display', 'block')
        console.log('deck button click')
    })

    $('#deck_view').click(function(e) {
        console.log('deck view click')
        $('#deck_view').css('display', 'none')
    })

    $('#deck_view_body').click(function(e) {
        e.stopImmediatePropagation()
        // catch the event on deck view
    })

    // $('#deck_view').onclick = function() {
        // $('#deck_view').style.display = 'none'
    // }
}


function clearDeck() {
    const content = document.getElementById('deck_view_content')

    while(content.firstChild)
        content.removeChild(content.lastChild)
}


function setDeck(cards, tips, character) {

    // console.log('set deck')

    if (JSON.stringify(cards) == last_cards)
        return

    if (current_tooltip_id && current_tooltip_id.startsWith('card'))
        current_tooltip_id = undefined

    last_cards = JSON.stringify(cards)
    clearDeck()

    // console.log('cleared deck')

    // console.log(JSON.stringify(tips))

    const content = document.getElementById('deck_view_content')
    
    // const scale = 0.9
    // card_width = CARD_BASE_WIDTH * scale
    // card_height = CARD_BASE_HEIGHT * scale
    xoffset = CARD_VIEW_WIDTH * (1 - CARD_VIEW_SCALE) / 2
    yoffset = CARD_BASE_HEIGHT * (1 - CARD_VIEW_SCALE) / 2
    // card_width = 12.361 // rem
    // card_height = 15.926 // rem
    ncards_row = 5
    x = xoffset
    y = yoffset

    for (let i = 0; i < cards.length; i++) {
        const card = cards[i];

        let name = card[0]
        let nameUpgraded = card[1]
        let type = parseCardType(card[2])
        let rarity = parseCardRarity(card[3])
        let color = parseCardColor(card[4])
        let cost = parseCost(card[5])
        let upgrades = parseInt(card[6])
        let description = card[7]
        let descriptionUpgraded = card[8]

        const cardElem = createCardElement(name, type, rarity, color, cost, upgrades, description, character, CARD_VIEW_WIDTH)

        let keywordIds = parseKeywords(card[9])
        let keywords = arraySubset(tips, keywordIds)

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
        strip.tips.style.zIndex = 3

        strip.hitbox.classList.add("mag-glass")
        strip.hitbox.onmouseenter = function(e) {cardMouseEnter(e, strip.tips.id)}
        strip.hitbox.onmouseleave = function(e) {cardMouseExit(e, strip.tips.id)}

        x += CARD_BASE_WIDTH
        if (i % ncards_row == ncards_row - 1) {
            x = xoffset
            y += CARD_BASE_HEIGHT + CARD_VIEW_Y_MARGIN
        }
    }
}


function cardMouseEnter(e, id) {
    const tips = document.getElementById(id)
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

    tips.style.display = 'block'
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

    current_tooltip_id = undefined

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

// function placeDeckViewTipStrip()