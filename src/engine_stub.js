// This code is intended to be replaced by Panda3D. Any code that is
// intended to work with Panda3D (e.g., utils) should go in their
// own JS file.

;(function () {
    function load_mech_data (uri) {
        $.ajax({
            url: uri,
            dataType: 'json',
            success: function (data) {
                add_mech(data)
            },
            error: function (xhr, status, error) {
                console.log(error)
                console.log('failed to load ' + uri)
            }
        })
    }


    function init () {
        load_mech_data('mechs/mechone.json')
        load_mech_data('mechs/mechtwo.json')
        load_mech_data('mechs/mechone.json')
        load_mech_data('mechs/mechtwo.json')
        load_mech_data('mechs/mechone.json')
    }

    function main () {
        window.requestAnimationFrame(main)
    }

    $(document).ready(function () {
        init()
        // don't need this yet
        //main()
    })
})()
