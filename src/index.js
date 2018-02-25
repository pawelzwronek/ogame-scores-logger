require('use-strict');

const fs = require('fs');
const log = require('./util/logger').Log('srv');
const logFile = require('./util/logger').Log('srv', 'server.log');
const _ = require('lodash');
const universe = require('./universe');
const ip_reverse = require('./util/ip-reverse').reverseLookup;
const path = require('path');

const argv = require('minimist')(process.argv.slice(2));
var public_dir = path.join(__dirname,'public/');

var arg_universe = argv.u || argv.universe;
var offline = argv.offline ? true : false;

log.info(public_dir);
log.info('argv: ' + JSON.stringify(argv));

var universes = {};

var unidir = 'universes_small/';

function runUniverse (name, cb, delayedStart) {
    if (!(name in universes)) {
        var uni = universes[name] = new universe.Universe(name, { offline: offline, delayedStart: delayedStart });
        uni.on('success', () => {
            cb && cb.success(name);
        });
        uni.on('badUrl', (error) => {
            cb && cb.error('badUrl ' + error);
            uni.stop();
            delete universes[name];
        });
    }
}

if (fs.existsSync(unidir)) {
    let servers = fs.readdirSync(unidir);
    log.info('servers: ' + servers);
    let timeout = 0;
    servers.forEach ((uni) => {
        runUniverse(uni, null, timeout);
        log.info('run ' + uni + ' in ' + timeout / 1000 + ' sec');
        timeout += 60 * 1000;
    });
} else {
    log.info(unidir + ' not exists!');
}

if (arg_universe && arg_universe.length > 0)
    runUniverse(arg_universe);

if (_.size(universes) === 0) {
    log.info('running default server');
    runUniverse('s802-en');
}


// var _startHrtime = process.hrtime();
// function getTimeMs(time) {
//         var hrtime = process.hrtime(_startHrtime);
//         return ( hrtime[0] * 1000000 + hrtime[1] / 1000 ) / 1000;
// }
// function log(s) {
//     console.log(getTimeMs().toFixed(2) + ': ' + s);
// }


const express = require('express');
var compression = require('compression');
// Create server
const app = express();
app.disable('x-powered-by');
app.use(compression({ chunkSize: 4096, threshold: 2048 }));

// Routes
app.get('/', function (req, res, next) {
    log.info('GET:' + req.originalUrl + ' from: ' + req.ip);
    ip_reverse(req.ip, (domain, err)=>{
        if (!err)
            logFile.info('GET:' + req.originalUrl + ' from: ' + req.ip + '(' + domain + ')');
    });
    next();
});

app.use(express.static(public_dir));
app.get('/uni/:uni/scores', (req, res) => {
    log.info('GET:' + req.originalUrl);
    logFile.info('GET:' + req.originalUrl + ' from: ' + req.ip);
    if (req.params.uni in universes) {
        var uni = universes[req.params.uni];
        uni.getScores(req.query.id, {
            success: (scores) => {
                if (scores)
                    res.send(scores);
                else
                    log.info('no scores for id ' + req.query.id);
            },
            error: (err) => {
                log.error(err);
                res.end();
            }
        });
    } else {
        log.error('No universe ' + req.params.uni);
    }
});

app.get('/uni/:uni/', (req, res) => {
    log.info('GET:' + req.originalUrl);
    res.sendFile(path.join(public_dir,'scores.html'));
});

app.get('/uni/:uni/players', (req, res) => {
    log.info('GET:' + req.originalUrl);
    if (req.params.uni in universes) {
        var uni = universes[req.params.uni];
        res.send(JSON.stringify(uni.getPlayers()));
    } else {
        log.error('No universe ' + req.params.uni);
    }
});

app.post('/runUniverse', (req, res) => {
    log.info('GET:' + req.originalUrl);
    var uni = req.query.name;
    runUniverse(uni, {
        success: (name)=>{
            res.json({ name: name });
        },
        error: (error) => {
            log.error(error);
            res.json({ error: error });
        }
    });
});

app.get('/universes', (req, res) => {
    log.info('GET:' + req.originalUrl);
    var unis = [];
    _.forOwn(universes, (uni, uniName) => {
        unis.push({ name: uniName, since: uni.minTimestamp * 1000 });
    });
    res.json(unis);
});

app.get('/logs/', (req, res) => {
    log.info('GET:' + req.originalUrl + ' from: ' + req.ip);
    logFile.info('GET:' + req.originalUrl + ' from: ' + req.ip);
    res.sendFile(logFile.fileName);
});

// // POST /posts
// app.post('/posts', (req, res) => {
//     db.get('posts')
//         .push(req.body)
//         .last()
//         .assign({ id: Date.now() })
//         .write()
//         .then(post => res.send(post))
// });

app.listen(8080, '0.0.0.0', () => log.info('Server is listening'));
