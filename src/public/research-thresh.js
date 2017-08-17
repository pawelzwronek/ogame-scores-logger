$(function () {
    var resData = [
        [101, 200, 1000, 200, -1, 18, 'Espionage Technology'],
        [102, -1, 400, 600, -1, 25, 'Computer Technology'],
        [103, 800, 200, -1, -1, 20, 'Weapons Technology'],
        [104, 200, 600, -1, -1, 18, 'Shielding Technology'],
        [105, 1000, -1, -1, -1, 19, 'Armour Technology'],
        [106, -1, 800, 400, -1, 18, 'Energy Technology'],
        [107, -1, 4000, 2000, -1, 6, 'Hyperspace Technology'],
        [108, 400, -1, 600, -1, 18, 'Combustion Drive'],
        [109, 2000, 4000, 600, -1, 17, 'Impulse Drive'],
        [110, 10000, 20000, 6000, -1, 15, 'Hyperspace Drive'],
        [111, 200, 100, -1, -1, 12, 'Laser Technology'],
        [112, 1000, 300, 100, -1, 25, 'Ion Technology'],
        [113, 2000, 4000, 1000, -1, 20, 'Plasma Technology'],
        [114, 240000, 400000, 160000, -1, 15, 'Intergalactic Research Network'],
        [116, 0, 0, 0, -1, -1, 'Graviton Technology'],
        [117, 4000, 8000, 4000, 1.75, 36, 'Astrophysics'],
    ];

    var researchThresh = [];
    for (let ii = 0; ii < resData.length; ii++) {
        for(let lvl = 0 ; lvl < resData[ii][5]; lvl++) {
            let metal = (resData[ii][1] > -1) ? resData[ii][1] : 0;
            let crystal = (resData[ii][2] > -1) ? resData[ii][2] : 0;
            let deuterium = (resData[ii][3] > -1) ? resData[ii][3] : 0;
            let base = (resData[ii][4] > -1) ? resData[ii][4] : 2;

            metal = metal * Math.pow(base, lvl);// - metal;
            crystal = crystal * Math.pow(base, lvl);// - crystal;
            deuterium = deuterium * Math.pow(base, lvl);// - deuterium;

            // if (base === 2) {
            //     metal = metal * Math.pow(2, lvl);// - metal;
            //     crystal = crystal * Math.pow(2, lvl);// - crystal;
            //     deuterium = deuterium * Math.pow(2, lvl);// - deuterium;
            // } else {
            //     var met = 0;
            //     var cris = 0;
            //     var deut = 0;
            //     for (let j = 0; j < lvl; j++) {
            //         met += Math.floor(metal * Math.pow(base, j));
            //         cris += Math.floor(crystal * Math.pow(base, j));
            //         deut += Math.floor(deuterium * Math.pow(base, j));
            //     }
            //     metal = met;
            //     crystal = cris;
            //     deuterium = deut;
            // }

            let points = Math.floor((metal + crystal + deuterium) / 1000);
            researchThresh.push({ points: points, lvl: lvl + 1, name: resData[ii][6], id: resData[ii][0] });
        }
    }
    researchThresh = researchThresh.sort((a,b) => a.points - b.points);
    // researchThresh.forEach(r => log(JSON.stringify(r)));

    window.findResearch = function (points, maxError = 10) {
        let res = [];
        researchThresh.forEach(r => {
            let overshot = (points / r.points * 100 - 100);
            if (Math.abs(points - r.points) <= 1)
                overshot = 0;
            if (points >= r.points && overshot <= maxError) {
            // if (Math.abs(overshot) < maxError) {
                res.push({ res: r, overshot: overshot });
            }
        });
        if (res.length > 0)
            return res.sort((a,b) => Math.abs(a.overshot) - Math.abs(b.overshot));
        else
            return window.findResearch(points, maxError + 5);
    };

    window.truncateDecimals = function (number, digits) {
        var multiplier = Math.pow(10, digits),
            adjustedNum = number * multiplier,
            truncatedNum = Math[adjustedNum < 0 ? 'ceil' : 'floor'](adjustedNum);
        return truncatedNum / multiplier;
    };
});
