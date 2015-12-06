// This code is intended to be replaced by Panda3D. Any code that is
// intended to work with Panda3D (e.g., utils) should go in their
// own JS file.

"use strict"

function CombatState() {
    var self = this

    self.mechs = []
    self.enemies = []
    self.is_combat_over = false
    self.last_mechid = 0
    self.enemy_positions = [
        [0.25, 0.6],
        [0.45, 0.7],
        [0.65, 0.6]
    ]

    self.abilities = {
        "rifle": {},
        "bazooka": {}
    }


    self.load_mech_data = function (uri, is_player) {
        $.ajax({
            url: uri,
            dataType: 'json',
            success: function (data) {
                self.last_mechid += 1
                data.id = self.last_mechid
                data.hp_current = data.hp_max
                data.weapon = self.abilities[data.weapon.name]
                data.resource_current = {}
                data.resource_current[data.weapon.key] = data.weapon.resource_max
                data.initiative = 0
                data.is_player = is_player
                if (is_player) {
                    self.mechs.push(data)
                    add_mech(data)
                }
                else {
                    var pos

                    data.name += data.id
                    pos = self.enemy_positions[self.enemies.length]
                    data.left = pos[0] * 100
                    data.bottom = pos[1] * 100
                    self.enemies.push(data)
                    add_enemy(data)
                }
            },
            error: function (xhr, status, error) {
                console.log(error)
                console.log('failed to load ' + uri)
            }
        })
    },

    self.load_ability_data = function (name) {
        var abilities = self.abilities

        $.ajax({
            url: "abilities/" + name + ".json",
            dataType: 'json',
            success: function (data) {
                abilities[name] = data
            },
            error: function (xhr, status, error) {
                console.log(error)
                console.log('failed to load ' + name)
            }
        })
    },

    self.init = function () {
        var deferreds = []
        for (name in self.abilities) {
            deferreds.push(self.load_ability_data(name))
        }
        $.when.apply($, deferreds).then(function(x) {})

        for (var i = 0; i < 3; i++) {
            self.load_mech_data('mechs/enemy.json', false)
        }

        self.load_mech_data('mechs/mechone.json', true)
        self.load_mech_data('mechs/mechtwo.json', true)
        self.load_mech_data('mechs/mechone.json', true)
        self.load_mech_data('mechs/mechtwo.json', true)
        self.load_mech_data('mechs/mechone.json', true)
    },

    self.do_attack = function () {
        var begin_attack,
            animate_attack

        if (self.is_combat_over) {
            location.reload()
            return
        }

        lock_ui(true)

        var combatants = []
        self.mechs.concat(self.enemies).forEach(function (combatant) {
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

            if (self.is_combat_over || combatant.hp_current <= 0) {
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

            targets = (combatant.is_player) ? self.enemies : self.mechs
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
                    animate_mech(target, 'bounce').then(function () {
                        console.log(combatant.name + " attacks " + target.name + ", but misses!")
                        dfd.resolve()
                    })
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
            if (self.enemies.filter(function(x) {return x.hp_current > 0}).length == 0) {
                console.log("The player wins!")
                self.is_combat_over = true
            }
            else if (self.mechs.filter(function(x) {return x.hp_current > 0}).length == 0) {
                console.log("The player loses :(")
                self.is_combat_over = true
            }

            lock_ui(false)
        })
    }

    self.do_change_formation = function () {
    }

    self.do_run = function () {
        self.enemies.forEach(function (enemy) {
            enemy.hp_current = 0
            update_enemy(enemy)
        })

        self.is_combat_over = true
    }
}

var Engine = {
    state: {end: function(){} },

    init: function () {
        Engine.switch_state(CombatState)
    },

    switch_state: function (next_state) {
        Engine.state.end()
        Engine.state = new next_state()
        Engine.state.init()
    },

    do_action: function (action) {
        Engine.state[action]()
    },

    main: function () {
        window.requestAnimationFrame(Engine.main)
    }
}

$(document).ready(function () {
    Engine.init()
    // don't need this yet
    //main()
})
