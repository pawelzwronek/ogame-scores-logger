(function () {
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
        let config = window.config;
        $('#graphs_selector').append('<span>' +
            '<input type="checkbox" value="' + no + '" onClick="showGraph(this)"' +
                (config.checked ? (config.checked.indexOf(no) >= 0 ? ' checked' : '') : '') + ' style="cursor:pointer;">' +
            '<span onClick="showGraph(this)" style="cursor:pointer;">' + playerScoresMap[no] + '</span></span>');
    });

    function showGraph (obj) {
        let config = window.config;
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
        window.saveConfig();
        updateGraphs();
        window.resizeWindow();
    }


    function fetchPlayer (id, timeout = 50, force = false) {
        let players = window.players;
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
        var scoreNo = window.config.checked.length > no ? window.config.checked[no] : -1;
        if (scoreNo === -1)
            return null;
        var graphData = {};
        var title = playerScoresMap[scoreNo];
        title === 'Research' ? title += ' <span style="opacity:0.2;">(hover me)</span>' : null;
        var playerIdx = 0;
        labels = ['time'];
        let annotations = [];
        window.dataTable.rows('.selected').every(function (rowIdx, tableLoop, rowLoop) {
            var p = this.data();
            var id = p.id;
            var player = window.players[id];
            if (player) {
                if (player.scores) {
                    $.each(player.scores, (__idx, scores) => {
                        var timestamp = scores[0];
                        if (!graphData[timestamp]) {
                            graphData[timestamp] = [];
                            graphData[timestamp].length = playerIdx + 1;
                        }
                        graphData[timestamp][playerIdx] = Number(scores[scoreNo]);
                    });
                    labels.push(player.name);
                    // research annotations
                    if (title.indexOf('Research') !== -1) {
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
                                        ).join('\n'),
                                        width: 0, height: 0, tickWidth: 0, tickHeight: 0
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
            let scores = [new Date(key * 1000)].concat(v);
            scores.length = playerIdx + 1; // fill missing scores with undefined
            data.push(scores);
        });
        return { data: data, title: title, annotations: annotations };
    };


    function updateGraphs () {
        for (var i = 0; i < graphs.length; i++) {
            var data = getGraphData(i);
            if (!data) {
                $('#graph' + i).hide();
            } else if(graphs[i]) {
                if (data.data == null)
                    return;
                $('#graph' + i).show();
                graphs[i].updateOptions({
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
                                return window.formatScore(y);
                            },
                            axisLabelFormatter: function (y) {
                                return window.formatScore(y);
                            }
                        }
                    } : null,
                });
                graphs[i].setAnnotations(data.annotations);
                graphs[i].resetZoom();
            }
        }
    }

    var graphs = [];
    for(var ii = 0 ; ii < 3 ; ii++) {
        graphs.push(new window.Dygraph(
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

    graphs.forEach((g) => {
        // g.updateOptions({ clickCallback: function (ev) {
        //     if (g.isSeriesLocked()) {
        //         g.clearSelection();
        //     } else {
        //         g.setSelection(g.getSelection(), g.getHighlightSeries(), true);
        //     }
        // } }, true);

        g.updateOptions({ highlightCallback: function (event, x, points, row, seriesNameev) {
            let annotations = g.annotations();
            let old = JSON.stringify(annotations);
            annotations.forEach((ann) => {
                let show = (ann.series === seriesNameev);
                show ? delete ann.width : ann.width = 0;
                show ? delete ann.height : ann.height = 0;
                show ? delete ann.tickHeight : ann.tickHeight = 0;
                show ? delete ann.tickWidth : ann.tickWidth = 0;
            });
            if (old !== JSON.stringify(annotations))
                g.setAnnotations(annotations);
        } });

        g.updateOptions({ unhighlightCallback: function (event) {
            g.getOption('highlightCallback')();
        } });
    });


    window.Dygraph.synchronize(graphs, {
        selection: false,
        zoom: true,
        range: false
    });

    function resizeGraphs ({ width, height, left }) {
        var visibleGraphCnt = window.config.checked.length;
        graphs.forEach ((g, idx) => {
            var $g = $('#graph' + idx);
            g.resize(width, height / visibleGraphCnt);
            $g.css({ 'top': idx * height / visibleGraphCnt, 'left': left });
        });
    }

    window.resizeGraphs = resizeGraphs;
    window.updateGraphs = updateGraphs;
    window.showGraph = showGraph;
})();
