
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


function initializeCardView() {
    card_view = document.getElementById('card_view')
    card_view_tips_box = document.getElementById('card_view_tips_box')
    card_upgrade_checkbox = document.getElementById('card_view_checkbox')

    card_view_prev_btn = document.getElementById('card_view_prev_btn')
    card_view_next_btn = document.getElementById('card_view_next_btn')

    placeholder = document.getElementById('placeholder')

    card_view.onclick = closeCardView

    card_view_prev_btn.onclick = previousCard
    card_view_next_btn.onclick = nextCard
    card_upgrade_checkbox.onclick = clickUpgradeCheckbox
    // card_view_prev_btn.onclick = function(e) {e.stopImmediatePropagation()}
    // card_view_nect_btn.onclick = function(e) {e.stopImmediatePropagation()}
    // card_upgrade_checkbox.onclick = function(e) {e.stopImmediatePropagation()}

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


function clearCards() {
    view_cards = []
    view_cards_upgraded = []
}


function parseUpgradedName(name, upgName) {
    if (upgName == 'null')
        return null

    if (upgName == '_')
        return name

    if (upgName == '+')
        return name + '+'

    return upgName
}


function parseUpgradedDesc(desc, upgDesc) {
    if (upgDesc == '-')
        return null

    if (upgDesc == '_')
        return desc

    return upgDesc
}


function parseUpgradedKeywords(keywords, keywordsUpg) {
    if (keywordsUpg == '_')
        return parseKeywords(keywords)
    
    return parseKeywords(keywordsUpg)
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
    clearCards()

    for (let i = 0; i < deck.length; i++) {
        const card = cards[deck[i]];
        
        addCard(card, cards, tips, character)
    }

    displayAfterUpdate()
}


function addCard(card, cards, tips, character) {

    let name = card[0]
    let card_to_preview = parseInt(card[2])
    let card_to_preview_upgraded = parseInt(card[3])
    let name_upgraded = parseUpgradedName(name, card[4])
    let upgrades = parseInt(card[5])

    let keyword_ids_upgraded = parseUpgradedKeywords(card[8], card[6])
    let description_upgraded = parseUpgradedDesc(card[14], card[7])
    let keyword_ids = parseKeywords(card[8])
    let cost = parseCost(card[9])
    let cost_upgraded = parseCost(card[10])
    let type = parseCardType(card[11])
    let rarity = parseCardRarity(card[12])
    let color = parseCardColor(card[13])
    let description = card[14]

    let keywords = arraySubset(tips, keyword_ids)
    let keywords_upgraded = arraySubset(tips, keyword_ids_upgraded)

    createCardView(view_cards, name, cost, type, rarity, color, description, keywords, card_to_preview, upgrades, character, cards)

    if (name_upgraded != null) {
        createCardView(view_cards_upgraded, name_upgraded, cost_upgraded, type, rarity, color, description_upgraded, keywords_upgraded, card_to_preview_upgraded, upgrades+1, character, cards)
    } else {
        view_cards_upgraded.push(null)
    }
}


function createCardView(array, name, cost, type, rarity, color, description, keywords, card_to_preview, upgrades, character, cards) {

    const cardElem = createCardElement(name, type, rarity, color, cost, upgrades, description, character, 31.388)

    hitbox = {
        x: '0.1rem',
        y: '0.1rem',
        z: 0,
        w: '0.1rem',
        h: '0.1rem',
    }

    card_view.appendChild(cardElem)
    addToCollection(CATEGORY_CARD_VIEW, cardElem)

    const strip = createPowerTipStrip(card_view_tips_box, hitbox, keywords, CATEGORY_CARD_VIEW, character)

    cardElem.style.left = '32.343%'
    cardElem.style.top = '9.537%'
    cardElem.style.display = 'none'
    cardElem.onclick = function (e) {e.stopPropagation()}

    strip.tips.style.zIndex = 5
    // strip.tips.style.display = 'none'
    strip.tips.style.left = '0%'
    strip.tips.style.top = '0%'

    let cardPreviewElem
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
        cardPreviewElem.style.display = 'none'
        cardPreviewElem.style.zIndex = 5
        cardPreviewElem.style.left = '18.229%'
        cardPreviewElem.style.top = '9.722%'

        card_view.appendChild(cardPreviewElem)
        addToCollection(CATEGORY_CARD_VIEW, cardPreviewElem)
    } else {
        cardPreviewElem = placeholder
    }

    array.push([cardElem, strip.tips, cardPreviewElem])
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


function previousCard(e) {
    e.stopImmediatePropagation()
    showCard(current_card_index - 1)
}


function nextCard(e) {
    e.stopImmediatePropagation()
    showCard(current_card_index + 1)
}


function openCardView(index) {

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

    card[0].style.display = 'block';
    card[1].style.display = 'block';
    card[2].style.display = 'block';

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

    card[0].style.display = 'none';
    card[1].style.display = 'none';
    card[2].style.display = 'none';
    card = view_cards_upgraded[current_card_index]
    if (card != null) {
        card[0].style.display = 'none';
        card[1].style.display = 'none';
        card[2].style.display = 'none';
    }

    current_card_index = null
}


function closeCardView() {
    card_view.style.display = 'none'
    card_view_open = true
}