/* eslint no-unused-vars: "off" */

// Log a message
function log (message) {
    // var $el = $('<li>').addClass('log').text(message);
    let t = new Date().toISOString(); // "2017-08-17T00:47:39"
    t = t.slice(0,10) + ' ' + t.slice(11,19);
    window.console.log(t + ': ' + message);
}


Array.prototype.remove = function () {
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};

function timeMs () {return new Date().getTime();}
