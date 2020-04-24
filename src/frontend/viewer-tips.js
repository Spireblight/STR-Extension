
var last_relics = ""
var last_potions = ""
var last_potion_tips = ""
var last_player_powers = ""
var last_player_power_tips = ""
var last_monster_powers_list = ""
var last_monster_powers_list_tips = ""
var last_custom_tips_list = ""
var last_custom_tips_list_tips = ""


const MAX_DISPLAY_RELICS = 25 //count

const MAX_RIGHT = 99.0 //%
const MAX_BOTTOM = 98.0 //%
const MIN_TOP = 2.0 //%
const CHARACTER_POWERS_OFFSET_R = 1.0416 //%
const CHARACTER_POWERS_OFFSET_L = -2.917 //%
const CHARACTER_HEALTHBAR_HEIGHT = 6.666 //%

const CATEGORY_RELICS = 'relics'
const CATEGORY_POTIONS = 'potions'
const CATEGORY_PLAYER_POWERS = 'player_powers'
const CATEGORY_MONSTER_POWERS = 'monster_powers'
const CATEGORY_CUSTOM_TIPS = 'custom_tips'


function decompressPowerTips(power_tips) {
    return splitSemicolonDelimited2DArray(decompress(power_tips))
}


function setRelics(relics, power_tips, character) {
    // console.log('set relics, relics: ' + JSON.stringify(relics))

    if (JSON.stringify(relics)  == last_relics) // do not replace 
        return

    is_relics_multipage = relics[0]
    last_relics = JSON.stringify(relics)

    if (current_tooltip_id && current_tooltip_category == CATEGORY_RELICS) {
        current_tooltip_id = null
        current_tooltip_category = null    
    }
        
    clearCollection(CATEGORY_RELICS)

    for (let i = 0; i < relics[1].length; i++) {
        // console.log('adding relic ' + i)

        const tips = arraySubset(power_tips, relics[1][i]);
        const hitbox = {
            x: (RELIC_HITBOX_LEFT + i * RELIC_HITBOX_WIDTH + is_relics_multipage * RELIC_HITBOX_MULTIPAGE_OFFSET) + '%',
            y: 6.111 + '%',
            z: 1,
            w: 3.75 + '%',
            h: 8.666 + '%'
        }

        strip = createPowerTipStrip(items, hitbox, tips, CATEGORY_RELICS, character)
        strip.hitbox.classList.add('mag-glass')
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

    if (current_tooltip_id && current_tooltip_category == CATEGORY_POTIONS) {
        current_tooltip_id = null
        current_tooltip_category = null
    }
        

    last_potions = JSON.stringify(potions)
    last_potion_tips = JSON.stringify(power_tips_subset)

    clearCollection(CATEGORY_POTIONS)

    var x_hitbox_first = (potions[0] / 1920.0) * 100

    for (let i = 0; i < potions[1].length; i++) {
        // console.log('adding potion ' + i)

        let tips = arraySubset(power_tips, potions[1][i]);
        
        let hitbox = {
            x: (x_hitbox_first - POTION_HITBOX_WIDTH / 2 + i * POTION_HITBOX_WIDTH) + '%',
            y: 0 + '%',
            z: 1,
            w: 2.916 + '%',
            h: 5.556 + '%'
        }

        createPowerTipStrip(items, hitbox, tips, CATEGORY_POTIONS, character)
    }
}


function setPlayerPowers(player_powers, power_tips, character) {

    // console.log('set player powers, player_powers: ' + JSON.stringify(player_powers))

    if (player_powers) {

        power_tips_subset = arraySubset(power_tips, player_powers[4]);

        if (JSON.stringify(player_powers) == last_player_powers && JSON.stringify(power_tips_subset) == last_player_power_tips)
            return
    }

    if (current_tooltip_id && current_tooltip_category == CATEGORY_PLAYER_POWERS) {
        current_tooltip_id = null
        current_tooltip_category = null    
    }

    last_player_powers = JSON.stringify(player_powers)
    last_player_power_tips = JSON.stringify(power_tips_subset)

    clearCollection(CATEGORY_PLAYER_POWERS)

    if (player_powers) {
        let hitbox = {
            x: player_powers[0] + '%',
            y: player_powers[1] + '%',
            z: 2,
            w: player_powers[2] + '%',
            h: player_powers[3] + '%'
        }
        let tips = arraySubset(power_tips, player_powers[4])
        let multicol = createMulticolPowertips(items, hitbox, tips, CATEGORY_PLAYER_POWERS, character)
        placeMulticolTips(hitbox, multicol, true)
    }
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

    if (current_tooltip_id && current_tooltip_category == CATEGORY_MONSTER_POWERS) {
        current_tooltip_id = null
        current_tooltip_category = null    
    }

    last_monster_powers_list = JSON.stringify(monster_powers_list)
    last_monster_powers_list_tips = JSON.stringify(power_tips_subset)

    clearCollection(CATEGORY_MONSTER_POWERS)

    if (monster_powers_list)
        for (let i = 0; i < monster_powers_list.length; i++) {
            const monster_powers = monster_powers_list[i];

            let hitbox = {
                x: monster_powers[0] + '%',
                y: monster_powers[1] + '%',
                z: 2,
                w: monster_powers[2] + '%',
                h: monster_powers[3] + '%'
            }
            let tips = arraySubset(power_tips, monster_powers[4])

            let multicol = createMulticolPowertips(items, hitbox, tips, CATEGORY_MONSTER_POWERS, character)
            placeMulticolTips(hitbox, multicol, true)
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

    if (current_tooltip_id && current_tooltip_category == CATEGORY_MONSTER_POWERS) {
        current_tooltip_id = null
        current_tooltip_category = null    
    }

    last_custom_tips_list = JSON.stringify(custom_tips_list)
    last_custom_tips_list_tips = JSON.stringify(power_tips_subset)

    clearCollection(CATEGORY_CUSTOM_TIPS)

    if (custom_tips_list)
        for (let i = 0; i < custom_tips_list.length; i++) {
            const custom_tips = custom_tips_list[i];

            let hitbox = {
                x: custom_tips[0] + '%',
                y: custom_tips[1] + '%',
                z: 3,
                w: custom_tips[2] + '%',
                h: custom_tips[3] + '%'
            }
            let tips = arraySubset(power_tips, custom_tips[4])

            let multicol = createMulticolPowertips(items, hitbox, tips, CATEGORY_CUSTOM_TIPS, character)
            placeMulticolTips(hitbox, multicol, false)
        }
}


function placeMulticolTips(hitbox, multicol, heuristic_y) {

    var x = parsePercentage(hitbox.x)
    var y = parsePercentage(hitbox.y)
    var w = parsePercentage(hitbox.w)
    var h = parsePercentage(hitbox.h)

    var mc_h = parsePercentage(multicol.tips.style.height)
    var mc_w = parsePercentage(multicol.tips.style.width)
    var mc_right_x = x + w + CHARACTER_POWERS_OFFSET_R
    var mc_left_x = x + CHARACTER_POWERS_OFFSET_L - mc_w
    var mc_x = 0

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
    // console.log('y ' + y + ' h ' + h + ' mc_h ' + mc_h + ' mc_w ' + mc_w)

    if (heuristic_y) {
        // don't worry about this line, it just approximates what is in the game. You have spent several hours on this one line. It's a heuristic, it's good enough
        var mc_y = y + (h - CHARACTER_HEALTHBAR_HEIGHT) / 2 - (y + (h - CHARACTER_HEALTHBAR_HEIGHT)) / 100 * mc_h * 0.98 + 12 / 2.65
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

    multicol.tips.style.left = mc_x + "%"
    multicol.tips.style.top = mc_y + "%"
}
