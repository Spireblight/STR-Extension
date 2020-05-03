
var card_view_open = false

var card_view
var card_view_tips_box
var card_upgrade_checkbox
var card_view_prev_btn
var card_view_next_btn
var placeholder

var card_upgrade_checked = false

var view_cards = []
var view_cards_upgraded = []


var current_card_view_id = null
var current_card_index = null


const CATEGORY_CARD_VIEW = 'card_view'

const CARD_VIEW_CARD_WIDTH = 31.388 //rem


function initializeCardView() {
    card_view = document.getElementById('card_view')
    card_view_tips_box = document.getElementById('card_view_tips_box')
    card_upgrade_checkbox = document.getElementById('card_view_checkbox')

    card_view_prev_btn = document.getElementById('card_view_prev_btn')
    card_view_next_btn = document.getElementById('card_view_next_btn')

    placeholder = new PlaceholderElement()

    card_view.onclick = closeCardView
    card_view.onkeydown = cardViewKeyDown

    card_view_prev_btn.onclick = previousCard
    card_view_next_btn.onclick = nextCard
    card_upgrade_checkbox.onclick = clickUpgradeCheckbox

    card_view_prev_btn.onkeydown = cardViewKeyDown
    card_view_next_btn.onkeydown = cardViewKeyDown
    card_upgrade_checkbox.onkeydown = cardViewKeyDown
    // card_view_prev_btn.onclick = function(e) {e.stopImmediatePropagation()}
    // card_view_nect_btn.onclick = function(e) {e.stopImmediatePropagation()}
    // card_upgrade_checkbox.onclick = function(e) {e.stopImmediatePropagation()}

}

function cardViewKeyDown(e) {
    // console.log('key down pressed ' + e.code)

    e.stopImmediatePropagation()

    if ((e.code == "ArrowLeft" || e.code == "KeyA") && current_card_index > 0) {
        previousCard(e)
    }

    if ((e.code == "ArrowRight" || e.code == "KeyD") && current_card_index < view_cards.length - 1) {
        nextCard(e)
    }

    if (e.code == "KeyQ") {
        closeCardView()
    }

    if (e.code == "KeyU") {
        clickUpgradeCheckbox(e)
    }
}


function clickUpgradeCheckbox(e) {
    e.stopImmediatePropagation()

    card_upgrade_checked = !card_upgrade_checked

    updateUpgradeCheckbox()
    showCard(current_card_index)
}


function updateUpgradeCheckbox() {
    if (!card_upgrade_checked) {
        card_upgrade_checkbox.classList.remove('card-view-checkbox-checked')
        card_upgrade_checkbox.classList.add('card-view-checkbox-unchecked')
    } else {
        card_upgrade_checkbox.classList.remove('card-view-checkbox-unchecked')
        card_upgrade_checkbox.classList.add('card-view-checkbox-checked')
    }
}


function resetCards(new_len) {
    view_cards = []
    view_cards_upgraded = []

    for (let i = 0; i < new_len; i++) {
        view_cards.push(null)
        view_cards_upgraded.push(null)
    }
}


function printCollection(category) {
    if (category in collections) {
        console.log('category ' + category)
        for (let i = 0; i < collections[category].length; i++) {
            const element = collections[category][i];

            console.log('element ', element)
            console.log('parent ', element.parentNode)
        }
    } else {
        console.log('category ' + category + ' not in collections')
    }
}


function setCardView(deck, cards, tips, character) {

    clearCollection(CATEGORY_CARD_VIEW)
    resetCards()

    let bunch_size = 5
    let bunch = []

    for (let i = 0; i < deck.length; i++) {

        bunch.push([i])

        if (bunch.length == bunch_size || i == deck.length - 1) {
            setTimeout(function(bunch, deck, cards, tips, character) {
                for (let i = 0; i < bunch.length; i++) {
                    const args = bunch[i];

                    addCard(args[0], deck, cards, tips, character)
                }
            }, 0, bunch, deck, cards, tips, character)
            bunch = []
        }
    }

    displayAfterUpdate()
}


function addCard(index, deck, cards, tips, character) {
    let card = cards[deck[index]]

    view_cards[index] = createCardView(card, cards, tips, character)

    if (card.upgraded_version != null) {
        view_cards_upgraded[index] = createCardView(card.upgraded_version, cards, tips, character)
    } else {
        view_cards_upgraded[index] = null
    }
}


function createCardView(card, cards, tips, character) {

    const cardElem = new CardElement(card, character, CARD_VIEW_CARD_WIDTH, true, true, false, true)

    hitbox = {
        x: '0.1rem',
        y: '0.1rem',
        z: 0,
        w: '0.1rem',
        h: '0.1rem',
    }

    appendChild(card_view, cardElem)
    addToCollection(CATEGORY_CARD_VIEW, cardElem)

    let keywords = arraySubset(tips, card.keyword_ids)

    const strip = new PowerTipStrip(card_view_tips_box, hitbox, keywords, CATEGORY_CARD_VIEW, character)

    cardElem.root.style.left = '32.343%'
    cardElem.root.style.top = '7.537%'
    cardElem.root.style.display = 'none'
    cardElem.root.onclick = function (e) {e.stopPropagation()}

    strip.tipsElem.style.zIndex = 5
    // strip.tipsElem.style.display = 'none'
    strip.tipsElem.style.left = '0%'
    strip.tipsElem.style.top = '0%'

    let cardPreviewElem
    // place preview beside the card if it exists
    if (card.card_to_preview != -1) {
        const cardPreview = cards[card.card_to_preview]

        cardPreviewElem = new CardElement(cardPreview, character, DECK_VIEW_CARD_PREVIEW_WIDTH)
        cardPreviewElem.root.style.display = 'none'
        cardPreviewElem.root.style.zIndex = 5
        cardPreviewElem.root.style.left = '19.029%'
        cardPreviewElem.root.style.top = '9.122%'

        appendChild(card_view, cardPreviewElem)
        addToCollection(CATEGORY_CARD_VIEW, cardPreviewElem)
    } else {
        cardPreviewElem = placeholder
    }

    let modNameTipElem
    if (card.mod_name != null) {
        modNameTipElem = new PowerTipElement('What mod is this from?', card.mod_name)

        modNameTipElem.root.style.display = 'none'
        modNameTipElem.root.style.zIndex = 5
        modNameTipElem.root.classList.add('card-view-what-mod-tip')

        appendChild(card_view, modNameTipElem)
        addToCollection(CATEGORY_CARD_VIEW, modNameTipElem)
    } else {
        modNameTipElem = placeholder
    }

    return {cardElem: cardElem, tipsElem: strip.tipsElem, cardPreviewElem: cardPreviewElem, modNameTipElem: modNameTipElem}
}


function displayAfterUpdate() {
    if (card_view_open) {
        if (current_card_index < view_cards.length) {
            showCard(current_card_index)
        } else if (view_cards.length > 0) {
            showCard(view_cards.length - 1)
        } else {
            closeCardView()
        }
    }
}

const BTN_ANIMATION_TIMEOUT = 50
function previousCardBtnAnimation() {
    card_view_prev_btn.classList.remove('card-view-prev-btn-pressed1')
    card_view_prev_btn.classList.remove('card-view-prev-btn-pressed2')
    card_view_prev_btn.classList.add('card-view-prev-btn-pressed1')
    setTimeout(function() {
        card_view_prev_btn.classList.remove('card-view-prev-btn-pressed1')
        card_view_prev_btn.classList.add('card-view-prev-btn-pressed2')

        setTimeout(function() {
            card_view_prev_btn.classList.remove('card-view-prev-btn-pressed2')
        }, BTN_ANIMATION_TIMEOUT)
    }, BTN_ANIMATION_TIMEOUT)
}

function nextCardBtnAnimation() {
    card_view_next_btn.classList.remove('card-view-next-btn-pressed1')
    card_view_next_btn.classList.remove('card-view-next-btn-pressed2')
    card_view_next_btn.classList.add('card-view-next-btn-pressed1')
    setTimeout(function() {
        card_view_next_btn.classList.remove('card-view-next-btn-pressed1')
        card_view_next_btn.classList.add('card-view-next-btn-pressed2')

        setTimeout(function() {
            card_view_next_btn.classList.remove('card-view-next-btn-pressed2')
        }, BTN_ANIMATION_TIMEOUT)
    }, BTN_ANIMATION_TIMEOUT)
}

function previousCard(e) {
    e.stopImmediatePropagation()
    showCard(current_card_index - 1)
    previousCardBtnAnimation()
}

function nextCard(e) {
    e.stopImmediatePropagation()
    showCard(current_card_index + 1)
    nextCardBtnAnimation()
}

function openCardView(index) {

    setTimeout(function () {card_view.focus()}, 0)
    card_upgrade_checked = false
    card_view_open = true

    card_view.style.display = 'block'

    updateUpgradeCheckbox()
    showCard(index)
}

function showCard(index) {
    
    let card
    if (card_upgrade_checked && view_cards_upgraded[index] != null) {
        card = view_cards_upgraded[index]
    } else {
        card = view_cards[index]
    }

    hideCurrentCard()

    card.cardElem.root.style.display = 'block';
    card.tipsElem.style.display = 'block';
    card.cardPreviewElem.root.style.display = 'block';
    card.modNameTipElem.root.style.display = 'block';

    if (view_cards_upgraded[index] == null)
        card_upgrade_checkbox.style.display = 'none'
    else
        card_upgrade_checkbox.style.display = 'block'

    if (index == 0) {
        card_view_prev_btn.style.display = 'none'
    } else {
        card_view_prev_btn.style.display = 'block'
    }

    if (index == view_cards.length - 1) {
        card_view_next_btn.style.display = 'none'
    } else {
        card_view_next_btn.style.display = 'block'
    }

    current_card_index = index
}


function hideCurrentCard() {

    if (current_card_index == null || current_card_index >= view_cards.length)
        return

    let card = view_cards[current_card_index]

    card.cardElem.root.style.display = 'none';
    card.tipsElem.style.display = 'none';
    card.cardPreviewElem.root.style.display = 'none';
    card.modNameTipElem.root.style.display = 'none';

    card = view_cards_upgraded[current_card_index]
    if (card != null) {
        card.cardElem.root.style.display = 'none';
        card.tipsElem.style.display = 'none';
        card.cardPreviewElem.root.style.display = 'none';
        card.modNameTipElem.root.style.display = 'none';
    }

    current_card_index = null
}


function closeCardView() {
    card_view.style.display = 'none'
    card_view_open = true
    card_view.blur()
    setTimeout(function() {deck_view.focus()}, 0)
}