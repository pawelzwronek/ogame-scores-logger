// var startTime = timeMs();

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

const playerScoresMap = {
    0: 'Time',
    1: 'Total',
    2: 'Economy',
    3: 'Research',
    4: 'Millitary',
    5: 'Ships',
    6: 'Build',
    7: 'Destroyed',
    8: 'Lost',
    9: 'Honor' };

var graphsSelectors = [1, 2, 3, 4, 5, 6, 7, 8, 9];

graphsSelectors.forEach((no) => {
    $('#graphs_selector').append('<span>' +
        '<input type="checkbox" value="' + no + '" onClick="showGraph(this)"' +
            (config.checked ? (config.checked.indexOf(no) >= 0 ? ' checked' : '') : '') + ' style="cursor:pointer;">' +
        '<span onClick="showGraph(this)" style="cursor:pointer;">' + playerScoresMap[no] + '</span></span>');
});

window.showGraph = function (obj) {
    var input = obj.localName === 'input' ? obj : obj.parentNode.firstChild;
    if (obj.localName !== 'input')
        input.checked = !input.checked;
    if (input.checked) {
        config.checked.unshift(parseInt(input.value));
        config.checked.length = Math.min(3, config.checked.length);
    }
    else
        config.checked = config.checked.filter(v => v !== parseInt(input.value));
    config.checked = config.checked.sort();

    $('#graphs_selector input:checked').each((idx, el) => {
        if (config.checked.indexOf(parseInt(el.value)) === -1)
            el.checked = false;
    });
    saveConfig();
    updateGraphs();
    resize();
};

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
    updateGraphs();
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

var players = window.players;

// fetch players
$.ajax({
    type: 'GET',
    url: 'players',
    dataType: 'json',
    success: function (_players) {
        players = _players;
        var data = Object.keys(players).map(function (key) {
            var p = players[key];
            return { id: key,
                name: p.name || '-',
                score: p.score || { t: '-', e: '-', r: '-', m: '-', s: '-', mb: '-', md: '-', ml: '-',h: '-' },
                status: p.status || '-'
            };
        });
        dataTable.clear();
        dataTable.rows.add(data);
        dataTable.draw();
        updateGraphs();
    }
});

function fetchPlayer (id, timeout = 50, force = false) {
    if (!players[id].fetching || force) {
        players[id].fetching = true;
        $.ajax({
            type: 'GET',
            url: 'scores?id=' + id,
            dataType: 'text',
            success: function (_scores) {
                // decompress _scores
                var lines = _scores.split('\n');
                var prevScores;
                var scoresAll = [];
                lines.forEach((line) => {
                    let scores = line.split(',').map((v) => { return v ? parseInt(v) : 0; });
                    let newScores = [];
                    if (!prevScores) {
                        newScores = scores;
                    } else {
                        let scoresLastI = scores.length - 1;
                        prevScores.forEach((v, i) => {
                            newScores.push(v + (i <= scoresLastI ? scores[i] : 0));
                        });
                    }
                    if (newScores.length > 1) {
                        scoresAll.push(newScores);
                        prevScores = newScores;
                    }
                });
                players[id].scores = scoresAll;
                log('Fethed ' + id);
                updateGraphs();
            },
            error: function (jqXHR, status) {
                timeout *= 3; // try again with exponential backoff
                log(status + ' Try again in ' + timeout + ' ms');
                setTimeout(fetchPlayer, timeout, id, timeout, true);
            }
        });
    }
}

var labels = [];
var getGraphData = function (no) {
    var scoreNo = config.checked.length > no ? config.checked[no] : -1;
    if (scoreNo === -1)
        return null;
    var graphData = {};
    var title = playerScoresMap[scoreNo];
    var playerIdx = 0;
    labels = ['time'];
    let annotations = [];
    dataTable.rows('.selected').every(function (rowIdx, tableLoop, rowLoop) {
        var p = this.data();
        var id = p.id;
        var player = players[id];
        if (player) {
            if (player.scores) {
                $.each(player.scores, (__idx, scores) => {
                    var timestamp = scores[0];
                    if (!graphData[timestamp]) graphData[timestamp] = [];
                    graphData[timestamp][playerIdx] = Number(scores[scoreNo]);
                });
                labels.push(player.name);
                // research annotations
                if (title === 'Research') {
                    $.each(player.scores, (idx, scores) => {
                        if (idx > 0) {
                            let diff = Number(scores[scoreNo]) - Number(player.scores[idx - 1][scoreNo]); // research points difference
                            // diff !== 0 && log((new Date(scores[0] * 1000)).slice(0, 22) + ': diff ' + player.name + ': ' + diff);
                            if (diff <= 0) return;
                            let reses = window.findResearch(diff); // find matching researches
                            if (reses.length > 0) {
                                annotations.push({
                                    series: player.name,
                                    x: scores[0] * 1000, // timestamp
                                    shortText: 'R',
                                    text: reses.map(r =>
                                        r.res.name + ' ' + r.res.lvl + (r.overshot !== 0 ? '  +' + r.overshot.toFixed(2) + '%' : '')
                                    ).join('\n')
                                });
                            }
                        }
                    });
                }
                playerIdx++;
            } else {
                fetchPlayer(id);
            }
        }
    }, this);
    let data = [];
    $.each(graphData, (key, v) => {
        data.push([new Date(key * 1000)].concat(v));
    });
    return { data: data, title: title, annotations: annotations };
};

var updateGraphs = function () {
    for (var i = 0; i < graph.length; i++) {
        var data = getGraphData(i);
        if (!data) {
            $('#graph' + i).hide();
        } else if(graph[i]) {
            if (data.data == null)
                return;
            $('#graph' + i).show();
            graph[i].updateOptions({
                file: data.data.length > 0 ? data.data : [[0]],
                title: data.title,
                labels: labels,
                showRangeSelector: i === 0 && data.data.length > 0,
                axes: data.data.length > 0 ? {
                    // x: {
                    //     valueFormatter: function (ms) {
                    //         return 'xvf(' + formatDate(new Date(ms)) + ')';
                    //     },
                    //     axisLabelFormatter: function (d) {
                    //         return 'xalf(' + formatDate(d) + ')';
                    //     },
                    //     pixelsPerLabel: 100,
                    //     axisLabelWidth: 100,
                    // },
                    y: {
                        valueFormatter: function (y) {
                            return formatScore(y);
                        },
                        axisLabelFormatter: function (y) {
                            return formatScore(y);
                        }
                    }
                } : null,
            });
            graph[i].setAnnotations(data.annotations);
            graph[i].resetZoom();
        }
    }
};

// function formatDate (d) {
//     var yyyy = d.getFullYear(),
//         mm = d.getMonth() + 1,
//         dd = d.getDate();
//     return yyyy + '-' + (mm < 10 ? '0' : '') + mm + (dd < 10 ? '0' : '') + dd;
// }

var graph = [];
for(var ii = 0 ; ii < 3 ; ii++) {
    graph.push(new window.Dygraph(
        document.getElementById('graph' + ii),
        [[0]],
        {
            title: '',
            labels: ['Date'],
            stackedGraph: false,
            showLabelsOnHighlight: true,
            legend: 'always',

            highlightCircleSize: 2,
            strokeWidth: 2,
            strokeBorderWidth: 1,

            highlightSeriesOpts: {
                strokeWidth: 3,
                strokeBorderWidth: 1,
                highlightCircleSize: 5
            },
            drawCallback: (g, inital)=> {
                $('div.dygraph-legend').css('left', 70);
            },
            labelsSeparateLines: true,
            colors: ['#66c2a5','#fc8d62','#8da0cb','#e78ac3','#a6d854','#ffd92f'],
            // colors: ['#e41a1c','#377eb8','#4daf4a','#984ea3','#ff7f00','#ffff33'],
            // colors: ['#396AB1', '#DA7C30','#3E9651','#CC2529','#535154','#6B4C9A','#922428','#948B3D'],
            underlayCallback: function (canvas, area, g) {
                if (g.numRows() === 0)
                    return;
                canvas.fillStyle = 'rgba(250, 250, 250, 1.0)';

                function highlight_period (x_start, x_end) {
                    var canvas_left_x = g.toDomXCoord(x_start);
                    var canvas_right_x = g.toDomXCoord(x_end);
                    var canvas_width = canvas_right_x - canvas_left_x;
                    canvas.fillRect(canvas_left_x, area.y, canvas_width, area.h);
                }

                var min_data_x = g.getValue(0,0);
                var max_data_x = g.getValue(g.numRows() - 1,0);

                // get day of week
                var d = new Date(min_data_x);
                var dow = d.getUTCDay();

                var w = min_data_x;
                // starting on Sunday is a special case
                if (dow === 0) {
                    highlight_period(w,w + 12 * 3600 * 1000);
                }
                // find first saturday
                while (dow !== 6) {
                    w += 24 * 3600 * 1000;
                    d = new Date(w);
                    dow = d.getUTCDay();
                }
                // shift back 1/2 day to center highlight around the point for the day
                w -= 12 * 3600 * 1000;
                while (w < max_data_x) {
                    var start_x_highlight = w;
                    var end_x_highlight = w + 2 * 24 * 3600 * 1000;
                    // make sure we don't try to plot outside the graph
                    if (start_x_highlight < min_data_x) {
                        start_x_highlight = min_data_x;
                    }
                    if (end_x_highlight > max_data_x) {
                        end_x_highlight = max_data_x;
                    }
                    highlight_period(start_x_highlight,end_x_highlight);
                    // calculate start of highlight for next Saturday
                    w += 7 * 24 * 3600 * 1000;
                }
            }
        }));
}

window.Dygraph.synchronize(graph, {
    selection: false,
    zoom: true,
    range: false
});

$table.on('draw.dt', function () {
    resize();
});

$(window).resize(function () {
    resize();
});

function resize () {
    var H = $(window).height();
    var W = $('#wrapper').width();
    var tableWidth = $table.outerWidth();
    $('#players').width(tableWidth);

    var visibleGraphCnt = config.checked.length;
    graph.forEach ((g, idx) => {
        var $g = $('#graph' + idx);
        g.resize(W - tableWidth - 10, H / visibleGraphCnt);
        $g.css({ 'top': idx * H / visibleGraphCnt, 'left': tableWidth + 10 });
    });
}

function formatScoreTable (data, type) {
    if (type === 'display')
        return formatScore(data);
    else
        return data;
}

function formatScore (num) {
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
}

function favouriteRender (data, type, row) {
    if (type === 'display')
        return '';
    else
        return config.table_fav[uni].indexOf(row.id) >= 0 ? -1 : 0; // favourite on top while sorting
}
