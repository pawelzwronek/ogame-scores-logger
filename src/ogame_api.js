const _ = require('lodash');
const parseXmlString = require('xml2js').parseString;
const util = require('util');
const EventEmitter = require('events');

function getXml (host, path, onSuccess, onError) {
    var https = require('https');
    var options = {
        host: host,
        path: path
    };
    // log('getXml ' + host+path);
    var request = https.request(options, function (res) {
        var data = '';
        res.on('data', function (chunk) {
            data += chunk;
        });
        res.on('end', function () {
            parseXmlString(data, function (err, result) {
                if (err) onError(err);
                else onSuccess(result);
            });
        });
    });
    request.on('error', function (e) {
        // log.error(e.message);
        onError(e.message);
    });
    request.end();
}

function Player () {
    // var total, economy, research, millitary,ships, millitaryBuild, millitaryDestroyed, millitaryLost, honor;
}


function OgameApi (url) {
    const log = require('./util/logger').Log('ogameApi(' + url.split('.')[0] + ')');

    let self = this;
    self.url = url;
    self.scoreTimestamp = 0;
    self.players = {};
    self.scores = {};
    self.scoreInterval = 1000 * 60 * 60;
    const retryTimeoutStart = 1000 * 5;
    self.retryTimeout = retryTimeoutStart;
    log.info('starting');

    function runIn (time, type = 0) {
        // log.info('next highScore in ' + time / 1000 + 's');
        setTimeout(self.getHighScore, time, type);
    }

    function onError (error) {
        log.error(error);
        self.emit('error', error);
        runIn(self.retryTimeout);
        self.retryTimeout = Math.min(3600 * 1000, self.retryTimeout * 4); // exponential retry timeout
    }

    self.getHighScore = function (type) {
        try {
            getXml(self.url, '/api/highscore.xml?category=1&type=' + type,
                (xml) => {
                    try {
                        log.info('got highscore ' + type);
                        var timestamp = parseInt(xml.highscore.$.timestamp);
                        if (type === 0 && timestamp === parseInt(self.scoreTimestamp)) {
                            log.info('same timestamp');
                            runIn(self.scoreInterval / 2, 0);
                        } else {
                            xml.highscore.player.forEach(function (_p) {
                                var player = _p.$;
                                var id = player.id;
                                var score = player.score;
                                if (!(id in self.scores))
                                    self.scores[id] = new Player();
                                switch (type) {
                                case 0:
                                    self.scores[id].total = score;
                                    break;

                                case 1:
                                    self.scores[id].economy = score;
                                    break;

                                case 2:
                                    self.scores[id].research = score;
                                    break;

                                case 3:
                                    self.scores[id].millitary = score;
                                    self.scores[id].ships = player.ships || 0;
                                    break;

                                case 4:
                                    self.scores[id].millitaryBuild = score;
                                    break;

                                case 5:
                                    self.scores[id].millitaryDestroyed = score;
                                    break;

                                case 6:
                                    self.scores[id].millitaryLost = score;
                                    break;

                                case 7:
                                    self.scores[id].honor = score;
                                    break;

                                default:
                                    break;
                                }
                            });

                            // on success
                            if (type === 7) {
                                self.scoreTimestamp = timestamp;
                                runIn(self.scoreInterval);
                                self.emit('newScores', {
                                    timestamp: timestamp,
                                    players: _.clone(self.scores)
                                });
                                self.scores = {};
                                self.retryTimeout = retryTimeoutStart;
                            } else {
                                // run next type
                                runIn(200, type + 1);
                            }
                        }
                    } catch(error) {
                        onError(error);
                    }
                },
                (error) => {
                    onError(error);
                }
            );
        } catch (error) {
            onError(error);
        }
    };


    self.getPlayers = function (onSuccess) {
        getXml(self.url, '/api/players.xml',
            (xml) => {
                log.info('got players');
                self.players = {};
                xml.players.player.forEach(function (p) {
                    var id = p.$.id.toString();
                    self.players[id] = { id: id, name: p.$.name, status: p.$.status };
                });
                onSuccess(self.players, xml.players.$.timestamp);
            },
            (error) => {
                self.emit('badUrl', error);
            }
        );
    };

    // self.getPlayersLocal = function (onSuccess) {
    //     require('fs').readFile(__dirname + '/players.xml', (err, data) => {
    //        if (err) throw err;
    //         parseXmlString(data, function (err, xml) {
    //             onSuccess(xml.players.player);
    //         });
    //     });
    // }

    self.updatePlayers = function () {
        self.getPlayers(function (players, timestamp) {
            self.players = players;
            self.emit('newPlayers', players, timestamp);
        });
    };

    self.start = function () {
        self.getPlayers(function (players, timestamp) {
            self.players = players;
            self.emit('newPlayers', players, timestamp);
            self.scoreTimer = setTimeout(self.getHighScore, 1000 * 1, 0);
        });
    };

    self.stop = function () {
        self.scoreTimer && self.scoreTimer.unref();
        log.info('stopping ogame api');
    };
}

util.inherits(OgameApi, EventEmitter);

module.exports = {
    OgameApi
};
