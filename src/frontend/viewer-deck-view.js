
var last_deck = ""

var deck_view
var deck_button
var deck_button_keybinding_tip

var deck_view_open = false
var deck_view_contents = []
var deck_view_current_hover_index = null

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


function parseCards(cards) {
    array = []
    for (let card of cards) {
        array.push(Card.parseCard(card))
    }
    return array
}


function decompressDeck(deck) {
    deck = decompress(deck)

    // console.log(deck)

    parts = deck.split(";;;")
    
    deck = parseCommaDelimitedIntegerArray(parts[0])
    cards = parseCards(splitSemicolonDelimited2DArray(parts[1]))
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
    setTimeout(function() {deck_view.focus()}, 0)
}


function closeDeckView() {
    $('#deck_view').css('display', 'none')
    deck_view_open = false
    deck_view.blur()
}


function initializeDeck() {
    deck_view = document.getElementById('deck_view')
    deck_view.onkeydown = deckViewKeyDown

    deck_button_keybinding_tip = document.getElementById('deck_button_keybinding_tip')
    deck_button = document.getElementById('deck_button')
    deck_button.onmousedown = clickDeck
    deck_button.onmouseenter = function(e) {deck_button_keybinding_tip.style.display = 'block'}
    deck_button.onmouseleave = function(e) {deck_button_keybinding_tip.style.display = 'none'}

    $('#deck_view_left_bar').mousedown(closeDeckView)

    $('#deck_view_right_bar').mousedown(closeDeckView)

    $('#deck_view_return_btn').click(closeDeckView)


    // $('#deck_view').onclick = function() {
        // $('#deck_view').style.display = 'none'
    // }
}


function deckViewKeyDown(e) {
    if ((e.code == "KeyQ" || e.code == "KeyD") && deck_view_open) {
        closeDeckView()
        e.stopImmediatePropagation()
    }
}


function setDeck(deck, cards, tips, character) {

    if (deck == '-') {
        deck_button.style.display = 'none'
        clearCollection(CATEGORY_CARDS)
        closeDeckView()
        deck_view_current_hover_index = null
        return   
    }

    deck_button.style.display = 'block'

    // if (JSON.stringify([deck, cards, tips]) == last_deck)
    //     return

    // last_deck = JSON.stringify([deck, cards, tips])
    deck_view_current_hover_index = null
    clearCollection(CATEGORY_CARDS)
    deck_view_contents = []

    const content = document.getElementById('deck_view_content')
    
    xoffset = DECK_VIEW_CARD_WIDTH * (1 - DECK_VIEW_CARD_SCALE) / 2
    yoffset = CARD_BASE_HEIGHT * (1 - DECK_VIEW_CARD_SCALE) / 2
    ncards_row = 5
    x = xoffset + DECK_VIEW_X_OFFSET
    y = yoffset + DECK_VIEW_Y_OFFSET

    for (let i = 0; i < deck.length; i++) {
        const card = cards[deck[i]];

        const cardElem = new CardElement(card, character, DECK_VIEW_CARD_WIDTH)

        let keywords = arraySubset(tips, card.keyword_ids)

        hitbox = {
            x: x - xoffset + 'rem',
            y: y - yoffset - DECK_VIEW_Y_MARGIN / 2+ 'rem',
            z: 5,
            w: CARD_BASE_WIDTH + 'rem',
            h: CARD_BASE_HEIGHT + DECK_VIEW_Y_MARGIN + 'rem',
        }

        appendChild(content, cardElem)
        addToCollection(CATEGORY_CARDS, cardElem)
        const strip = new PowerTipStrip(content, hitbox, keywords, CATEGORY_CARDS, character)

        cardElem.root.style.left = x + 'rem'
        cardElem.root.style.top = y + 'rem'
        cardElem.root.id = strip.tipsElem.id + '_card'
        strip.tipsElem.style.zIndex = 5

        let j = i
        // add custom card hitbox handlers
        strip.hitboxElem.setMagnifyingGlassCursor()
        strip.hitboxElem.root.onmouseenter = function(e) {cardMouseEnter(e, j)}
        strip.hitboxElem.root.onmouseleave = function(e) {cardMouseExit(e, j)}
        strip.hitboxElem.root.onclick = function(e) {cardClick(e, j)}

        // add shadow to tips
        for (powertip of strip.tipsElem.childNodes) {
            powertip.classList.add('powertip-shadow')
        }

        // place tips beside the card
        placeDeckViewTipStrip(cardElem, strip)

        // place preview beside the card if it exists
        let cardPreviewElem = null
        if (card.card_to_preview != -1) {

            const cardPreview = cards[card.card_to_preview]

            cardPreviewElem = new CardElement(cardPreview, character, DECK_VIEW_CARD_PREVIEW_WIDTH)
            cardPreviewElem.root.style.display = 'none'
            cardPreviewElem.root.style.zIndex = 5

            cardPreviewElem.setShadowDrop(true)

            placeCardPreview(cardElem, cardPreviewElem)

            appendChild(content, cardPreviewElem)
            addToCollection(CATEGORY_CARDS, cardPreviewElem)
        }

        x += CARD_BASE_WIDTH
        if (i % ncards_row == ncards_row - 1) {
            x = xoffset + DECK_VIEW_X_OFFSET
            y += CARD_BASE_HEIGHT + DECK_VIEW_Y_MARGIN
        }

        deck_view_contents.push({cardElem: cardElem, tipsElem: strip.tipsElem, cardPreviewElem: cardPreviewElem})
    }

    const footer = document.createElement('div')
    footer.className = 'deck-view-footer'
    footer.style.left = 0
    footer.style.top = y + CARD_BASE_HEIGHT + DECK_VIEW_Y_MARGIN + 'rem'
    appendChild(content, footer)

    addToCollection(CATEGORY_CARDS, footer)
}


function cardClick(e, index) {
    openCardView(index)
    e.stopPropagation()
}


function cardMouseEnter(e, index) {
    deck_view_current_hover_index = index

    const card = deck_view_contents[index].cardElem

    let x = parseRem(card.root.style.left)
    let y = parseRem(card.root.style.top)

    let xdiff = DECK_VIEW_CARD_WIDTH * (CARD_HOVER_SCALE - 1) / 2
    let ydiff = DECK_VIEW_CARD_HEIGHT * (CARD_HOVER_SCALE - 1) / 2

    card.root.style.left = (x - xdiff) + 'rem'
    card.root.style.top = (y - ydiff) + 'rem'
    card.root.style.zIndex = 4

    card.setShadowDrop(true)
    card.setShadowBlur(true)
    card.setWidth(DECK_VIEW_CARD_WIDTH * CARD_HOVER_SCALE)

    setTimeout(showCardTipStripAndPreview, DECK_VIEW_SHOW_TIP_STRIP_DELAY, index)
}

function showCardTipStripAndPreview(index) {
    if (deck_view_current_hover_index == index) {
        const tips = deck_view_contents[index].tipsElem
        tips.style.display = 'block'

        const preview = deck_view_contents[index].previewElem
        if(preview) {
            preview.style.display = 'block'
        }
    }
}


function cardMouseExit(e, index) {

    if (deck_view_current_hover_index == index) {
        deck_view_current_hover_index = null
    }

    const tips = deck_view_contents[index].tipsElem
    const card = deck_view_contents[index].cardElem
    const preview = deck_view_contents[index].previewElem

    let x = parseRem(card.root.style.left)
    let y = parseRem(card.root.style.top)

    let xdiff = DECK_VIEW_CARD_WIDTH * (CARD_HOVER_SCALE - 1) / 2
    let ydiff = DECK_VIEW_CARD_HEIGHT * (CARD_HOVER_SCALE - 1) / 2

    card.root.style.left = (x + xdiff) + 'rem'
    card.root.style.top = (y + ydiff) + 'rem'
    card.root.style.zIndex = 1

    card.setShadowDrop(false)
    card.setShadowBlur(false)
    card.setWidth(DECK_VIEW_CARD_WIDTH)

    tips.style.display = 'none'

    if(preview) {
        preview.style.display = 'none'
    }
}

function placeDeckViewTipStrip(cardElem, strip) {

    let x = parseRem(cardElem.root.style.left)
    let y = parseRem(cardElem.root.style.top)

    let xdiff = DECK_VIEW_CARD_WIDTH * (CARD_HOVER_SCALE - 1) / 2
    let ydiff = DECK_VIEW_CARD_HEIGHT * (CARD_HOVER_SCALE - 1) / 2

    strip.tipsElem.style.top = y - ydiff + CARD_TIPS_Y_OFFSET + 'rem'

    if (x < 55) { // card column 1-4
        strip.tipsElem.style.left = x + DECK_VIEW_CARD_WIDTH + xdiff + CARD_TIPS_X_OFFSET + 'rem'
    } else { // card column 5
        strip.tipsElem.style.left = x - xdiff - CARD_TIPS_X_OFFSET - POWERTIP_WIDTH_REM + 'rem'
    }
}

function placeCardPreview(cardElem, cardPreviewElem) {
    let x = parseRem(cardElem.root.style.left)
    let y = parseRem(cardElem.root.style.top)

    let xdiff = DECK_VIEW_CARD_WIDTH * (CARD_HOVER_SCALE - 1) / 2
    let ydiff = DECK_VIEW_CARD_HEIGHT * (CARD_HOVER_SCALE - 1) / 2

    cardPreviewElem.root.style.top = y - ydiff + DECK_VIEW_CARD_PREVIEW_Y_OFFSET + 'rem'

    if (x > 55) { // card column 1-4
        cardPreviewElem.root.style.left = x + DECK_VIEW_CARD_WIDTH + xdiff + DECK_VIEW_CARD_PREVIEW_X_OFFSET + 'rem'
    } else { // card column 5
        cardPreviewElem.root.style.left = x - xdiff - DECK_VIEW_CARD_PREVIEW_X_OFFSET - DECK_VIEW_CARD_PREVIEW_WIDTH + 'rem'
    }
}