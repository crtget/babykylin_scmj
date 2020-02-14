"use strict";

exports.MTableMgr = require('./table_mgr.js');
exports.MHulib = require('./hulib.js');

exports.Init = function () {
    console.log("start init mjlib...");
    this.MTableMgr.Init();
    this.MTableMgr.LoadTable();
    this.MTableMgr.LoadFengTable();
    console.log("end init mjlib");
};

exports.checkTingPai = function (seatData, begin, end, gui1, gui2) {
    var cards = [
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0,
    ];

    for (var k in seatData.countMap) {
        cards[k] += seatData.countMap[k];
    }

    for (var i = begin; i < end; ++i) {
        if (seatData.tingMap[i] != null) {
            continue;
        }
        var ret = this.MHulib.get_hu_info(cards, i, gui1, gui2)
        if (ret) {
            //平胡 0番
            seatData.tingMap[i] = {
                pattern: "normal",
                fan: 0
            };
        }
    }
}

exports.canHu = function (seatData, cur_card, gui1, gui2) {
    var cards = [
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0,
    ];

    for (var k in seatData.countMap) {
        cards[k] += seatData.countMap[k];
    }

    return this.MHulib.get_hu_info(cards, cur_card, gui1, gui2);
}
