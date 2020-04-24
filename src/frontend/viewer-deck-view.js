
var last_deck = ""

var deck_view_open = false

const CATEGORY_CARDS = 'cards'

const DECK_VIEW_CARD_SCALE = 0.97
const DECK_VIEW_CARD_WIDTH = CARD_BASE_WIDTH * DECK_VIEW_CARD_SCALE
const DECK_VIEW_CARD_HEIGHT = CARD_BASE_HEIGHT * DECK_VIEW_CARD_SCALE
const DECK_VIEW_Y_MARGIN = 0.55 // rem
const DECK_VIEW_X_OFFSET = 13.541 // rem
const DECK_VIEW_Y_OFFSET = 3 // rem

const CARD_HOVER_SCALE = 1.32

const CARD_TIPS_X_OFFSET = -0.15 // rem
const CARD_TIPS_Y_OFFSET = 0.71 // rem

const DECK_VIEW_SHOW_TIP_STRIP_DELAY = 200

const DECK_VIEW_CARD_PREVIEW_SCALE = 0.95
const DECK_VIEW_CARD_PREVIEW_WIDTH = CARD_BASE_WIDTH * DECK_VIEW_CARD_PREVIEW_SCALE
const DECK_VIEW_CARD_PREVIEW_X_OFFSET = -0.8 // rem
const DECK_VIEW_CARD_PREVIEW_Y_OFFSET = 0.15


var deck_button


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


function clickDeck() {
    if (deck_view_open) {
        closeDeckView()
    } else {
        openDeckView()
    }
}


function openDeckView() {
    $('#deck_view').css('display', 'block')
    deck_view_open = true
}


function closeDeckView() {
    $('#deck_view').css('display', 'none')
    deck_view_open = false
}


function initializeDeck() {
    deck_button = document.getElementById('deck_button')
    deck_button.onmousedown = clickDeck

    $('#deck_view_left_bar').mousedown(closeDeckView)

    $('#deck_view_right_bar').mousedown(closeDeckView)

    $('#deck_view_return_btn').click(closeDeckView)


    // $('#deck_view').onclick = function() {
        // $('#deck_view').style.display = 'none'
    // }
}


// function clearDeck() {
//     const content = document.getElementById('deck_view_content')

//     while(content.firstChild)
//         content.removeChild(content.lastChild)
// }


function setDeck(deck, cards, tips, character) {

    if (deck == '-') {
        deck_button.style.display = 'none'
        clearCollection(CATEGORY_CARDS)
        closeDeckView()
        // clearDeck()
        return   
    }

    deck_button.style.display = 'block'

    // if (JSON.stringify([deck, cards, tips]) == last_deck)
    //     return

    if (current_tooltip_id && current_tooltip_category == CATEGORY_CARDS) {
        current_tooltip_id = null
        current_tooltip_category = null    
    }

    // last_deck = JSON.stringify([deck, cards, tips])
    // clearDeck()
    // printCollection(CATEGORY_CARDS)
    clearCollection(CATEGORY_CARDS)

    const content = document.getElementById('deck_view_content')
    
    // const scale = 0.9
    // card_width = CARD_BASE_WIDTH * scale
    // card_height = CARD_BASE_HEIGHT * scale
    xoffset = DECK_VIEW_CARD_WIDTH * (1 - DECK_VIEW_CARD_SCALE) / 2
    yoffset = CARD_BASE_HEIGHT * (1 - DECK_VIEW_CARD_SCALE) / 2
    // card_width = 12.361 // rem
    // card_height = 15.926 // rem
    ncards_row = 5
    x = xoffset + DECK_VIEW_X_OFFSET
    y = yoffset + DECK_VIEW_Y_OFFSET

    for (let i = 0; i < deck.length; i++) {
        const card = cards[deck[i]];

        // name ; bottleStatus ; cardToPreview ; cardToPreview upgraded ; nameUpgraded ; upgrades ; keyword upgraded ; descriptionUpgraded ; keywords ; cost ; cost upgraded ; type ; rarity ; color ; description

        // console.log(JSON.stringify(card))

        let name = card[0]
        let bottle_status = card[1]
        let card_to_preview = parseInt(card[2])
        let upgrades = parseInt(card[5])
        let keyword_ids = parseKeywords(card[8])
        let cost = parseCost(card[9])
        let type = parseCardType(card[11])
        let rarity = parseCardRarity(card[12])
        let color = parseCardColor(card[13])
        let description = card[14]

        const cardElem = createCardElement(name, type, rarity, color, cost, upgrades, description, character, DECK_VIEW_CARD_WIDTH)

        let keywords = arraySubset(tips, keyword_ids)

        hitbox = {
            x: x - xoffset + 'rem',
            y: y - yoffset - DECK_VIEW_Y_MARGIN / 2+ 'rem',
            z: 5,
            w: CARD_BASE_WIDTH + 'rem',
            h: CARD_BASE_HEIGHT + DECK_VIEW_Y_MARGIN + 'rem',
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

        let k = i
        strip.hitbox.onclick = function(e) {cardClick(e, k)}

        // add shadow to tips
        for (powertip of strip.tips.childNodes) {
            powertip.classList.add('powertip-shadow')
        }

        // place tips beside the card
        placeDeckViewTipStrip(cardElem, strip)

        // place preview beside the card if it exists
        if (card_to_preview != -1) {

            const cardPreview = cards[card_to_preview]

            let namePreview = cardPreview[0]
            let upgradesPreview = parseInt(cardPreview[5])
            let costPreview = parseCost(cardPreview[9])
            let typePreview = parseCardType(cardPreview[11])
            let rarityPreview = parseCardRarity(cardPreview[12])
            let colorPreview = parseCardColor(cardPreview[13])
            let descriptionPreview = cardPreview[14]

            cardPreviewElem = createCardElement(namePreview, typePreview, rarityPreview, colorPreview, costPreview, upgradesPreview, descriptionPreview, character, DECK_VIEW_CARD_PREVIEW_WIDTH)
            cardPreviewElem.id = strip.tips.id + '_preview'
            cardPreviewElem.style.display = 'none'
            cardPreviewElem.style.zIndex = 5

            cardPreviewElem.getElementsByClassName('card-shadow-drop')[0].style.visibility = 'visible'

            placeCardPreview(cardElem, cardPreviewElem)

            content.appendChild(cardPreviewElem)
            addToCollection(CATEGORY_CARDS, cardPreviewElem)
        }

        // display correct bottle if it exists
        if (bottle_status > 0) {
            cardElem.getElementsByClassName('card-bottle')[0].style.backgroundImage = 'url(img/relics/' + BOTTLE_RELICS[bottle_status - 1] + '.png)'
        }

        x += CARD_BASE_WIDTH
        if (i % ncards_row == ncards_row - 1) {
            x = xoffset + DECK_VIEW_X_OFFSET
            y += CARD_BASE_HEIGHT + DECK_VIEW_Y_MARGIN
        }
    }

    const footer = document.createElement('div')
    footer.className = 'deck-view-footer'
    footer.style.left = 0
    footer.style.top = y + CARD_BASE_HEIGHT + DECK_VIEW_Y_MARGIN + 'rem'
    content.appendChild(footer)

    addToCollection(CATEGORY_CARDS, footer)
}


function cardClick(e, index) {
    openCardView(index)
    e.stopPropagation()
}


function cardMouseEnter(e, id) {
    const card = document.getElementById(id + '_card')

    let x = parseRem(card.style.left)
    let y = parseRem(card.style.top)

    let xdiff = DECK_VIEW_CARD_WIDTH * (CARD_HOVER_SCALE - 1) / 2
    let ydiff = DECK_VIEW_CARD_HEIGHT * (CARD_HOVER_SCALE - 1) / 2

    card.style.left = (x - xdiff) + 'rem'
    card.style.top = (y - ydiff) + 'rem'
    card.style.zIndex = 4

    const shadow_drop = card.getElementsByClassName('card-shadow-drop')[0]
    const shadow_blur = card.getElementsByClassName('card-shadow-blur')[0]
    shadow_drop.style.visibility = 'visible'
    shadow_blur.style.visibility = 'visible'

    setCardWidth(card, DECK_VIEW_CARD_WIDTH * CARD_HOVER_SCALE)

    current_tooltip_id = id
    current_tooltip_category = CATEGORY_CARDS

    setTimeout(showTipStripAndPreview, DECK_VIEW_SHOW_TIP_STRIP_DELAY, id)
}


function showTipStripAndPreview(id) {
    if (current_tooltip_id == id) {
        const tips = document.getElementById(id)
        tips.style.display = 'block'

        const preview = document.getElementById(id + '_preview')
        if(preview) {
            preview.style.display = 'block'
        }
    }
}


function cardMouseExit(e, id) {

    const tips = document.getElementById(id)
    const card = document.getElementById(id + '_card')
    const preview = document.getElementById(id + '_preview')

    let x = parseRem(card.style.left)
    let y = parseRem(card.style.top)

    let xdiff = DECK_VIEW_CARD_WIDTH * (CARD_HOVER_SCALE - 1) / 2
    let ydiff = DECK_VIEW_CARD_HEIGHT * (CARD_HOVER_SCALE - 1) / 2

    card.style.left = (x + xdiff) + 'rem'
    card.style.top = (y + ydiff) + 'rem'
    card.style.zIndex = 1

    const shadow_drop = card.getElementsByClassName('card-shadow-drop')[0]
    const shadow_blur = card.getElementsByClassName('card-shadow-blur')[0]
    shadow_drop.style.visibility = 'hidden'
    shadow_blur.style.visibility = 'hidden'

    setCardWidth(card, DECK_VIEW_CARD_WIDTH)

    current_tooltip_id = null
    current_tooltip_category = null

    tips.style.display = 'none'

    if(preview) {
        preview.style.display = 'none'
    }
}

function placeDeckViewTipStrip(card, strip) {

    let x = parseRem(card.style.left)
    let y = parseRem(card.style.top)

    let xdiff = DECK_VIEW_CARD_WIDTH * (CARD_HOVER_SCALE - 1) / 2
    let ydiff = DECK_VIEW_CARD_HEIGHT * (CARD_HOVER_SCALE - 1) / 2

    strip.tips.style.top = y - ydiff + CARD_TIPS_Y_OFFSET + 'rem'

    if (x < 55) { // card column 1-4
        strip.tips.style.left = x + DECK_VIEW_CARD_WIDTH + xdiff + CARD_TIPS_X_OFFSET + 'rem'
    } else { // card column 5
        strip.tips.style.left = x - xdiff - CARD_TIPS_X_OFFSET - POWERTIP_WIDTH_REM + 'rem'
    }
}

function placeCardPreview(card, cardPreview) {
    let x = parseRem(card.style.left)
    let y = parseRem(card.style.top)

    let xdiff = DECK_VIEW_CARD_WIDTH * (CARD_HOVER_SCALE - 1) / 2
    let ydiff = DECK_VIEW_CARD_HEIGHT * (CARD_HOVER_SCALE - 1) / 2

    cardPreview.style.top = y - ydiff + DECK_VIEW_CARD_PREVIEW_Y_OFFSET + 'rem'

    if (x > 55) { // card column 1-4
        cardPreview.style.left = x + DECK_VIEW_CARD_WIDTH + xdiff + DECK_VIEW_CARD_PREVIEW_X_OFFSET + 'rem'
    } else { // card column 5
        cardPreview.style.left = x - xdiff - DECK_VIEW_CARD_PREVIEW_X_OFFSET - DECK_VIEW_CARD_PREVIEW_WIDTH + 'rem'
    }
}