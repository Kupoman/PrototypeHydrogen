// This code is intended to be replaced by Panda3D. Any code that is
// intended to work with Panda3D (e.g., utils) should go in their
// own JS file.

"use strict"

var Engine = {
    mechs: [],
    enemies: [],
    is_combat_over: false,
    last_mechid: 0,
    enemy_positions: [
        [0.05, 0.7],
        [0.25, 0.6],
        [0.45, 0.7],
        [0.65, 0.6],
        [0.85, 0.7]
    ],

    abilities: {
        "rifle": {},
        "bazooka": {}
    },


    load_mech_data: function (uri, is_player) {
        $.ajax({
            url: uri,
            dataType: 'json',
            success: function (data) {
                Engine.last_mechid += 1
                data.id = Engine.last_mechid
                data.hp_current = data.hp_max
                data.weapon = Engine.abilities[data.weapon.name]
                data.resource_current = {}
                data.resource_current[data.weapon.key] = data.weapon.resource_max
                data.initiative = 0
                data.is_player = is_player
                if (is_player) {
                    Engine.mechs.push(data)
                    add_mech(data)
                }
                else {
                    var pos

                    data.name += data.id
                    pos = Engine.enemy_positions[Engine.enemies.length]
                    data.left = pos[0] * 100
                    data.bottom = pos[1] * 100
                    Engine.enemies.push(data)
                    add_enemy(data)
                }
            },
            error: function (xhr, status, error) {
                console.log(error)
                console.log('failed to load ' + uri)
            }
        })
    },

    load_ability_data: function (name) {
        $.ajax({
            url: "abilities/" + name + ".json",
            dataType: 'json',
            success: function (data) {
                Engine.abilities[name] = data
            },
            error: function (xhr, status, error) {
                console.log(error)
                console.log('failed to load ' + name)
            }
        })
    },

    init: function () {
        var deferreds = []
        for (name in Engine.abilities) {
            deferreds.push(Engine.load_ability_data(name))
        }
        $.when.apply($, deferreds).then(function(x) {})

        for (i = 0; i < 5; i++) {
            Engine.load_mech_data('mechs/enemy.json', false)
        }

        Engine.load_mech_data('mechs/mechone.json', true)
        Engine.load_mech_data('mechs/mechtwo.json', true)
        Engine.load_mech_data('mechs/mechone.json', true)
        Engine.load_mech_data('mechs/mechtwo.json', true)
        Engine.load_mech_data('mechs/mechone.json', true)
    },

    main: function () {
        window.requestAnimationFrame(Engine.main)
    },

    do_attack: function () {
        var begin_attack,
            animate_attack

        if (Engine.is_combat_over) {
            location.reload()
            return
        }

        lock_ui(true)

        var combatants = []
        Engine.mechs.concat(Engine.enemies).forEach(function (combatant) {
            var init_roll,
                init_mod

            if (combatant.hp_current != 0) {
                init_roll = Math.floor((Math.random() * 21) + 1)
                init_mod = (combatant.stats.speed + combatant.weapon.speed - 10) / 2
                combatant.initiative = init_roll + init_mod
                combatants.push(combatant)
            }
        })

        combatants.sort(function(a, b) {return a.initiative - b.initiative})

        begin_attack = function (combatant) {
            var dfd = $.Deferred()

            if (Engine.is_combat_over || combatant.hp_current <= 0) {
                dfd.resolve()
            }

            if (combatant.resource_current[combatant.weapon.key]> 0) {
                combatant.resource_current[combatant.weapon.key] -= 1;
                animate_attack(combatant).then(dfd.resolve)
            }
            else {
                console.log(combatant.name + " is out of resources!")
                dfd.resolve()
            }

            return dfd.promise()
        }

        animate_attack = function (combatant) {
            var dfd = $.Deferred(),
                targets

            update_mech(combatant)

            targets = (combatant.is_player) ? Engine.enemies : Engine.mechs
            targets = targets.filter(function (x){ return x.hp_current > 0})
            if (targets.length == 0) {
                // Nothing to attack
                console.log(combatant.name + " is out of targets!")
                dfd.resolve()
                return dfd.promise()
            }

            animate_mech(combatant, 'tada').then(function () {
                var target,
                    attack_roll,
                    attack_mod,
                    damage_roll,
                    damage_mod,
                    damage

                target = targets[Math.floor(Math.random() * targets.length)]
                attack_roll = Math.floor((Math.random() * 21) + 1)
                attack_mod = (combatant.stats.accuracy + combatant.weapon.accuracy - 10) / 2
                if (attack_roll + attack_mod >= 10 + (target.stats.defense + target.weapon.defense - 10) / 2) {
                    animate_mech(target, 'flash').then(function () {
                        damage_roll = Math.floor((Math.random() * 7) + 1)
                        damage_mod = (combatant.stats.attack + combatant.weapon.damage - 10) / 2
                        damage = damage_roll + damage_mod
                        target.hp_current = Math.max(target.hp_current - damage, 0)
                        if (target.is_player) {
                            update_mech(target)
                        }
                        else {
                            update_enemy(target)
                        }
                        console.log(combatant.name + " attacks " + target.name + " for " + damage + " points of damage!")
                        if (target.hp_current == 0) {
                            console.log(target.name + " has fallen!")
                        }

                        dfd.resolve()
                    })
                }
                else {
                    console.log(combatant.name + " attacks " + target.name + ", but misses!")
                    dfd.resolve()
                }

            })
            return dfd.promise()
        }

        // Queue up actions
        var dfd = $.Deferred().resolve()

        combatants.forEach(function (combatant) {
            (function (c) {
                dfd = dfd.then(function () {
                    return begin_attack(c)
                })
            })(combatant)
        })

        dfd.then(function () {
            if (Engine.enemies.filter(function(x) {return x.hp_current > 0}).length == 0) {
                console.log("The player wins!")
                Engine.is_combat_over = true
            }
            else if (Engine.mechs.filter(function(x) {return x.hp_current > 0}).length == 0) {
                console.log("The player loses :(")
                Engine.is_combat_over = true
            }

            lock_ui(false)
        })
    }
}

$(document).ready(function () {
    Engine.init()
    // don't need this yet
    //main()
})
