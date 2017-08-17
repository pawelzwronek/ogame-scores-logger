module.exports = function (path, cb) {
    new (require('./cmd_exec'))('dir /b', [path.replace(/\//g,'\\')],
    // new (require('./cmd_exec'))('dir /b', [path], 
        function (me, data) {
            me.stdout += data.toString();
        },
        function (me) {
            me.exit = 1;
            var files = me.stdout.split('\r\n');
            if (files && files.length > 0)
                if (files[files.length - 1] === '')
                    files.pop();
            cb(null, files);
        },
        function (err) {
            cb(err + ' : ' + path);
        });
};
