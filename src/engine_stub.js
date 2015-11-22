// This code is intended to be replaced by Panda3D. Any code that is
// intended to work with Panda3D (e.g., utils) should go in their
// own JS file.

Engine = {
    mechs: [],
    last_mechid: 0,

    load_mech_data: function (uri) {
        $.ajax({
            url: uri,
            dataType: 'json',
            success: function (data) {
                Engine.mechs.push(data)
                Engine.last_mechid += 1
                data.id = Engine.last_mechid
                data.hp_current = data.hp_max
                data.weapon.resource_current = data.weapon.resource_max
                add_mech(data)
            },
            error: function (xhr, status, error) {
                console.log(error)
                console.log('failed to load ' + uri)
            }
        })
    },

    init: function () {
        Engine.load_mech_data('mechs/mechone.json')
        Engine.load_mech_data('mechs/mechtwo.json')
        Engine.load_mech_data('mechs/mechone.json')
        Engine.load_mech_data('mechs/mechtwo.json')
        Engine.load_mech_data('mechs/mechone.json')
    },

    main: function () {
        window.requestAnimationFrame(Engine.main)
    },

    do_attack: function () {
        Engine.mechs.forEach(function (mech) {
            if (mech.weapon.resource_current > 0) {
                mech.weapon.resource_current -= 1;
				damage_roll = Math.floor((Math.random() * 6)+1)
				damage_mod = (mech.stats.attack - 10) / 2
				damage = damage_roll + damage_mod
                console.log(mech.name + " attacks for " + damage + " points of damage!")
            }
            else {
                console.log(mech.name + " is out of resources!")
            }
            update_mech(mech)
        })
    }
}

$(document).ready(function () {
    Engine.init()
    // don't need this yet
    //main()
})
