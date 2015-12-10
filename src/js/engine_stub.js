// This code is intended to be replaced by Panda3D. Any code that is
// intended to work with Panda3D (e.g., utils) should go in their
// own JS file.

"use strict"

function PlayerData(obj) {
    var self = this

    self.mechs = [
        Engine.load_mech_data('mechs/mechone.json'),
        Engine.load_mech_data('mechs/mechtwo.json'),
        Engine.load_mech_data('mechs/mechone.json')
    ]

    self.wins = 0

    for (var prop in obj) this[prop] = obj[prop]
}

function CombatState() {
    var self = this

    self.mechs = []
    self.enemies = []
    self.last_mechid = 0
    self.enemy_positions = [
        [0.25, 0.6],
        [0.45, 0.7],
        [0.65, 0.6]
    ]


    self.init = function () {
        var deferreds = []
    
        Engine.render('combat')

        for (var i = 0; i < 3; i++) {
            var data,
                pos

            data = Engine.load_mech_data('mechs/enemy.json')
            data.name += data.id
            pos = self.enemy_positions[self.enemies.length]
            data.left = pos[0] * 100
            data.bottom = pos[1] * 100
            self.enemies.push(data)
            add_enemy(data)
        }
        
        Engine.player.mechs.forEach(function (mech) {
            add_mech(mech)
        })
    }

    self.end = function () {
        $('.enemypic').remove()
        $('.mechcard').remove()
    }

    self.do_attack = function () {
        var begin_attack,
            animate_attack

        lock_ui(true)

        var combatants = []
        Engine.player.mechs.concat(self.enemies).forEach(function (combatant) {
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

            if (combatant.hp_current <= 0) {
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

            targets = (Engine.player.mechs.indexOf(combatant) > -1) ? self.enemies : Engine.player.mechs
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
                        update_mech(target)
                        update_enemy(target)
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
                Engine.player.wins++
                Engine.switch_state(MenuState)
            }
            else if (Engine.player.mechs.filter(function(x) {return x.hp_current > 0}).length == 0) {
                console.log("The player loses :(")
                Engine.switch_state(MenuState)
            }

            lock_ui(false)
        })
    }

    self.do_change_formation = function () {
    }

    self.do_run = function () {
        console.log("The player has run away...")
        Engine.switch_state(MenuState)
    }
}


function MenuState() {
    var self = this

    this.init = function () {
        Engine.render('menu')
        update_player(Engine.player)
        update_saves(Engine.get_saves())
        //Engine.render('mech-list')
        //update_mech_list(Engine.player.mechs)
        //$('#mech-status-list li:first a').click()
    }

    this.end = function () {
    }

    this.do_combat = function () {
        Engine.switch_state(CombatState)
    }

    this.do_customize = function () {
        Engine.render('mech-list')
        update_mech_list(Engine.player.mechs)
    }

    this.do_button_main = function () {
        Engine.render('menu')
    }
}

var Engine = {
    last_mechid: 0,
    abilities: {
        "rifle": {},
        "bazooka": {}
    },

    state: {end: function(){} },

    init: function () {
        var saves

        for (name in Engine.abilities) {
            Engine.load_ability_data(name)
        }

        // Uncomment to clear saves
        //localStorage.removeItem('saves')

        saves = Engine.get_saves()
        if (saves.length === 0) {
            console.log('Creating new player')
            Engine.player = new PlayerData()
            Engine.set_saves([{'name': 'save', 'player': Engine.player}])
        }
        else {
            console.log('Loading player from local storage')
            Engine.player = new PlayerData(saves[0]['player'])
        }

        console.log(Engine.player)

        Engine.switch_state(MenuState)
    },

    switch_state: function (next_state) {
        Engine.state.end()
        Engine.state = new next_state()
        Engine.state.init()
    },

    do_action: function (action) {
        Engine.state[action]()
    },

    render: function (page) {
        var pageid = '#' + page + '-page'

        $('.page').removeClass('showpage')
        $(pageid).addClass('showpage')
    },

    load_ability_data: function (name) {
        $.ajax({
            url: "abilities/" + name + ".json",
            dataType: 'json',
            async: false,
            success: function (data) {
                Engine.abilities[name] = data
            },
            error: function (xhr, status, error) {
                console.log(error)
                console.log('failed to load ' + name)
            }
        })
    },

    load_mech_data: function (uri) {
        var retval = {}

        $.ajax({
            url: uri,
            dataType: 'json',
            async: false,
            success: function (data) {
                Engine.last_mechid += 1
                data.id = Engine.last_mechid
                data.hp_current = data.hp_max
                data.weapon = Engine.abilities[data.weapon.name]
                data.resource_current = {}
                data.resource_current[data.weapon.key] = data.weapon.resource_max
                data.initiative = 0
                retval = data
            },
            error: function (xhr, status, error) {
                console.log(error)
                console.log('failed to load ' + uri)
            }
        })

        return retval
    },

    get_saves: function () {
        var saves

        saves = JSON.parse(localStorage.getItem('saves'))
        if (saves === null) {
            saves = []
        }
        return saves
    },

    set_saves: function (saves) {
        localStorage.setItem('saves', JSON.stringify(saves))
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
