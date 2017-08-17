/**
 * Configurations of logger.
 */
const fs = require('fs');

function Log (prefix, fileName) {
    if (!(this instanceof Log)) {
        return new Log(prefix, fileName);
    }
    this.prefix = prefix;
    if (fileName)
        this.fileName = require('path').resolve(fileName);
}
Log.prototype.time = function () {
    let t = new Date().toISOString(); // "2017-08-17T14:19:38.875Z"
    return t.slice(0,10) + ' ' + t.slice(11,19);
    // var d = new Date();
    // return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' +
    //     d.getFullYear().toString().slice(-2) + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2);
};

Log.prototype.info = function (s) {
    var ss = this.time() + ' ' + this.prefix + ': ' + s;
    if (this.fileName) {
        fs.appendFile(this.fileName, ss + '\n', function (err) {
            // if (err) throw err;
        });
    }else
        console.info(ss);
};

Log.prototype.error = function (s) {
    var ss = this.time() + ' ' + this.prefix + ' ERROR: ' + s + (s.stack || '');
    if (this.fileName) {
        fs.appendFile(this.fileName, ss + '\n', function (err) {
            // if (err) throw err;
        });
    }else
        console.error(ss);
};


module.exports = {
    Log
};

