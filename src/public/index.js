// const log = require('./util/logger').Log('universe');
// const _ = require('lodash');

$(function () {
    var refreshUniverses = function () {
        $.ajax({
            type: 'GET',
            url: '/universes',
            dataType: 'json',
            success: function (universes) {
                $('#universes').empty();
                universes.forEach(function (universe) {
                    $('#universes').append(
                        `<div> 
                            <a href ="/uni/${universe.name}/">` + universe.name +
                            '</a> since ' + (new Date(universe.since)).toISOString().slice(0,19).replace('T', ' ') +
                        '</div>');
                }, this);
            }
        });
    };

    refreshUniverses();

    window.runUniverse = function (event) {
        if (event === undefined || event.which === 13 || event.keyCode === 13) {
            $('#error').text('');
            var uni = $('#universe').val();
            $.ajax({
                url: '/runUniverse/?name=' + uni,
                type: 'POST',
                dataType: 'json',
                success: function (response) {
                    if (response.error) {
                        $('#error').text(response.error);
                    }
                },
                error: function (x,t,e) {
                    window.console.error(x + t + e);
                }
            });
            // window.location.href = uni;
            setTimeout(refreshUniverses, 1000);
            setTimeout(refreshUniverses, 2000);
        }
    };
});
