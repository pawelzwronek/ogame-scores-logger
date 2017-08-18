(function () {

    var startTime = timeMs();

    let uni = 'no-uni';
    try { uni = window.location.href.match(/\/(.\d{1,3}-[a-z]{2,3})\//)[1]; } // http://localhost:8080/uni/s128-pl/
    catch(err) { log(err); }

    const configKey = 'config';

    function getConfig () {
        let cfg = {};
        try { cfg = JSON.parse(localStorage.getItem(configKey) || '{}'); }
        catch(err) { log(err); }

        if (!cfg.checked || cfg.checked.length === 0)
            cfg.checked = [1,4,5];
        cfg.checked = cfg.checked.map(v => parseInt(v)).sort();
        cfg.table_fav = cfg.table_fav || {};
        cfg.table_fav[uni] = cfg.table_fav[uni] || [];
        return cfg;
    }

    function saveConfig () {
        localStorage.setItem(configKey, JSON.stringify(config));
    }
    var config = getConfig();
    saveConfig();

    // function columnNo (name) {
    //     let idx = -1;
    //     dataTable.columns().each (function (value, index) {        
    //         if (this.header().innerHTML === name && idx === -1)
    //             idx = index;
    //     });
    //     return idx;
    // }
    var $table = $('#players #table ');

    var dataTable = $table.DataTable({
        order: [
            [3 , 'desc']
        ],
        orderFixed: [0, 'asc'],
        // processing: true,
        paging: false,
        ordering: true,
        info: true,
        rowId: 'id',
        fixedHeader: true,
        stateSave: true,
        columns: [
            { title: '', data: 'f', render: favouriteRender },
            { title: 'Id', data: 'id', visible: false },
            { title: 'Name', data: 'name' },
            { title: 'Total', data: 'score.t', render: formatScoreTable },
            { title: 'Economy', data: 'score.e', render: formatScoreTable },
            { title: 'Research', data: 'score.r', render: formatScoreTable },
            { title: 'Millitary', data: 'score.m', render: formatScoreTable },
            { title: 'Ships', data: 'score.s', render: formatScoreTable },
            { title: 'Honor', data: 'score.h', render: formatScoreTable },
            { title: 'Status', data: 'status', width: '1%' }
        ]
    });

    // click on table row(but not fav icon)
    $table.find('tbody').on('click', 'tr > td:nth-child(n+2)', function () {
        $(this.parentElement).toggleClass('selected');
        window.updateGraphs();
    });

    // click on fav icon
    $table.find('tbody').on('click', 'tr > td:nth-child(1)', function () {
        if ($(this).toggleClass('fav').hasClass('fav')) {
            config.table_fav[uni].push(this.parentNode.id);
        } else
            config.table_fav[uni].remove(this.parentNode.id);
        saveConfig();
        dataTable.row('#' + this.parentNode.id).invalidate();
        dataTable.draw();
    });

    // add novfav and fav class
    $table.one('draw.dt', function () {
        $table.find('tbody tr > td:nth-child(1)').each((i, el) => {
            $(el).addClass('nofav' + (config.table_fav[uni].indexOf(el.parentNode.id) >= 0 ? ' fav' : ''));
        });
    });

    // fetch players
    $.ajax({
        type: 'GET',
        url: 'players',
        dataType: 'json',
        success: function (_players) {
            window.players = _players;
            var data = Object.keys(window.players).map(function (key) {
                var p = window.players[key];
                return { id: key,
                    name: p.name || '-',
                    score: p.score || { t: '-', e: '-', r: '-', m: '-', s: '-', mb: '-', md: '-', ml: '-',h: '-' },
                    status: p.status || '-'
                };
            });
            dataTable.clear();
            dataTable.rows.add(data);
            dataTable.draw();
            window.updateGraphs();
        }
    });


    // function formatDate (d) {
    //     var yyyy = d.getFullYear(),
    //         mm = d.getMonth() + 1,
    //         dd = d.getDate();
    //     return yyyy + '-' + (mm < 10 ? '0' : '') + mm + (dd < 10 ? '0' : '') + dd;
    // }


    $table.on('draw.dt', function () {
        resizeWindow();
    });

    $(window).resize(function () {
        resizeWindow();
    });

    function resizeWindow () {
        var H = $(window).height();
        var W = $('#wrapper').width();
        var tableWidth = $table.outerWidth();
        $('#players').width(tableWidth);

        window.resizeGraphs({ 'width': W - tableWidth - 10, 'height': H, 'left': tableWidth + 10 });
    }

    function formatScoreTable (data, type) {
        if (type === 'display')
            return formatScore(data);
        else
            return data;
    }

    var formatScore = function (num) {
        if (isNaN(num)) return num;
        var sign = 1;
        if (num < 0) {
            num = -num;
            sign = -1;
        } else if (num === 0)
            return 0;
        var n = Math.max(0, Math.ceil(Math.log10(num)) - 1);
        var prefixes = ['', 'k', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y'];
        var dividers = [1, 1e3, 1e6, 1e9, 1e12, 1e15, 1e18, 1e21, 1e24];
        var idx = Math.floor(n / 3);
        var mul = ([100, 10, 1])[n % 3];
        if (n >= prefixes.length * 3) {
            mul = 1;
            idx = prefixes.length - 1;
        }
        var pref = prefixes[idx];
        return Math.round(num / dividers[idx] * mul) / mul * sign + pref;
    };

    function favouriteRender (data, type, row) {
        if (type === 'display')
            return '';
        else
            return config.table_fav[uni].indexOf(row.id) >= 0 ? -1 : 0; // favourite on top while sorting
    }

    window.config = config;
    window.dataTable = dataTable;
    window.formatScore = formatScore;
    window.saveConfig = saveConfig;
    window.resizeWindow = resizeWindow;
})();
