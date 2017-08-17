module.exports = function (cmd, args, cb_stdout, cb_end, cb_error) {
    var spawn = require('child_process').spawn;
    var child = spawn('cmd', ['/c ' + cmd + ' ' + args.join(' ')]);
    var _this = this;
    _this.exit = 0; // Send a cb to set 1 when cmd exits
    _this.stdout = '';
    child.stdout.on('data', function (data) {
        cb_stdout(_this, data); });
    child.stdout.on('close', function () {
        cb_end(_this); });
    child.stderr.on('data', function (data) {
        cb_error && cb_error(data);
    });
};
