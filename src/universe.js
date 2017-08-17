const fs = require('fs');
const _ = require('lodash');
const EventEmitter = require('events');
const util = require('util');
const path = require('path');

function Universe (urlPrefix, options) {
    var log = require('./util/logger').Log('universe(' + urlPrefix + ')');
    var self = this;
    self.urlPrefix = urlPrefix;
    self.options = options;
    self.url = self.urlPrefix + '.ogame.gameforge.com';
    self.universesDir = 'universes_small';
    self.universeDir = path.join(self.universesDir, urlPrefix);
    self.scoresDir = path.join(self.universeDir, 'scores');
    self.playersFile = path.join(self.universeDir, 'players.json');
    self.minTimestamp = Math.round(new Date().getTime() / 1000);// Number.MAX_VALUE;
    self.streams = {};
    self.playersLastScores = {};

    log.info('try running');

    // read last line
    if (fs.existsSync(self.scoresDir)) {
        fs.readdirSync(self.scoresDir).forEach ((name) => {
            var lines = fs.readFileSync(path.join(self.scoresDir, name), 'utf-8')
                .split('\n');
            var prevScores;
            lines.forEach ((line) => {
                let scores = line.split(',').map((v) => { return v ? parseInt(v) : 0;});
                let newScores = [];
                if (!prevScores) {
                    newScores = scores;
                } else {
                    let scoresLastI = scores.length - 1;
                    prevScores.forEach ((v, i) => {
                        newScores.push(v + (i <= scoresLastI ? scores[i] : 0));
                    });
                }
                if (newScores.length > 1) {
                    prevScores = newScores;
                }
            });
            let id = name.split('.')[0];
            self.playersLastScores[id] = prevScores;
        });
    }

    self.players = {};
    if (fs.existsSync(self.playersFile)) {
        try {
            self.players = JSON.parse(fs.readFileSync(self.playersFile));
        } catch (error) {
            log.info(error);
        }
        filterPlayers();
        log.info('read ' + (self.players ? _.size(self.players) : 0) + ' players from ' + self.playersFile);
    }

    if (options.offline) {
        fs.exists(self.playersFile, (exists) => {
            if (exists)
                self.emit('success');
            else
                self.emit('badUrl', 'offline');
        });
    } else {
        self.api = new (require('./ogame_api')).OgameApi(self.url);

        self.api.on('newPlayers', (_players, timestamp) => {
            _.forOwn(_players, (p, id) => {
                if (!(p.id in self.players)) {
                    if (p.id && p.name && p.name !== '')
                        self.players[p.id] = p;
                } else if (p.id) {
                    self.players[p.id].name = p.name;
                    self.players[p.id].status = p.status;
                }
            });
            filterPlayers();
            updatePlayersJs();
            self.emit('success');
        });

        self.api.on('response', () => {
            self.streams = {};
        });

        self.api.on('newScores', (scoresAll) => {
            var updatePlayers = false;
            _.forOwn(scoresAll.players, (score, id) => {
                var scores = [scoresAll.timestamp];
                _.forOwn(score, (p, v) => {
                    scores.push(p);
                });
                if (!self.players[id]) {
                    self.players[id] = { id: id, name: id, status: '' };
                    log.info('scores of new player ' + id);
                    updatePlayers = true;
                }
                if (scores.length >= 10) {
                    self.players[id].score = {
                        t: scores[1],
                        e: scores[2],
                        r: scores[3],
                        m: scores[4],
                        s: scores[5],
                        mb: scores[6],
                        md: scores[7],
                        ml: scores[8],
                        h: scores[9]
                    };
                } else {
                    log.error('id: ' + id + ' scores.length: ' + scores.length);
                }

                let newScores = '';
                let noDiffAtTheEnd = 0;
                if (self.playersLastScores[id]) {
                    let lastI = self.playersLastScores[id].length - 1;
                    let lastIWithDiff = 0;
                    self.playersLastScores[id].forEach ((n, i) => {
                        let diff = scores[i] - n;
                        newScores += (diff !== 0 ? diff : '') + (i !== lastI ? ',' : '');
                        if (diff !== 0)
                            lastIWithDiff = i;
                    });
                    noDiffAtTheEnd = lastI - lastIWithDiff;
                } else {
                    newScores = scores.join(',');
                    // log.info('new player ' + id);
                }
                self.playersLastScores[id] = scores;
                if (noDiffAtTheEnd > 0)
                    newScores = newScores.slice(0, -noDiffAtTheEnd); // remove all ',' at the end
                newScores += '\n';
                fs.appendFile(path.join(self.scoresDir, id + '.csv'), newScores, (err) => {
                    if (err) log.error(err);
                });
            });
            if (updatePlayers)
                self.api.updatePlayers();
            else
                updatePlayersJs();
        });


        self.api.on('error', (error) => {
            // log.error(error);
        });

        self.api.on('badUrl', (error) => {
            self.emit('badUrl', error);
        });

        log.info('start in ' + (options.delayedStart || 0) + ' ms');
        setTimeout(self.api.start, options.delayedStart || 0);
    }

    function createDirIfNotExist (dir) {
        if (!fs.existsSync(dir)) {
            log.info('creating dir ' + dir);
            fs.mkdirSync(dir);
            return true;
        } else
            return false;
    }

    function filterPlayers () {
        _.forOwn(self.players, (p, id)=>{
            if (!p.name || p.name === '') {
                log.info('removing empty player: ' + id);
                delete self.players[id];
            }
        });
    }

    self.getScores = function (id, cb) {
        var fileName = id + '.csv';
        cb && cb.success(fs.readFileSync(path.join(self.scoresDir, fileName), 'utf-8'));
    };

    function updatePlayersJs () {
        createDirIfNotExist(self.universesDir);
        createDirIfNotExist(self.universeDir);
        createDirIfNotExist(self.scoresDir);
        fs.writeFile(path.join(self.playersFile), JSON.stringify(self.players), function (err) {
            if (err) return log.error(err);
            log.info('updated ' + self.playersFile);
        });
    }

    self.getPlayers = function () {
        return self.players;
    };

    self.stop = function () {
        self.api && self.api.stop();
    };
}

util.inherits(Universe, EventEmitter);

module.exports = {
    Universe
};
