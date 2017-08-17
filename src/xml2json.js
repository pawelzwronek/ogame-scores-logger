module.exports = {
    xml2json
};

function xml2json (xml) {
    try {
        var obj = {};
        if (xml.children.length > 0) {
            for (var i = 0; i < xml.children.length; i++) {
                var item = xml.children.item(i);
                var nodeName = item.nodeName;

                if (typeof (obj[nodeName]) === 'undefined') {
                    obj[nodeName] = xml2json(item);
                } else {
                    if (typeof (obj[nodeName].push) === 'undefined') {
                        var old = obj[nodeName];

                        obj[nodeName] = [];
                        obj[nodeName].push(old);
                    }
                    obj[nodeName].push(xml2json(item));
                }
            }
        } else {
            obj = xml.textContent;
        }
        return obj;
    } catch (e) {
        window.console.log(e.message);
    }
}
