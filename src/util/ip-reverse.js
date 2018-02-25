var dns = require('dns');

function reverseLookup (ip, cb) {
    if (typeof ip === 'string')
        dns.reverse(ip, function (err, domains) {
            if(err != null)	cb(null, err);
            var ret = '';
            domains && domains.forEach(function (domain) {
                // dns.lookup(domain,function(err, address, family){
                ret += domain + ' ';
                // });
            });
            cb(ret.trim());
        });
}
module.exports = {
    reverseLookup
};
