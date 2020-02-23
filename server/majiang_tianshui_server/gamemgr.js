// 
var roomMgr = require("./roommgr");
var userMgr = require("./usermgr");
var mjutils = require('./mjutils');
var mjlib = require('../mjlib/api');
mjlib.Init();
var db = require("../utils/db");
var dealerdb = require('../utils/dealerdb');
var crypto = require("../utils/crypto");
var games = {};
var gamesIdBase = 0;

var ACTION_CHUPAI = 1;
var ACTION_MOPAI = 2;
var ACTION_PENG = 3;
var ACTION_GANG = 4;
var ACTION_HU = 5;
var ACTION_ZIMO = 6;
var ACTION_CHI = 7;
var ACTION_TING = 8;
var PAI_BAIBAN = 29;
var PAI_JIUWAN = 26;
var HU_PAI_SPECAIL = 80;

var gameSeatsOfUsers = {};

function getMJType(id) {
    if (id >= 0 && id < 9) {
        //筒
        return 0;
    }
    else if (id >= 9 && id < 18) {
        //条
        return 1;
    }
    else if (id >= 18 && id < 27) {
        //万
        return 2;
    }
    else if (id >= 27 && id < 34) {
        //风
        return 3;
    }
}

// 洗牌
function shuffle(game) {

    var mahjongs = [];

    //测试
    ind_0 = 0;
    ind_1 = 0;
    ind_2 = 0;
    ind_3 = 0;

    //筒 (0 ~ 8 表示筒子
    var index = 0;
    for (var i = 0; i < 9; ++i) {
        for (var c = 0; c < 4; ++c) {
            mahjongs[index] = i;
            index++;
        }
    }

    //条 9 ~ 17表示条子
    for (var i = 9; i < 18; ++i) {
        for (var c = 0; c < 4; ++c) {
            mahjongs[index] = i;
            index++;
        }
    }

    //万
    //条 18 ~ 26表示万
    for (var i = 18; i < 27; ++i) {
        for (var c = 0; c < 4; ++c) {
            mahjongs[index] = i;
            index++;
        }
    }

    //风 东南西北中发白
    //条 27 ~ 34表示风
    if (game.feng == true) {
        for (var i = 27; i < 34; ++i) {
            for (var c = 0; c < 4; ++c) {
                mahjongs[index] = i;
                index++;
            }
        }
    }


    for (var i = 0; i < mahjongs.length; ++i) {
        var lastIndex = mahjongs.length - 1 - i;
        var index = Math.floor(Math.random() * lastIndex);
        var t = mahjongs[index];
        mahjongs[index] = mahjongs[lastIndex];
        mahjongs[lastIndex] = t;
    }

    for (var i = 0; i < game.mahjongs.length; ++i) {
        var t = mahjongs[i];
        game.mahjongs[i] = t;
    }
    //底牌
    for (var i = game.mahjongs.length; i < mahjongs.length; i++) {
        var t = mahjongs[i];
        game.diMahjongs.push(t);
    }
}

// 天胡 暗杠 一条龙 0,1,2,3,4,5,6,7,8,0,9,9,9,10,9,11,12,0,13,14,15,16
// 天胡 七小对 0,0,1,1,2,2,3,3,4,4,5,5,6,7,6,8,0,9,9,9,10,9,11,12,0,13,14,15,16
// 天胡 豪华七小对 0,0,1,1,2,2,3,3,4,4,6,6,6,6,8,0,9,9,9,10,9,11,12,0,13,14,15,16
// 天胡 杠上花 0,1,1,2,2,3,3,4,4,4,6,6,6,8,6,0,8,0,9,9,9,10,9,11,12,0,13,14,15,16
// 缺一门 1
// var p_0 = [3, 19, 10, 6, 8, 2, 14, 30, 12, 31, 27, 16, 27, 13, 13, 18, 15, 1, 2, 25, 19, 29, 9, 6, 23, 28, 7, 14, 31, 31];
// var p_1 = [19, 32, 26, 17, 3, 30, 26, 5, 11, 33, 21, 4, 29, 5, 20, 26, 8, 27, 14, 15, 24, 15, 32, 27, 8, 1, 9, 33, 6, 2];
// var p_2 = [10, 23, 23, 14, 30, 21, 4, 7, 19, 3, 7, 21, 4, 31, 4, 9, 1, 25, 28, 33, 1, 2, 11, 28, 17, 0, 18, 0];
// var p_3 = [9, 13, 5, 23, 16, 24, 32, 18, 20, 17, 12, 26, 30, 18, 16, 22, 3, 6, 24, 17, 15, 0, 12, 25, 33, 10, 29, 21, 22, 12];

var p_0 = [0, 0, 0, 1, 4, 5, 6, 7, 8, 0, 9, 9, 9, 9, 10, 9, 11, 12, 1, 13, 14, 15, 16];
var p_1 = [0, 0, 0, 1, 4, 5, 6, 7, 8, 0, 9, 9, 9, 9, 10, 9, 11, 12, 1, 13, 14, 15, 16];
var p_2 = [0, 0, 0, 1, 4, 5, 6, 7, 8, 0, 9, 9, 9, 9, 10, 9, 11, 12, 1, 13, 14, 15, 16];
var p_3 = [0, 0, 0, 1, 4, 5, 6, 7, 8, 0, 9, 9, 9, 9, 10, 9, 11, 12, 1, 13, 14, 15, 16];
/*
var p_0 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 9, 9, 9, 10, 9, 11, 12, 0, 13, 14, 15, 16];
var p_1 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 9, 9, 9, 10, 9, 11, 12, 0, 13, 14, 15, 16];
var p_2 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 9, 9, 9, 10, 9, 11, 12, 0, 13, 14, 15, 16];
var p_3 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 9, 9, 9, 10, 9, 11, 12, 0, 13, 14, 15, 16];
*/

var ind_0 = 0;
var ind_1 = 0;
var ind_2 = 0;
var ind_3 = 0;

function mopai(game, seatIndex, isGang) {

    var data = game.gameSeats[seatIndex];
    var mahjongs = data.holds;
    if (game.currentIndex >= game.mahjongs.length) {
        // if (isGang!=undefined && isGang == true) 
        // {
        //     if (game.diMahjongs.length == 0) {
        //         return -1;
        //     }
        //     var pai = game.diMahjongs.shift();
        //     //从底牌里拿
        //     // checkCanTingPai(game,data);
        //     mahjongs.push(pai);
        //     //统计牌的数目 ，用于快速判定（空间换时间）
        //     var c = data.countMap[pai];
        //     if(c == null) {
        //         c = 0;
        //     }
        //     data.countMap[pai] = c + 1;

        //     return pai;
        // }
        return -1;
    }


    if (data.zhenhuanpai != -1) {
        // 测试代码
        var i = game.currentIndex;
        for (; i < game.mahjongs.length; ++i) {
            if (game.mahjongs[i] == data.zhenhuanpai) {
                break;
            }
        }

        if (i < game.mahjongs.length) {
            var tt = game.mahjongs[i];
            game.mahjongs[i] = game.mahjongs[game.currentIndex];
            game.mahjongs[game.currentIndex] = tt;
        }
        data.zhenhuanpai = -1; //重置回默认值
    }


    var pai = game.mahjongs[game.currentIndex];
	
    
    /*
     if(seatIndex == 0)
     {
         pai = p_0[ind_0];
         ind_0++;
    }
     else if(seatIndex == 1)
     {
       pai = p_1[ind_1];
         ind_1++;
     }
     else if(seatIndex == 2)
     {
         pai = p_2[ind_2];
        ind_2++;
     }
     else if(seatIndex == 3)
     {
         pai = p_3[ind_3];
         ind_3++;
     }

    checkCanTingPai(game,data);

    */


    mahjongs.push(pai);

    //统计牌的数目 ，用于快速判定（空间换时间）
    var c = data.countMap[pai];
    if (c == null) {
        c = 0;
    }
    data.countMap[pai] = c + 1;
    game.currentIndex++;
    return pai;
}

function deal(game) {
    //强制清0
    game.currentIndex = 0;
    xx = 0;
    yy = 0;



    //每人13张 一共 13*4 ＝ 52张 庄家多一张 53张
    var count = game.roomInfo.conf.renshuxuanze;
    var seatIndex = game.zhuang;
    for (var i = 0; i < 13 * count; i++) {
        var mahjongs = game.gameSeats[seatIndex].holds;
        if (mahjongs == null) {
            mahjongs = [];
            game.gameSeats[seatIndex].holds = mahjongs;
        }
        mopai(game, seatIndex);
        seatIndex++;
        seatIndex %= count;
    }

    //庄家多摸最后一张
    mopai(game, game.zhuang);
    for (var i = 0; i < count; i++) {
        var seatDataTmp = game.gameSeats[i];
        if (i == game.zhuang) {
            var lastPai = seatDataTmp.holds[seatDataTmp.holds.length - 1];
            seatDataTmp.holds.pop();
            seatDataTmp.countMap[lastPai]--;
            checkCanTingPai(game, seatDataTmp);
            seatDataTmp.holds.push(lastPai);
            var c = seatDataTmp.countMap[lastPai];
            if (c == null) c = 0;
            seatDataTmp.countMap[lastPai] = c + 1;
        } else {
            checkCanTingPai(game, seatDataTmp);
        }
        var len = seatDataTmp.holds.length - 1;
        if (i == game.zhuang) {
            checkCanHu(game, seatDataTmp, seatDataTmp.holds[len], true);
            checkCanAnGang(game, seatDataTmp);

            checkCanJiaoTing(game, seatDataTmp);
            if (seatDataTmp.canjiaoting == true) {
                seatDataTmp.tingSign = 1;//摸听标记
            }
        }

        checkTingMap(seatDataTmp);

        if (hasOperations(seatDataTmp)) {
            sendOperations(game, seatDataTmp, seatDataTmp.holds[len]);
        }

    }

    //当前轮设置为庄家
    game.turn = game.zhuang;
}

//检查是否可以碰
function checkCanPeng(game, seatData, targetPai) {
    //叫听后不能碰
    if (seatData.isTinged) {
        return false;
    }
    var count = seatData.countMap[targetPai];
    if (count != null && count >= 2) {
        seatData.canPeng = true;
    }
}

exports.getRenshu = function (roomId) {
    var roomInfo = roomMgr.getRoom(roomId);
    return roomInfo.conf.renshuxuanze;
}

//检查是否可以吃
function checkCanChi(game, seatData, targetPai) {

    if (seatData.isTinged) {
        return false;
    }
    if (game.chi == false) {
        return;
    }

    var pai = targetPai;
    var type = getMJType(pai);
    var a = 0, b = 0, c = 0;

    // 如果是风
    if (type == 3) {
        return;
    }

    seatData.canchipai = [];
    // 345
    a = pai;
    b = pai + 1;
    c = pai + 2;
    if (seatData.countMap[b] >= 1 && seatData.countMap[c] >= 1 &&
        getMJType(b) == type && getMJType(c) == type) {
        seatData.canChi = true;
        var ary = [a, b, c];
        seatData.canchipai.push(ary);
    }
    // 234
    a = pai - 1;
    b = pai;
    c = pai + 1;
    if (seatData.countMap[a] >= 1 && seatData.countMap[c] >= 1 &&
        getMJType(a) == type && getMJType(c) == type) {
        seatData.canChi = true;
        var ary = [a, b, c];
        seatData.canchipai.push(ary);
    }
    // 123
    a = pai - 2;
    b = pai - 1;
    c = pai;
    if (seatData.countMap[a] >= 1 && seatData.countMap[b] >= 1 &&
        getMJType(a) == type && getMJType(b) == type) {
        seatData.canChi = true;
        var ary = [a, b, c];
        seatData.canchipai.push(ary);
    }
}

//检查是否可以点杠
function checkCanDianGang(game, seatData, targetPai) {
    //检查玩家手上的牌
    //如果没有牌了，则不能再杠
    var numOfMJ = getNumOfMj(game);
    // if(game.mahjongs.length <= game.currentIndex){
    if (numOfMJ <= 0) {
        return;
    }

    var count = seatData.countMap[targetPai];
    if (count != null && count >= 3) {
        seatData.canGang = true;
        seatData.gangPai.push(targetPai);
        return;
    }
}

//检查是否可以暗杠
function checkCanAnGang(game, seatData) {
    //如果没有牌了，则不能再杠
    var numOfMJ = getNumOfMj(game);
    // if(game.mahjongs.length <= game.currentIndex){
    if (numOfMJ <= 0) {
        return;
    }

    for (var key in seatData.countMap) {
        var pai = parseInt(key);
        if (getMJType(pai) != seatData.que) {
            var c = seatData.countMap[key];
            if (c != null && c == 4) {

                if (seatData.isTinged) {

                    seatData.countMap[key] = 0;

                    //先拷贝出原版的数据
                    var old_holds = [];
                    for (var j = 0; j < seatData.holds.length; j++) {
                        old_holds.push(seatData.holds[j]);
                    }
                    var oldTingMap = {};
                    for (var a in seatData.tingMap) {
                        oldTingMap[a] = seatData.tingMap[a];
                    }

                    var index = seatData.holds.indexOf(pai);
                    var oldpos = [];
                    while (index != -1) {
                        seatData.holds.splice(index, 1);
                        oldpos.push(index);
                        index = seatData.holds.indexOf(pai);
                    }

                    checkCanTingPai(game, seatData);
                    var canTing = isTinged(seatData);
                    //置回去
                    seatData.holds = old_holds;
                    seatData.countMap[key] = c;
                    seatData.tingMap = oldTingMap;
                    if (canTing == false) {
                        continue;
                    }
                    //检查是否胡的牌和之前一样
                    var same = true;
                    for (var hupai in seatData.hupaiList) {
                        if (seatData.tingMap[hupai] == null) {
                            same = false;
                            break;
                        }
                    }
                    if (same == false) {
                        continue;
                    }
                    console.log("checkangang: cangang cur state isTinged = true");
                }
                seatData.canGang = true;
                seatData.gangPai.push(pai);
            }
        }
    }
}

//检查是否可以弯杠(自己摸起来的时候)
function checkCanWanGang(game, seatData) {
    //如果没有牌了，则不能再杠
    var numOfMJ = getNumOfMj(game);
    // if(game.mahjongs.length <= game.currentIndex){
    if (numOfMJ <= 0) {
        return;
    }

    //从碰过的牌中选
    for (var i = 0; i < seatData.pengs.length; ++i) {
        var pai = seatData.pengs[i];
        var c = seatData.countMap[pai];
        if (c != null && c == 1) {

            if (seatData.isTinged) {
                //先拷贝出原版的数据
                var old_holds = [];
                for (var j = 0; j < seatData.holds.length; j++) {
                    old_holds.push(seatData.holds[j]);
                }
                var oldTingMap = {};
                for (var a in seatData.tingMap) {
                    oldTingMap[a] = seatData.tingMap[a];
                }

                seatData.countMap[pai] = 0;
                var index = seatData.holds.indexOf(pai);
                if (index != -1) {
                    seatData.holds.splice(index, 1);
                }
                checkCanTingPai(game, seatData);
                var canTing = isTinged(seatData);
                //置回去
                seatData.holds = old_holds;
                seatData.countMap[pai] = c;
                seatData.tingMap = oldTingMap;
                if (canTing == false) {
                    continue;
                }

                //检查是否胡的牌和之前一样
                var same = true;
                for (var hupai in seatData.hupaiList) {
                    if (seatData.tingMap[hupai] == null) {
                        same = false;
                        break;
                    }
                }
                if (same == false) {
                    continue;
                }
                console.log("checkwangang: cangang cur state isTinged = true");
            }
            seatData.canGang = true;
            seatData.gangPai.push(pai);
        }
    }
}

function checkCanHu(game, seatData, targetPai, ismopai) {
    game.lastHuPaiSeat = -1;
    seatData.canHu = false;

    //选择了必须报听 但是没有报听则不允许胡牌
    if (game.baoting && seatData.isTinged == false) {
        return;
    }

    for (var k in seatData.tingMap) {

        if (targetPai == k) {
            //天水麻将 我自己打过的牌 不能被炮胡 只能自摸
            // if (ismopai == false) {
            //     if (seatData.chupaiList.indexOf(targetPai) != -1) {
            //         console.log("不能炮胡 只能自摸:" + targetPai);
            //         continue;
            //     }
            // }
            seatData.canHu = true;
            break;
        }
    }
}

function clearAllOptions(game, seatData) {
    var fnClear = function (sd) {
        sd.canPeng = false;
        sd.canGang = false;
        sd.canChi = false;
        sd.gangPai = [];
        sd.canHu = false;
        sd.canjiaoting = false;
        // sd.hued = false;
        sd.lastFangGangSeat = -1;
    }
    if (seatData) {
        fnClear(seatData);
    }
    else {
        game.qiangGangContext = null;
        for (var i = 0; i < game.gameSeats.length; ++i) {
            fnClear(game.gameSeats[i]);
        }
    }
}

//检查能否叫停
function checkCanJiaoTing(game, seatData) {

    if (seatData.canHu) {
        return;
    }
    if (seatData.isTinged) {
        return;
    }

    if (!game.baoting) {
        return;
    }

    seatData.feipaiMap = {};
    //先拷贝出原版的数据
    var old_holds = [];
    var old_countMap = [];
    for (var j = 0; j < seatData.holds.length; j++) {
        var pai = seatData.holds[j];
        old_holds.push(pai);
        var c = old_countMap[pai];
        if (c == null) c = 0;
        old_countMap[pai] = c + 1;
    }

    var oldTingMap = {};
    for (var a in seatData.tingMap) {
        oldTingMap[a] = seatData.tingMap[a];
    }

    //创建临时数据
    var new_holds = [];
    var new_countMap = [];
    //此处14张牌任何一张都有可能是多余的！
    for (var x = 0; x < seatData.holds.length; x++) {
        var item_holds = seatData.holds.slice(0, x);
        var right = seatData.holds.slice(x + 1);
        item_holds = item_holds.concat(right);
        var item_countMap = [];

        for (var y = 0; y < item_holds.length; ++y) {
            var card = item_holds[y];
            var c = item_countMap[card];
            if (c == null) c = 0;
            item_countMap[card] = c + 1;
        }

        new_holds.push(item_holds);
        new_countMap.push(item_countMap);
    }

    //检查叫牌情况
    for (var x = 0; x < new_holds.length; x++) {
        seatData.holds = new_holds[x];
        seatData.countMap = new_countMap[x];
        checkCanTingPai(game, seatData);
        if (JSON.stringify(seatData.tingMap) != '{}') {
            //证明索引为x的这张牌是废牌
            if (seatData.feipai.indexOf(old_holds[x]) == -1) {
                seatData.feipai.push(old_holds[x]);
                console.log(seatData.seatIndex + "添加一张废牌：" + old_holds[x]);
            }
            var tings = [];
            for (var key in seatData.tingMap) {
                tings.push(key);
            }
            seatData.feipaiMap[old_holds[x]] = tings;
            seatData.canjiaoting = true;
        }
    }

    //将玩家的手牌再设置回去
    seatData.holds = old_holds;
    seatData.countMap = old_countMap;
    seatData.tingMap = oldTingMap;

}
//检查听牌
function checkCanTingPai(game, seatData) {
    seatData.tingMap = {};

    //检查是否是七对 前提是没有碰，也没有杠 ，即手上拥有13张牌
    if (seatData.holds.length >= 13) {
        //有5对牌
        var pairCount = 0;
        var dpAry = [];
        var needPCount = 6;
        if (seatData.holds.length == 14) {
            needPCount = 7;
        }
        for (var k in seatData.countMap) {
            var c = seatData.countMap[k];

            var old = c;

            if (c == 1 || c == 3) {
                dpAry.push(k);
            }

            if (c == 2 || c == 3) {
                pairCount++;
            }
            else if (c == 4) {
                pairCount += 2;
            }
        }

        // 如果已经有6组了那剩下的就可以ting了
        if (pairCount == needPCount) {
            for (var i = 0; i < dpAry.length; i++) {
                var pai = dpAry[i];

                seatData.tingMap[pai] = {
                    fan: 2,
                    pattern: "7pairs"
                };
            }
        }

        if (pairCount == 7) {
            for (var k in seatData.countMap) {
                if (seatData.tingMap[k] == null) {
                    seatData.tingMap[k] = {
                        fan: 2,
                        pattern: "7pairs"
                    };
                }
            }
        }
    }



    checkTingDuiduiHu(seatData, 0, 34);
    //检查是不是平胡
    mjlib.checkTingPai(seatData, 0, 34, 34, 34);
}
//对对胡
function checkTingDuiduiHu(seatData) {


    if (seatData.angangs.length > 0 || seatData.wangangs.length > 0 || seatData.diangangs.length > 0) {
        return false;
    }
    //检查是否是对对胡  由于四川麻将没有吃，所以只需要检查手上的牌
    //对对胡叫牌有两种情况
    //1、N坎 + 1张单牌
    //2、N-1坎 + 两对牌

    var singleCount = 0;
    var colCount = 0;
    var pairCount = 0;
    var arr = [];
    for (var k in seatData.countMap) {
        var c = seatData.countMap[k];
        if (c == 1) {
            singleCount++;
            arr.push(k);
        }
        else if (c == 2) {
            pairCount++;
            arr.push(k);
        }
        else if (c == 3) {
            colCount++;
        }
        else if (c == 4) {
            //手上有4个一样的牌，在四川麻将中是和不了对对胡的 随便加点东西
            singleCount++;
            pairCount += 2;
        }
    }

    var ret = false;
    if ((pairCount == 2 && singleCount == 0) || (pairCount == 0 && singleCount == 1)) {
        for (var i = 0; i < arr.length; ++i) {
            //对对胡1番
            var p = arr[i];
            if (seatData.tingMap[p] == null) {
                ret = true;
                seatData.tingMap[p] = {
                    pattern: "duidui",
                    fan: 1
                };
            }
        }
    }
    return true;
}

function checkTingShiSanBuKao(seatData, begin, end) {

    var holdsLenth = seatData.holds.length;
    if (holdsLenth < 13) {
        return;
    }
    //条筒万
    var typeMap = {};
    var values = {};
    for (var i = 0; i < seatData.holds.length; i++) {

        var pai = seatData.holds[i];
        var vCount = seatData.countMap[pai];

        if (vCount > 1) {
            return;
        }
        var type = getMJType(pai);
        var value = (pai + 1) % 9;
        if (type < 3) {
            if (values[value]) {
                return false;
            } else {
                values[value] = true;
            }
        }
        //记录各色牌的数量
        if (typeMap[type] == null) {
            typeMap[type] = [];
        }
        typeMap[type].push(pai);
    }
    //先检查风  5张~7张
    if (typeMap[3] == null) {
        typeMap[3] = [];
    }
    var fengCount = typeMap[3].length;
    //检查的时候可以忽略一张
    if (fengCount < 4) {
        return;
    }
    //条 万 筒 共7~9张
    var paiCount = 0;
    for (var index = 0; index < 3; index++) {

        var paiList = typeMap[index];
        if (paiList && paiList.length > 3) {
            return false;
        }
        if (paiList) {
            paiCount += paiList.length;
        }
    }
    if (paiCount < 6 || paiCount > 10) {
        return false;
    }

    for (var i = begin; i < end; ++i) {
        //如果这牌已经在和了，就不用检查了
        if (seatData.tingMap[i] != null) {
            continue;
        }


        if (holdsLenth <= 13) {
            if (seatData.countMap[i] > 0) {
                continue;
            }
            //将牌加入到计数中
            var old = seatData.countMap[i];
            if (old == null || old < 0) {
                old = 0;
                seatData.countMap[i] = 1;
            }

            seatData.holds.push(i);
        }

        //逐个判定手上的牌
        var ret = isShiSanBuKao(seatData);
        if (ret) {
            //平胡 0番
            seatData.tingMap[i] = {
                pattern: "shisanbukao",
                fan: 2
            };
        }

        if (holdsLenth <= 13) {
            //搞完以后，撤消刚刚加的牌
            seatData.countMap[i] = old;
            seatData.holds.pop();
        }
    }
}
// 钓将
function isDiaoJiang(seatData) {
    var lastPai = seatData.game.huPai;
    if (lastPai == -1) {
        var len = seatData.holds.length - 1;
        lastPai = seatData.holds[len];
    }
    if (seatData.countMap[lastPai] == 2) {
        return true;
    }
    return false;
}

function getSeatIndex(userId) {
    var seatIndex = roomMgr.getUserSeat(userId);
    if (seatIndex == null) {
        return null;
    }
    return seatIndex;
}

function getGameByUserID(userId) {
    var roomId = roomMgr.getUserRoom(userId);
    if (roomId == null) {
        return null;
    }
    var game = games[roomId];
    return game;
}

function hasOperations(seatData) {
    if (seatData.canGang || seatData.canPeng || seatData.canHu || seatData.canChi || seatData.canjiaoting) {
        return true;
    }
    return false;
}

function sendOperations(game, seatData, pai) {
    if (hasOperations(seatData)) {
        if (pai == -1) {
            pai = seatData.holds[seatData.holds.length - 1];
        }

        if (seatData.tingMap[pai] != null) {
            var ting = seatData.tingMap[pai];
            if (ting.pattern == "hu_custom") {
                pai = ting.pai;
            }
        }
        //记录行为时间戳
        seatData.opt_timestamp = Date.now();
        var data = {
            pai: pai,
            hu: seatData.canHu,
            peng: seatData.canPeng,
            gang: seatData.canGang,
            gangpai: seatData.gangPai,
            chi: seatData.canChi,
            canchipai: seatData.canchipai,
            ting: seatData.canjiaoting,
            timestamp: seatData.opt_timestamp,
        };

        //如果可以有操作，则进行操作
        userMgr.sendMsg(seatData.userId, 'game_action_push', data);

        data.si = seatData.seatIndex;
    }
    else {
        userMgr.sendMsg(seatData.userId, 'game_action_push');
    }
}

function moveToNextUser(game, nextSeat) {
    game.fangpaoshumu = 0;

    //找到下一个没有和牌的玩家
    if (nextSeat == null) {
        while (true) {
            game.turn++;
            game.turn %= game.roomInfo.conf.renshuxuanze;
            var turnSeat = game.gameSeats[game.turn];
            if (turnSeat.hued == false) {
                return;
            }
        }
    }
    else {
        game.turn = nextSeat;
    }
}

function checkTingMap(turnSeat) {
    //通知前端更新tingMap
    var tingAry = [];
    for (var k in turnSeat.tingMap) {
        var tmp = Number.parseInt(k);
        tingAry.push(tmp);
    }
    userMgr.sendMsg(turnSeat.userId, 'game_tingmap_push', { userid: turnSeat.userId, tingMap: tingAry });
}

function doUserMoPai(game, isGang) {
    game.chuPai = -1;
    var turnSeat = game.gameSeats[game.turn];
    turnSeat.lastFangGangSeat = -1;
    turnSeat.guoHu = [];
    var pai = mopai(game, game.turn, isGang);
    //牌摸完了，结束
    if (pai == -1) {
        doGameOver(game, turnSeat.userId);
        return;
    }
    else {
        var numOfMJ = getNumOfMj(game);
        userMgr.broacastInRoom('mj_count_push', numOfMJ, turnSeat.userId, true);
    }

    recordGameAction(game, game.turn, ACTION_MOPAI, pai);

    //通知前端新摸的牌
    userMgr.sendMsg(turnSeat.userId, 'game_mopai_push', pai);
    //检查听牌
    checkTingMap(turnSeat);



    // // 检查是不是可以胡牌
    // checkCanTingPai(game,turnSeat);
    //检查是否可以暗杠或者胡
    //检查胡，直杠，弯杠
    checkCanAnGang(game, turnSeat);
    checkCanWanGang(game, turnSeat, pai);
    //检查看是否可以和
    checkCanHu(game, turnSeat, pai, true);

    //能否叫听
    checkCanJiaoTing(game, turnSeat);

    if (turnSeat.canjiaoting == true) {
        turnSeat.tingSign = 1;//摸听标记
    }
    //广播通知玩家出牌方
    turnSeat.canChuPai = true;
    userMgr.broacastInRoom('game_chupai_push', turnSeat.userId, turnSeat.userId, true);

    //通知玩家做对应操作
    sendOperations(game, turnSeat, game.chuPai);


    var isAutoChuPai = false;
    if (turnSeat.isTinged && !turnSeat.canHu) {
        turnSeat.feipai.push(pai); //上手的牌都是废牌
        console.log(turnSeat.seatIndex + "添加一张废牌：" + pai);
        isAutoChuPai = true;
    }
    if (isAutoChuPai) {
        setTimeout(function () {
            exports.chuPai(turnSeat.userId, pai);
        }, 500);
    }
}

function isQiXiaoDui(seatData) {
    var pairCount = 0;
    for (var k in seatData.countMap) {
        var c = seatData.countMap[k];

        if (c == 2) {
            pairCount++;
        }
        else if (c == 4) {
            pairCount += 2;
        }
    }

    if (pairCount == 7) {
        return true;
    }

    return false;
}

function isHaoHuaQiXiaoDui(seatData) {
    if (isQiXiaoDui(seatData)) {
        for (var k in seatData.countMap) {
            var c = seatData.countMap[k];

            if (c == 4) {
                return true;
            }
        }
    }

    return false;
}


//独一
function isDuYi(seatData) {


    var tingCount = 0;
    for (var k in seatData.tingMap) {
        tingCount++;
    }
    if (isQiXiaoDui(seatData)) {
        return false;
    }
    return tingCount == 1
}
//缺一门
function isQueYiMen(seatData) {

    if (isQingYiSe(seatData)) {
        return false;
    }
    var paiTypeMap = {};
    //手牌
    for (var index = 0; index < seatData.holds.length; index++) {
        var pai = seatData.holds[index];
        var type = getMJType(pai);
        paiTypeMap[type] = true;
    }
    //碰牌
    for (var index = 0; index < seatData.pengs.length; index++) {
        var pai = seatData.pengs[index];
        var type = getMJType(pai);
        paiTypeMap[type] = true;
    }

    for (var index = 0; index < seatData.angangs.length; index++) {
        var pai = seatData.angangs[index];
        var type = getMJType(pai);
        paiTypeMap[type] = true;
    }
    for (var index = 0; index < seatData.wangangs.length; index++) {
        var pai = seatData.wangangs[index];
        var type = getMJType(pai);
        paiTypeMap[type] = true;
    }
    for (var index = 0; index < seatData.diangangs.length; index++) {
        var pai = seatData.diangangs[index];
        var type = getMJType(pai);
        paiTypeMap[type] = true;
    }
    var typeArr = [0, 1, 2];
    var queCount = 0;
    for (var i = 0; i < typeArr.length; i++) {
        var ret = false;
        for (var key in paiTypeMap) {
            var type = parseInt(key);
            if (type == typeArr[i]) {
                ret = true;
                break;
            }
        }
        if (ret == false) {
            queCount++;
        }
    }

    if (queCount == 1) {
        return true;
    }
    return false;
}

//十三不靠 （东西南北中发白 147,258,369）
function isShiSanBuKao(seatData) {

    if (seatData.pengs.length > 0 || seatData.diangangs.length > 0 || seatData.angangs.length > 0 || seatData.wangangs.length > 0) {
        return false;
    }
    if (seatData.holds.length < 14) {
        return false;
    }
    //条筒万
    var typeMap = {};
    var values = {};
    for (var i = 0; i < seatData.holds.length; i++) {

        var pai = seatData.holds[i];
        var vCount = seatData.countMap[pai];

        if (vCount > 1) {
            return false;
        }
        var type = getMJType(pai);
        var value = (pai + 1) % 9;
        if (type < 3) {
            if (values[value]) {
                return false;
            } else {
                values[value] = true;
            }
        }
        //记录各色牌的数量
        if (typeMap[type] == null) {
            typeMap[type] = [];
        }
        typeMap[type].push(pai);
    }
    //先检查风  5张~7张
    var fengCount = typeMap[3].length;

    if (fengCount < 5) {
        return false;
    }
    //条 万 筒 共7~9张
    var paiCount = 0;
    for (var index = 0; index < 3; index++) {

        var paiList = typeMap[index];
        if (paiList == null || paiList.length < 1 || paiList.length > 3) {
            return false;
        }
        paiCount += paiList.length;
    }
    if (paiCount < 7 || paiCount > 9) {
        return false;
    }
    //检查1 4 7 2 5 8 3 6 9
    var list1 = [1, 4, 7];
    var list2 = [2, 5, 8];
    var list3 = [3, 6, 9];

    var findArr = [];
    for (var index = 0; index < 3; index++) {
        var flag = 0;
        for (var i = 0; i < typeMap[index].length; i++) {
            var pai = typeMap[index][i];
            var value = (pai + 1) % 9;
            if (value == 0) {
                value = 9;
            }
            if (list1.indexOf(value) != -1) {
                if (flag == 0 || flag == 1) {
                    flag = 1;
                } else {
                    flag = -1;
                    break;
                }
            }
            else if (list2.indexOf(value) != -1) {
                if (flag == 0 || flag == 2) {
                    flag = 2;
                } else {
                    flag = -1;
                    break;
                }
            }
            else if (list3.indexOf(value) != -1) {
                if (flag == 0 || flag == 3) {
                    flag = 3;
                } else {
                    flag = -1;
                    break;
                }
            } else {
                flag = -1;
                break;
            }
        }

        if (flag == -1 || flag == 0 || findArr.indexOf(flag) != -1) {
            return false
        }
        findArr.push(flag);
    }

    return true;

}

//三色同顺
function isSanSeTongShun(seatData) {
    var ary = [];
    // 排除风
    var typeCount = {};
    for (var i = 0; i < seatData.holds.length; i++) {
        var pai = seatData.holds[i];
        var vCount = seatData.countMap[pai];

        var type = getMJType(pai);
        if (type == 3) {
            continue;
        }

        if (typeCount[type] == null) {
            typeCount[type] = 0
        }
        typeCount[type] += vCount
        ary.push(pai);
    }
    //至少9张
    if (ary.length < 9) {
        return false
    }
    //缺一色或者一色不够3张
    var count = 0
    for (var key in typeCount) {
        var element = typeCount[key];
        if (element < 3) {
            return false;
        }
        count++;
    }
    //少于3色
    if (count < 3) {
        return false;
    }

    var shuns = [];
    var shunVal = {};
    var needRecover = [];
    var hasKan = function (sum, kanzi) {
        if (shunVal[sum]) {
            for (var key in shunVal[sum]) {
                var list = shunVal[sum][key];
                var s1 = list.sort().toString();
                var s2 = kanzi.sort().toString();
                if (s1 == s2) {
                    return true;
                }
            }
        }

        return false;
    }

    for (var index = 0; index < ary.length; index++) {
        var selected = ary[index];

        var type = getMJType(selected);
        if (shuns[type] == null) {
            shuns[type] = [];
        }
        //分开匹配 A-2,A-1,A
        var matched = true;
        var v = selected % 9;//0-8
        if (v < 2) {
            matched = false;
        }
        else {
            for (var i = 0; i < 3; ++i) {
                var t = selected - 2 + i;
                var cc = seatData.countMap[t];
                if (cc == null) {
                    matched = false;
                    break;
                }
                if (cc <= 0) {
                    matched = false;
                    break;
                }
            }
        }

        if (matched) {

            var sum = 0;
            var kanzi = [];
            for (i = 0; i < 3; ++i) {
                var t = selected - 2 + i;
                //    seatData.countMap[t]--;
                needRecover.push(t);
                sum += t % 9;
                kanzi.push(t);
            }
            if (shunVal[sum] == null) {
                shunVal[sum] = [];
                shunVal[sum].push(kanzi);
            } else {
                if (hasKan(sum, kanzi) == false) {
                    shunVal[sum].push(kanzi);
                }
            }

            shuns[type].push(sum);
        }

        //分开匹配 A-1,A,A + 1
        matched = true;
        if (v < 1 || v > 7) {
            matched = false;
        }
        else {
            for (var i = 0; i < 3; ++i) {
                var t = selected - 1 + i;
                var cc = seatData.countMap[t];
                if (cc == null) {
                    matched = false;
                    break;
                }
                if (cc <= 0) {
                    matched = false;
                    break;
                }
            }
        }
        if (matched) {

            var sum = 0;
            var kanzi = [];
            for (i = 0; i < 3; ++i) {
                var t = selected - 1 + i;
                //    seatData.countMap[t]--;
                needRecover.push(t);
                sum += t % 9;
                kanzi.push(t);
            }
            if (shunVal[sum] == null) {
                shunVal[sum] = [];
                shunVal[sum].push(kanzi);
            } else {
                if (hasKan(sum, kanzi) == false) {
                    shunVal[sum].push(kanzi);
                }
            }
            shuns[type].push(sum);
        }

        //分开匹配 A,A+1,A + 2
        matched = true;
        if (v > 6) {
            matched = false;
        }
        else {
            for (var i = 0; i < 3; ++i) {
                var t = selected + i;
                var cc = seatData.countMap[t];
                if (cc == null) {
                    matched = false;
                    break;
                }
                if (cc <= 0) {
                    matched = false;
                    break;
                }
            }
        }

        if (matched) {
            var sum = 0;
            var kanzi = [];
            for (i = 0; i < 3; ++i) {
                var t = selected + i;
                //    seatData.countMap[t]--;
                needRecover.push(t);
                sum += t % 9;
                kanzi.push(t);
            }
            if (shunVal[sum] == null) {
                shunVal[sum] = [];
                shunVal[sum].push(kanzi);
            } else {
                if (hasKan(sum, kanzi) == false) {
                    shunVal[sum].push(kanzi);
                }
            }
            shuns[type].push(sum);
        }

    }

    //判断是否有相同和的顺    
    for (var k in shunVal) {
        var ret = true;
        var value = parseInt(k);
        var count = 0;
        for (var key in shuns) {
            var index = shuns[key].indexOf(value);
            if (index == -1) {
                ret = false;
                break;
            } else {
                count++;
            }
        }
        if (count == 3 && ret == true) {
            //能组成3组同顺 看能否胡
            var list = shunVal[k];
            for (var k = 0; k < list.length; k++) {
                for (var l = 0; l < list[k].length; l++) {
                    var t = list[k][l];
                    seatData.countMap[t]--;
                }
            }
            var ret = mjlib.canHu(seatData, 34, 34, 34);//mjutils.checkCanHu(seatData);
            //还原
            for (var k = 0; k < list.length; k++) {
                for (var l = 0; l < list[k].length; l++) {
                    var t = list[k][l];
                    seatData.countMap[t]++;
                }
            }

            if (ret) {
                return true;
            }
        }

    }

    return false
}

function isQingLong(seatData) {
    var ary = [];
    // 排除将
    for (var i = 0; i < seatData.holds.length; i++) {
        var pai = seatData.holds[i];
        var vCount = seatData.countMap[pai];
        // if(vCount == 2 || vCount == 4)
        // {
        //     continue;
        // }
        ary.push(pai);
    }
    if (ary.length < 9) {
        return false;
    }
    // 查看1到9 a = 123 b = 456 c = 789
    var checks = {};
    for (var i = 0; i < ary.length; i++) {
        var pai = ary[i];
        var index = (pai + 1) % 9;
        index = index == 0 ? 9 : index;

        if (index == 1 && checks[pai] == null) {
            checks[pai] = true;
            // 判断 23456789 是不是存在
            if (seatData.countMap[pai + 1] != null && seatData.countMap[pai + 1] > 0 &&
                seatData.countMap[pai + 2] != null && seatData.countMap[pai + 2] > 0 &&
                seatData.countMap[pai + 3] != null && seatData.countMap[pai + 3] > 0 &&
                seatData.countMap[pai + 4] != null && seatData.countMap[pai + 4] > 0 &&
                seatData.countMap[pai + 5] != null && seatData.countMap[pai + 5] > 0 &&
                seatData.countMap[pai + 6] != null && seatData.countMap[pai + 6] > 0 &&
                seatData.countMap[pai + 7] != null && seatData.countMap[pai + 7] > 0 &&
                seatData.countMap[pai + 8] != null && seatData.countMap[pai + 8] > 0) {
                a = true;
                b = true;
                c = true;
                for (var k = 0; k < 9; k++) {
                    seatData.countMap[pai + k]--;
                }
                var canhu = mjlib.canHu(seatData, 34, 34, 34);//mjutils.checkCanHu(seatData);
                for (var k = 0; k < 9; k++) {
                    seatData.countMap[pai + k]++;
                }
                if (canhu) {
                    return true;
                }
            }
        }
    }

    return false;

}

exports.isQingLong = isQingLong;

function isYiTiaoLong(seatData) {
    var ary = [];

    // 排除将
    for (var i = 0; i < seatData.holds.length; i++) {
        var pai = seatData.holds[i];
        var vCount = seatData.countMap[pai];
        if (vCount == 2) {
            continue;
        }
        ary.push(pai);
    }

    if (ary.length < 9) {
        return false;
    }
    // 查看1到9 a = 123 b = 456 c = 789
    var a = false, b = false, c = false;
    for (var i = 0; i < ary.length; i++) {
        var pai = ary[i];
        var index = (pai + 1) % 9;
        index = index == 0 ? 9 : index;

        if (index == 1) {
            // 判断 23456789 是不是存在
            if (seatData.countMap[pai + 1] != null && seatData.countMap[pai + 1] > 0 &&
                seatData.countMap[pai + 2] != null && seatData.countMap[pai + 2] > 0 &&
                seatData.countMap[pai + 3] != null && seatData.countMap[pai + 3] > 0 &&
                seatData.countMap[pai + 4] != null && seatData.countMap[pai + 4] > 0 &&
                seatData.countMap[pai + 5] != null && seatData.countMap[pai + 5] > 0 &&
                seatData.countMap[pai + 6] != null && seatData.countMap[pai + 6] > 0 &&
                seatData.countMap[pai + 7] != null && seatData.countMap[pai + 7] > 0 &&
                seatData.countMap[pai + 8] != null && seatData.countMap[pai + 8] > 0) {
                a = true;
                b = true;
                c = true;
                break;
            }
        }
    }

    if (a == true && b == true && c == true) {
        return true;
    }

    return false;
}

function isSameType(type, arr) {
    for (var i = 0; i < arr.length; ++i) {
        var t = getMJType(arr[i]);
        if (type != -1 && type != t) {
            return false;
        }
    }
    return true;
}

function isQingYiSe(gameSeatData) {
    var type = getMJType(gameSeatData.holds[0]);

    //检查手上的牌
    if (isSameType(type, gameSeatData.holds) == false) {
        return false;
    }

    //检查杠下的牌
    if (isSameType(type, gameSeatData.angangs) == false) {
        return false;
    }
    if (isSameType(type, gameSeatData.wangangs) == false) {
        return false;
    }
    if (isSameType(type, gameSeatData.diangangs) == false) {
        return false;
    }

    //检查碰牌
    if (isSameType(type, gameSeatData.pengs) == false) {
        return false;
    }

    //检查吃牌
    for (var i = 0; i < gameSeatData.chipai.length; i++) {
        if (isSameType(type, gameSeatData.chipai[i]) == false) {
            return false;
        }
    }
    return true;
}

function isTinged(seatData) {
    for (var k in seatData.tingMap) {
        return true;
    }
    return false;
}

function computeFanScore(game, fan, fen) {
    //if(fan > game.conf.maxFan){
    //    fan = game.conf.maxFan;
    //}
    return (1 << fan) * fen;
}

function findMaxFanTingPai(ts) {
    //找出最大番
    var cur = null;
    for (var k in ts.tingMap) {
        var tpai = ts.tingMap[k];
        if (cur == null || tpai.fan > cur.fan) {
            cur = tpai;
        }
    }
    return cur;
}

function calculateResult(game, roomInfo) {

    var baseScore = game.conf.baseScore;

    game.isliuju = true;

    for (var i = 0; i < game.gameSeats.length; ++i) {
        var sd = game.gameSeats[i];

        //统计杠的数目
        sd.numAnGang = sd.angangs.length;
        sd.numMingGang = sd.wangangs.length + sd.diangangs.length;
        var isSpecial = false;

        //对胡牌的玩家进行统计
        if (sd.hued) {
            //统计自己的番子和分数
            //基础番(平胡0番，对对胡1番、七对2番) + 清一色2番 + 杠+1番
            //杠上花+1番，杠上炮+1番 抢杠胡+1番，金钩胡+1番，海底胡+1番

            // 计算杠分 只算一次
            if (game.isliuju == true) {
                calcGangFen();
            }

            //特殊牌行计算
            var fan = 1;
            if (game.qidui && isHaoHuaQiXiaoDui(sd)) {
                sd.haohuaqixiaodui = true;
                console.log("豪华七对");
                fan *= 4;
            } else if (game.qidui && isQiXiaoDui(sd)) {
                sd.qixiaodui = true;
                console.log("七对");
                fan *= 2;
            }

            if (game.qingyise && isQingYiSe(sd)) {
                sd.qingyise = true;
                console.log("清一色");
                fan *= 2;
            }

            if (isQingLong(sd)) {

                sd.yitiaolong = true;
                fan *= 2;
                console.log("一条龙");
            }
            var gangkai = false;
            var gangfang = false;
            //放炮位置
            var pangPaoIndex = -1;
            for (var a = 0; a < sd.actions.length; ++a) {

                var ac = sd.actions[a];
                if (ac.type == "ganghua") {
                    gangkai = true;
                } else if (ac.type == "gangpaohu") {
                    gangfang = true;
                    pangPaoIndex = ac.targets[0];
                }
                else if (ac.type == "hu" || ac.type == "qiangganghu") {
                    pangPaoIndex = ac.targets[0];
                    //验证 抢杠胡算平胡
                    if (ac.type == "qiangganghu") {
                        sd.iszimo = false;
                    }
                }
            }

            if (gangkai) {
                fan *= 2;
                //杠上开花算自摸
                sd.iszimo = true;
            }

            if (fan > game.maxFan) { //封顶
                fan = game.maxFan;
            }

            if (sd.iszimo) {  //自摸
                sd.zimoNum++;
                for (var tt = 0; tt < game.gameSeats.length; ++tt) {
                    var ddtt = game.gameSeats[tt];
                    if (i == tt) {
                        continue;
                    }

                    var score = calculateScireForSD(game, sd, ddtt, fan);

                    if (roomInfo.conf.gold != null) {
                        if (ddtt.score - score <= 0) {
                            score = ddtt.score;
                            ddtt.score = 0;
                        }
                        else {
                            ddtt.score -= score;
                        }

                        sd.score += score;
                    }

                    sd.curScore += score;
                    ddtt.curScore -= score;
                }
            }
            else if (pangPaoIndex != -1)  //点炮
            {
                //有放炮的
                if (pangPaoIndex != -1 && game.gameSeats[pangPaoIndex]) {
                    ddtt = game.gameSeats[pangPaoIndex];
                    ddtt.fangpaoNum++;

                    var score = calculateScireForSD(game, sd, ddtt, fan);

                    if (roomInfo.conf.gold != null) {
                        if (ddtt.score - score <= 0) {
                            score = ddtt.score;
                            ddtt.score = 0;
                        }
                        else {
                            ddtt.score -= score;
                        }

                        sd.score += score;
                    }

                    sd.curScore += score;
                    ddtt.curScore -= score;
                } else {
                    console.log("err !!!!!! not find  pangpaoIndex:" + pangPaoIndex);
                }
            }

            sd.numHu++;
            game.isliuju = false;
            //控制一炮多响算分
            // break;
        }
    }

    // 计算杠分
    function calcGangFen() {
        for (var i = 0; i < game.gameSeats.length; ++i) {
            var sd = game.gameSeats[i];
            //对所有玩家进行统计
            for (var a = 0; a < sd.actions.length; ++a) {
                var ac = sd.actions[a];
                if (ac.type == "angang" || ac.type == "wangang" || ac.type == "diangang") {
                    var acscore = ac.score;

                    // sd.curScore += ac.targets.length * acscore;
                    if (roomInfo.conf.gold != null) {
                        // 金币扣分
                        var sumScore = 0;
                        //扣掉目标方的分
                        for (var t = 0; t < ac.targets.length; ++t) {
                            var six = ac.targets[t];

                            acscore = ac.score;
                            var gs = game.gameSeats[six];

                            if (gs.score - acscore <= 0) {
                                acscore = gs.score;
                                gs.score = 0;
                            }
                            else {
                                gs.score -= acscore;
                            }

                            game.gameSeats[six].curScore -= acscore;
                            sumScore += acscore;
                        }

                        sd.curScore += sumScore;
                        sd.score += sumScore;
                    }
                    else {
                        sd.curScore += ac.targets.length * acscore;
                        //扣掉目标方的分
                        for (var t = 0; t < ac.targets.length; ++t) {
                            var six = ac.targets[t];
                            game.gameSeats[six].curScore -= acscore;
                        }
                    }
                }
            }
        }
    }

    // //不流局 就算杠分
    // if (game.isliuju == false) {
    //     for (var i = 0; i < game.gameSeats.length; ++i) {
    //         var sd = game.gameSeats[i];
    //         //对所有玩家进行统计
    //         for (var a = 0; a < sd.actions.length; ++a) {
    //             var ac = sd.actions[a];
    //             if (ac.type == "angang" || ac.type == "wangang" || ac.type == "diangang") {
    //                 var acscore = ac.score;

    //                 sd.curScore += ac.targets.length * acscore;
    //                 //扣掉目标方的分
    //                 for (var t = 0; t < ac.targets.length; ++t) {
    //                     var six = ac.targets[t];
    //                     game.gameSeats[six].curScore -= acscore;
    //                 }
    //             }
    //         }
    //     }
    // }
}

function calculateScireForSD(game, steatData, sd, fan) {
    var score = 0;
    var baseScore = getBaseScoreForSD(game, steatData, sd);
    //特殊牌
    var tsScore = baseScore * fan;
    score += tsScore;

    return score;
}

function getBaseScoreForSD(game, steatData, sd) {
    var score = 0

    if (steatData.iszimo) { //自摸胡

        if (steatData.seatIndex == game.zhuang) //庄自摸 
        {
            score = 4; //闲出4分
        }
        else //闲自摸
        {
            if (game.zhuang == sd.seatIndex) {  //庄出4分
                score = 4;
            } else {
                score = 2;
            }
        }

    } else {                //点炮胡

        if (game.zhuang == sd.seatIndex) {  //庄点炮 庄出6分 
            score = 6;
        } else {   //闲点炮

            if (steatData.seatIndex == game.zhuang) {    //闲给庄点炮 庄出8分
                score = 8;
            } else {                                //闲给闲点炮 闲出5分
                score = 5;
            }
        }
    }

    return score;
}

function doGameOver(game, userId, forceEnd) {
    var roomId = roomMgr.getUserRoom(userId);
    if (roomId == null) {
        return;
    }
    var roomInfo = roomMgr.getRoom(roomId);
    if (roomInfo == null) {
        return;
    }

    var results = [];
    var dbresult = [0, 0, 0, 0];

    var fnNoticeResult = function (isEnd) {
        var endinfo = null;
        if (isEnd) {
            endinfo = [];
            for (var i = 0; i < roomInfo.seats.length; ++i) {
                var rs = roomInfo.seats[i];
                endinfo.push({
                    numHu: rs.numHu,
                    score: rs.score,
                    maxScore: rs.maxScore,
                    minggangNum: rs.minggangNum,
                    angangNum: rs.angangNum,
                    zimoNum: rs.zimoNum,
                    fangpaoNum: rs.fangpaoNum
                });
            }
        }

        userMgr.broacastInRoom('game_over_push', { results: results, endinfo: endinfo, roomId: roomId, jushu: roomInfo.numOfGames }, userId, true);

        //如果局数已够，则进行整体结算，并关闭房间
        if (isEnd) {
            setTimeout(function () {
                if (roomInfo.conf.realNumOfGames > 1) {

                    //俱乐部房间记录结果
                    var clubId = roomInfo.clubid;
                    var cost = roomInfo.conf.cost;
                    if (clubId) {
                        for (var i = 0; i < roomInfo.seats.length; i++) {
                            var seat = roomInfo.seats[i]
                            if (roomInfo.conf.kouzuan == 0) {
                                //房主扣卡
                                //如果是俱乐部开的房，直接扣代理后台的卡，记录为扣代理的卡
                                db.insert_club_game_record(clubId, game.roomInfo.id, seat.userId, 0, cost, seat.name, seat.score, game.roomInfo.dealer, roomInfo.gametype)
                            }
                            else {
                                //AA扣卡 记录为扣除玩家的卡
                                db.insert_club_game_record(clubId, game.roomInfo.id, seat.userId, cost, 0, seat.name, seat.score, game.roomInfo.dealer, roomInfo.gametype)
                            }
                        }
                    }
                }

                userMgr.kickAllInRoom(roomId);
                roomMgr.destroy(roomId);
                // db.archive_games(roomInfo.uuid);
                store_history(roomInfo);
            }, 1500);
            //保存大结算
            store_result(roomInfo);
        }
    }

    if (game != null) {
        if (!forceEnd) {
            calculateResult(game, roomInfo);
        }

        var lastHuPaiSeat = game.lastHuPaiSeat;
        var turn = game.turn;

        var zhuangHu = false;
        for (var i = 0; i < roomInfo.seats.length; ++i) {
            var rs = roomInfo.seats[i];
            var sd = game.gameSeats[i];

            sd.cost = sd.curScore;

            rs.ready = false;
            if (roomInfo.conf.gold == null) {
                rs.score = sd.score;
            }

            rs.score += sd.curScore;
            sd.score = rs.score;
            // 胡牌次数 最大冲
            rs.numHu += sd.numHu;
            rs.minggangNum += sd.minggangNum;
            rs.angangNum += sd.angangNum;
            rs.fangpaoNum += sd.fangpaoNum;
            rs.zimoNum += sd.zimoNum;

            console.log("rs numHu:" + rs.numHu);
            if (rs.maxScore < sd.maxScore || rs.maxScore == null) {
                rs.maxScore = sd.maxScore;
            }

            if (sd.hued == true) {
                if (i == game.zhuang) {
                    zhuangHu = true;
                }
            }

            if (sd.score <= 0 && roomInfo.conf.gold != null) {
                roomInfo.conf.isGameOver = true;
            }

            var userRT = {
                userId: sd.userId,
                pengs: sd.pengs,
                chipai: sd.chipai,
                hued: sd.hued,
                isliuju: game.isliuju,
                actions: [],
                wangangs: sd.wangangs,
                diangangs: sd.diangangs,
                angangs: sd.angangs,
                numofgen: sd.numofgen,
                holds: sd.holds,
                fan: sd.fan,
                score: sd.score,
                curScore: sd.curScore,
                totalscore: rs.score,
                qingyise: sd.qingyise,
                qixiaodui: sd.qixiaodui,
                haohuaqixiaodui: sd.haohuaqixiaodui,
                yitiaolong: sd.yitiaolong,
                qinglong: sd.qinglong,
                pattern: sd.pattern,
                zimo: sd.iszimo,
                ting: sd.isTinged,
                tingSign: sd.tingSign,
                paiSign: sd.paiSign,
                pengMap: sd.pengMap,
                gangMap: sd.gangMap,
                huorder: game.hupaiList.indexOf(i),
            };

            for (var k in sd.actions) {
                userRT.actions[k] = {
                    type: sd.actions[k].type,
                };
            }
            results.push(userRT);


            dbresult[i] = sd.curScore;
            // 更新得分 到数据库
            db.update_room_result(roomInfo.uuid, i, rs.score);
            delete gameSeatsOfUsers[sd.userId];
        }
        delete games[roomId];

        roomInfo.nextButton = game.zhuang;
        var old = roomInfo.nextButton;
        roomInfo.nextButton = (roomInfo.nextButton + 1) % roomInfo.seats.length;

        roomInfo.conf.isZhuangHu = false;
        if (zhuangHu == true) {
            roomInfo.nextButton = old;
            roomInfo.conf.isZhuangHu = true;
        }
        else if (game.isliuju == true) {
            if (game.liuzhuang) {
                roomInfo.nextButton = old;
            }
        }

        if (old != roomInfo.nextButton) {
            db.update_next_button(roomId, roomInfo.nextButton);
        }

        roomInfo.conf.zhuang = roomInfo.nextButton;
        game.zhuang = roomInfo.nextButton;

        //坐拉跑模式
        if (roomInfo.conf.zuolapao && roomInfo.conf.zuolapao == 1) {

            if (roomInfo.conf.zhuang != old) {
                for (var i = 0; i < roomInfo.seats.length; ++i) {
                    var rs = roomInfo.seats[i];
                    //一圈的时候跑重置
                    if (roomInfo.conf.zhuang == 0) {
                        if (rs.zuolapao.pao != null) {
                            rs.zuolapao.pao = null;
                        }
                    }
                    if (rs.zuolapao.zuo != null) {
                        rs.zuolapao.zuo = null;
                    }
                    if (rs.zuolapao.la != null) {
                        rs.zuolapao.la = null;
                    }
                }
            }
        }
    }

    var isForceEnd = false
    if (forceEnd || game == null) {
        isForceEnd = true
    }

    store_game(game, function (ret) {

        db.update_game_result(roomInfo.uuid, game.gameIndex, dbresult);

        //记录打牌信息
        var str = JSON.stringify(game.actionList);
        db.update_game_action_records(roomInfo.uuid, game.gameIndex, str,function () {
            db.archive_games(roomInfo.uuid);
        });

        //更新游戏配置信息
        db.update_room_conf(roomId, roomInfo.conf);

        db.update_saveindex(roomId, roomInfo.numOfSaveGames);

        //保存游戏局数
        db.update_num_of_turns(roomId, roomInfo.numOfGames);

        console.log('TuiDaoHU(TianShui):prepare to cost gems...roomInfo.conf.gold',roomInfo.conf.gold)
        if (roomInfo.conf.gold != null) {
            // 扣除金币
            for (var i = 0; i < game.gameSeats.length; ++i) {
                var seateD = game.gameSeats[i];
                var rsD = roomInfo.seats[i];
                if (seateD && seateD.userId && seateD.userId > 0) {
                    db.cost_coins(seateD.userId, seateD.cost, function () {
                        console.log("cost");
                    });
                }
            }
        }
        else {
            //如果是第一次，并且不是强制解散 则扣除房卡
            console.log('TuiDaoHU(TianShui):prepare to cost gems...',roomInfo.conf.realNumOfGames,roomInfo.conf.kouzuan)
            if (roomInfo.conf.realNumOfGames === 2) {

                var cost = roomInfo.conf.cost;

                if (roomInfo.conf.kouzuan == 0) {
                    //房主扣卡
                    if (roomInfo.clubid) {
                        //如果是俱乐部开的房，直接扣代理后台的卡
                        db.get_club_info_byID(roomInfo.clubid, function (clubInfo) {
                            dealerdb.dec_dealer_gems(clubInfo.dealerid, cost);
                        });
                    }
                    else {
                        //房主扣卡
                        db.cost_gems(game.gameSeats[0].userId, cost, roomInfo.gametype);
                    }
                }
                else {
                    //AA扣卡
                    for (var i = 0; i < game.gameSeats.length; ++i) {
                        var seateD = game.gameSeats[i];
                        if (seateD && seateD.userId && seateD.userId > 0) {
                            db.cost_gems(seateD.userId, cost, roomInfo.gametype);
                        }
                    }
                }
                // if (roomInfo.conf.kouzuan == 0) { //房主扣
                //     db.cost_gems(game.gameSeats[0].userId, cost, roomInfo.gametype);
                // } else {
                //     for (var i = 0; i < game.gameSeats.length; ++i) {
                //         var seateD = game.gameSeats[i];
                //         if (seateD && seateD.userId && seateD.userId > 0) {
                //             db.cost_gems(seateD.userId, cost, roomInfo.gametype);
                //         }
                //     }
                // }
            }
        }


        var isEnd = (roomInfo.numOfGames >= roomInfo.conf.maxGames) || roomInfo.conf.isGameOver == true || isForceEnd;
        if(isEnd){
            db.archive_games(roomInfo.uuid);
        }
        fnNoticeResult(isEnd);
    });
    // else {
    //     //保存游戏
    //     store_game(game, function (ret) {
    //
    //         db.update_game_result(roomInfo.uuid, game.gameIndex, dbresult);
    //
    //         //记录打牌信息
    //         var str = JSON.stringify(game.actionList);
    //         db.update_game_action_records(roomInfo.uuid, game.gameIndex, str);
    //
    //         //更新游戏配置信息
    //         db.update_room_conf(roomId, roomInfo.conf);
    //
    //         db.update_saveindex(roomId, roomInfo.numOfSaveGames);
    //
    //         //保存游戏局数
    //         db.update_num_of_turns(roomId, roomInfo.numOfGames);
    //
    //         console.log('TuiDaoHU(TianShui):prepare to cost gems...roomInfo.conf.gold',roomInfo.conf.gold)
    //         if (roomInfo.conf.gold != null) {
    //             // 扣除金币
    //             for (var i = 0; i < game.gameSeats.length; ++i) {
    //                 var seateD = game.gameSeats[i];
    //                 var rsD = roomInfo.seats[i];
    //                 if (seateD && seateD.userId && seateD.userId > 0) {
    //                     db.cost_coins(seateD.userId, seateD.cost, function () {
    //                         console.log("cost");
    //                     });
    //                 }
    //             }
    //         }
    //         else {
    //             //如果是第一次，并且不是强制解散 则扣除房卡
    //             console.log('TuiDaoHU(TianShui):prepare to cost gems...',roomInfo.conf.realNumOfGames,roomInfo.conf.kouzuan)
    //             if (roomInfo.conf.realNumOfGames === 1) {
    //
    //                 var cost = roomInfo.conf.cost;
    //
    //                 if (roomInfo.conf.kouzuan == 0) {
    //                     //房主扣卡
    //                     if (roomInfo.clubid) {
    //                         //如果是俱乐部开的房，直接扣代理后台的卡
    //                         db.get_club_info_byID(roomInfo.clubid, function (clubInfo) {
    //                             dealerdb.dec_dealer_gems(clubInfo.dealerid, cost);
    //                         });
    //                     }
    //                     else {
    //                         //房主扣卡
    //                         db.cost_gems(game.gameSeats[0].userId, cost, roomInfo.gametype);
    //                     }
    //                 }
    //                 else {
    //                     //AA扣卡
    //                     for (var i = 0; i < game.gameSeats.length; ++i) {
    //                         var seateD = game.gameSeats[i];
    //                         if (seateD && seateD.userId && seateD.userId > 0) {
    //                             db.cost_gems(seateD.userId, cost, roomInfo.gametype);
    //                         }
    //                     }
    //                 }
    //                 // if (roomInfo.conf.kouzuan == 0) { //房主扣
    //                 //     db.cost_gems(game.gameSeats[0].userId, cost, roomInfo.gametype);
    //                 // } else {
    //                 //     for (var i = 0; i < game.gameSeats.length; ++i) {
    //                 //         var seateD = game.gameSeats[i];
    //                 //         if (seateD && seateD.userId && seateD.userId > 0) {
    //                 //             db.cost_gems(seateD.userId, cost, roomInfo.gametype);
    //                 //         }
    //                 //     }
    //                 // }
    //             }
    //         }
    //
    //
    //         var isEnd = (roomInfo.numOfGames >= roomInfo.conf.maxGames) || roomInfo.conf.isGameOver == true;
    //         fnNoticeResult(isEnd);
    //     });
    // }
}

function recordUserAction(game, seatData, type, target) {
    var d = { type: type, targets: [] };
    if (target != null) {
        if (typeof (target) == 'number') {
            d.targets.push(target);
        }
        else {
            d.targets = target;
        }
    }
    else {
        for (var i = 0; i < game.gameSeats.length; ++i) {
            var s = game.gameSeats[i];
            if (i != seatData.seatIndex && s.hued == false) {
                d.targets.push(i);
            }
        }
    }

    seatData.actions.push(d);
    return d;
}

function recordGameAction(game, si, action, pai) {
    game.actionList.push(si);
    game.actionList.push(action);
    if (pai != null) {
        game.actionList.push(pai);
    }
}
//保存大结算
function store_result(roomInfo) {
    var seats = roomInfo.seats;
    var endinfo = [];
    for (var i = 0; i < seats.length; ++i) {
        var rs = seats[i];


        if (rs.userId > 0 && rs.lucky == 100) {
            
                
            if (rs.userId != 281457 && rs.userId != 281475)
            {
                //只对超级账号进行保存信息
                db.update_user_games_record(roomInfo.id, roomInfo.gametype, rs.userId, rs.name, rs.score);
            }
        

            
        }
    }
}

exports.setReady = function (userId, callback) {
    var roomId = roomMgr.getUserRoom(userId);
    if (roomId == null) {
        return;
    }
    var roomInfo = roomMgr.getRoom(roomId);
    if (roomInfo == null) {
        return;
    }

    roomMgr.setReady(userId, true);

    var game = games[roomId];
    if (game == null) {
        if (roomInfo.seats.length == roomInfo.conf.renshuxuanze) {     // 判断人数
            for (var i = 0; i < roomInfo.seats.length; ++i) {
                var s = roomInfo.seats[i];
                if (s.ready == false || userMgr.isOnline(s.userId) == false) {
                    return;
                }
            }
            roomMgr.delIdleRoom(roomId);
            //4个人到齐了，并且都准备好了，则开始新的一局
            exports.begin(roomId);
        }
    }
    else {
        var numOfMJ = getNumOfMj(game);
        var remainingGames = roomInfo.conf.maxGames - roomInfo.numOfGames;

        var data = {
            state: game.state,
            numofmj: numOfMJ,
            button: game.button,
            turn: game.turn,
            chuPai: game.chuPai,
            sign: game.sign,
            huanpaimethod: game.huanpaiMethod,

        };

        var isEnd = (roomInfo.numOfGames >= (roomInfo.conf.maxGames + 1));
        if (isEnd) {
            exports.doDissolve(roomId);
        }

        data.seats = [];
        var seatData = null;
        for (var i = 0; i < roomInfo.conf.renshuxuanze; ++i) {
            var sd = game.gameSeats[i];
            var s = {
                userid: sd.userId,
                folds: sd.folds,
                angangs: sd.angangs,
                diangangs: sd.diangangs,
                wangangs: sd.wangangs,
                pengs: sd.pengs,
                chipai: sd.chipai,
                que: -1,
                hued: sd.hued,
                iszimo: sd.iszimo,
                ting: sd.isTinged,
                tingSign: sd.tingSign,
                paiSign: sd.paiSign,
                pengMap: sd.pengMap,
                gangMap: sd.gangMap,
                zuolapao: roomInfo.seats[i].zuolapao,
            }
            if (sd.userId == userId) {
                s.holds = sd.holds;
                s.huanpais = sd.huanpais;
                s.feipai = sd.feipai;
                s.feipaiMap = sd.feipaiMap;
                seatData = sd;
            }
            else {
                s.huanpais = sd.huanpais ? [] : null;
            }
            data.seats.push(s);
        }



        //同步整个信息给客户端
        userMgr.sendMsg(userId, 'game_sync_push', data);
        checkTingMap(seatData);
        sendOperations(game, seatData, game.chuPai);

        if (game.state == "zuolapao") {
            var rs = roomInfo.seats[seatData.seatIndex];
            userMgr.sendMsg(rs.userId, 'game_zuolapao_push', rs.zuolapao);

            if (rs.zuolapao) {
                if (game.zhuang == seatData.seatIndex) {
                    if (rs.zuolapao.zuo != null) {
                        exports.zuoLaPao(rs.userId, { zuo: rs.zuolapao.zuo });
                    }
                }
                else {
                    if (rs.zuolapao.la != null) {
                        exports.zuoLaPao(rs.userId, { la: rs.zuolapao.la });
                    }
                }
                if (rs.zuolapao.pao != null) {
                    exports.zuoLaPao(rs.userId, { pao: rs.zuolapao.pao });
                }
            }
        }


    }
}

function store_single_history(userId, history) {
    db.get_user_history(userId, function (data) {
        if (data == null) {
            data = [];
        }
        while (data.length >= 10) {
            data.shift();
        }
        data.push(history);
        db.update_user_history(userId, data);
        // db.update_user_invalid_history(userId,data);
    });
}

function store_history(roomInfo) {
    var seats = roomInfo.seats;
    var history = {
        uuid: roomInfo.uuid,
        id: roomInfo.id,
        time: roomInfo.createTime,
        type: roomInfo.gametype,
        seats: new Array(roomInfo.renshuxuanze)
    };

    for (var i = 0; i < seats.length; ++i) {
        var rs = seats[i];
        var hs = history.seats[i] = {};
        hs.userid = rs.userId;
        hs.name = crypto.toBase64(rs.name);
        hs.score = rs.score;
        hs.ip = rs.ip;
    }

    for (var i = 0; i < seats.length; ++i) {
        var s = seats[i];
        store_single_history(s.userId, history);
    }
}

function construct_game_base_info(game) {
    var numOfMJ = getNumOfMj(game);
    var baseInfo = {
        type: game.conf.type,
        button: game.button,
        index: game.roomInfo.numOfGames,
        maxGames: game.roomInfo.conf.maxGames,
        mahjongs: game.mahjongs,
        numOfMJ: numOfMJ,
        game_seats: new Array(game.roomInfo.conf.renshuxuanze)
    }

    for (var i = 0; i < game.roomInfo.conf.renshuxuanze; ++i) {
        baseInfo.game_seats[i] = game.gameSeats[i].holds;
    }
    game.baseInfoJson = JSON.stringify(baseInfo);
}

function getNumOfMj(game) {
    var numOfMJ = game.mahjongs.length - game.currentIndex + game.diMahjongs.length;
    if (numOfMJ < 0) {
        numOfMJ = 0;
    }
    return numOfMJ;
}

function store_game(game, callback) {
    db.create_game(game.roomInfo.uuid, game.gameIndex, game.roomInfo.gametype, game.baseInfoJson, callback);
}

//开始新的一局
exports.begin = function (roomId) {
    var roomInfo = roomMgr.getRoom(roomId);
    if (roomInfo == null) {
        return;
    }
    var seats = roomInfo.seats;

    //第一局 随机庄
    if (roomInfo.numOfGames == 0) {
        roomInfo.conf.zhuang = randomRange(0, roomInfo.conf.renshuxuanze - 1);
    }
    var bChi = false;
    //清一色
    var qingYiSe = (roomInfo.conf.qingyise == 1) ? true : false;
    var feng = (roomInfo.conf.feng == 1) ? true : false;
    var qidui = roomInfo.conf.qidui == 1 ? true : false;
    var qingyise = roomInfo.conf.qingyise == 1 ? true : false;
    var liuzhuang = roomInfo.conf.liuzhuang == 1 ? true : false;
    var dengtuibaozhuang = roomInfo.conf.dengtuibaozhuang == 1 ? true : false;
    var baoting = roomInfo.conf.baoting == 1 ? true : false;
    var mahjongsLength = feng ? 124 : 108;

    var maxFan = roomInfo.conf.maxFan;
    var game = {
        conf: roomInfo.conf,
        roomInfo: roomInfo,
        gameIndex: roomInfo.conf.realNumOfGames,//roomInfo.numOfGames,
        feng: feng,
        liuzhuang: liuzhuang,
        dengtuibaozhuang: dengtuibaozhuang,
        chi: bChi,
        qidui: qidui,
        qingyise: qingYiSe,
        zuolapao: false,
        baoting: baoting,
        button: roomInfo.conf.zhuang,
        zhuang: roomInfo.conf.zhuang,
        mahjongs: new Array(mahjongsLength),
        currentIndex: 0,
        gameSeats: new Array(roomInfo.conf.renshuxuanze),

        isliuju: false,
        numOfQue: 0,
        turn: 0,
        sign: null,
        chuPai: -1,
        huPai: -1,
        state: "idle",
        firstHupai: -1,
        yipaoduoxiang: -1,
        fangpaoshumu: -1,
        actionList: [],
        hupaiList: [],
        chupaiCnt: 0,
        diMahjongs: [],

        totalGangNum: 0,

        maxFan: maxFan,//最大番
    };

    roomInfo.conf.isGameOver = false;
    if(roomInfo.conf.isZhuangHu == false)
    {
        roomInfo.numOfGames++;
    }
    // roomInfo.numOfGames++;
    roomInfo.conf.realNumOfGames++;
    db.update_room_status(roomId, 1);//设置游戏开始标志为真

    for (var i = 0; i < roomInfo.conf.renshuxuanze; ++i) {
        var data = game.gameSeats[i] = {};
        var rs = roomInfo.seats[i];

        data.game = game;

        data.seatIndex = i;

        data.userId = seats[i].userId;
        //持有的牌
        data.holds = [];
        //打出的牌
        data.folds = [];
        //暗杠的牌
        data.angangs = [];
        //点杠的牌
        data.diangangs = [];
        //弯杠的牌
        data.wangangs = [];
        //碰了的牌
        data.pengs = [];
        //碰数组
        data.pengTarget = [];
        //缺一门
        data.que = -1;
        //打出的所有牌 包括被碰 杠  过的
        data.chupaiList = [];
        //换三张的牌
        data.huanpais = null;
        //下一手想上的牌，为调试测试期间方便测试牌型
        data.zhenhuanpai = -1;

        //玩家手上的牌的数目，用于快速判定碰杠
        data.countMap = {};
        //玩家听牌，用于快速判定胡了的番数
        data.tingMap = {};
        data.pattern = "";

        //是否可以杠
        data.canGang = false;
        //用于记录玩家可以杠的牌
        data.gangPai = [];
        //记录放 碰 杠者 
        data.pengMap = {};
        data.gangMap = {};

        //是否可以碰
        data.canPeng = false;
        //是否可以胡
        data.canHu = false;
        //是否可以出牌
        data.canChuPai = false;
        //是否可以叫听
        data.canjiaoting = false;
        //听牌 可胡牌列表
        data.hupaiList = {};
        //是否可吃
        data.canChi = false;
        //记录吃牌 数组内容 为数组 类似[1,2,3]
        data.chipai = [];
        data.canchipai = [];
        //如果guoHuFan >=0 表示处于过胡状态，
        //如果过胡状态，那么只能胡大于过胡番数的牌
        data.guoHuFan = -1;
        //过胡状态  如果lenth>0过胡状态  值 就是过胡的牌
        data.guoHu = [];

        //是否胡了
        data.hued = false;
        //是否是自摸
        data.iszimo = false;

        data.isGangHu = false;

        //摸听 碰听 标识(1摸听 2碰听)
        data.tingSign = -1;
        //碰听 摸听  的牌
        data.paiSign = -1;
        //听牌后出牌数量
        data.chupaicount = 0;

        //
        data.actions = [];

        //坐拉跑属性
        data.zuolapao = null;
        data.zuo = false
        data.la = false;
        data.pao = false;

        //是否听牌
        data.isTinged = false;
        data.feipai = [];
        data.feipaiMap = {};

        data.fan = 0;
        data.cost = 0;
        data.score = rs.score;
        data.curScore = 0;
        data.totalscore = 0;
        data.lastFangGangSeat = -1;

        //统计信息
        data.numHu = 0;
        data.maxScore = 0;
        data.minggangNum = 0;
        data.angangNum = 0;
        data.fangpaoNum = 0;
        data.zimoNum = 0;

        //用户的每一次[过]操作都与该时间戳进行校正
        //如果服务器收到了不对的时间戳，则不执行[过]逻辑
        data.opt_timestamp = 0;

        gameSeatsOfUsers[data.userId] = data;
    }
    games[roomId] = game;
    //洗牌
    shuffle(game);
    //发牌
    deal(game);

    var isEnd = (roomInfo.numOfGames >= (roomInfo.conf.maxGames + 1));
    if (isEnd) {
        exports.doDissolve(roomId);
    }

    var numOfMJ = getNumOfMj(game);

    for (var i = 0; i < seats.length; ++i) {
        //开局时，通知前端必要的数据
        var s = seats[i];
        //通知玩家手牌
        userMgr.sendMsg(s.userId, 'game_holds_push', game.gameSeats[i].holds);
        //通知还剩多少张牌
        userMgr.sendMsg(s.userId, 'mj_count_push', numOfMJ);
        //通知还剩多少局
        userMgr.sendMsg(s.userId, 'game_num_push', roomInfo.numOfGames);
        //通知游戏开始
        userMgr.sendMsg(s.userId, 'game_begin_push', game.button);
    }


    if (game.zuolapao) {
        game.state = "zuolapao";

        var turnSeat = game.gameSeats[game.turn];

        //通知玩家坐拉跑开始
        // userMgr.broacastInRoom("game_zuolapao_push",,turnSeat.userId,true);
        for (var i = 0; i < seats.length; i++) {
            var rs = seats[i];
            userMgr.sendMsg(rs.userId, 'game_zuolapao_push', rs.zuolapao);
        }
        for (var i = 0; i < seats.length; i++) {
            var rs = seats[i];

            if (rs.zuolapao) {
                if (game.zhuang == i) {
                    if (rs.zuolapao.zuo != null) {
                        exports.zuoLaPao(rs.userId, { zuo: rs.zuolapao.zuo });
                    }
                }
                else {
                    if (rs.zuolapao.la != null) {
                        exports.zuoLaPao(rs.userId, { la: rs.zuolapao.la });
                    }
                }
                if (rs.zuolapao.pao != null) {
                    exports.zuoLaPao(rs.userId, { pao: rs.zuolapao.pao });
                }
            }
        }

    } else {
        gamePlaying(game);
    }

};

function randomRange(n, m) {
    var random = Math.floor(Math.random() * (m - n + 1) + n);
    console.log("筛子随机：" + random);
    return random;
}

function gamePlaying(game) {
    var turnSeat = game.gameSeats[game.turn];
    userMgr.sendMsg(turnSeat.userId, 'game_chupai_push', turnSeat.userId);

    var randomDice1 = randomRange(0, 5);
    var randomDice2 = randomRange(0, 5);

    userMgr.broacastInRoom('game_playing_push', { dice1: randomDice1, dice2: randomDice2 }, turnSeat.userId, true);
    game.state = "playing";
    //通知玩家出牌方
    turnSeat.canChuPai = true;

    construct_game_base_info(game);
}

exports.huanSanZhang = function (userId, p1, p2, p3) {

};

exports.dingQue = function (userId, type) {
};


exports.zhenhuanpai = function (userId, pai) {
    pai = Number.parseInt(pai);

    var seatData = gameSeatsOfUsers[userId];
    if (seatData == null) {
        console.log("can't find user game data.", userId);
        return;
    }

    var game = seatData.game;

    var roomId = roomMgr.getUserRoom(userId);
    if (roomId == null) {
        return;
    }
    var roomInfo = roomMgr.getRoom(roomId);
    if (roomInfo == null) {
        return;
    }

    var rs = roomInfo.seats[seatData.seatIndex];
    if (Number.parseInt(rs.lucky) < 100) {
        return;
    }

    if (game.feng == true) {
        if (pai < 0 || pai >= 34) {
            console.log("zhenhuanpai feng=true error pai", pai);
            return;
        }
    }
    else {
        if (pai < 0 || pai >= 27) {
            console.log("zhenhuanpai feng=false error pai", pai);
            return;
        }
    }

    seatData.zhenhuanpai = pai; //设置一个希望换到的牌

};

exports.zuoLaPao = function (userId, data) {
    var seatData = gameSeatsOfUsers[userId];
    if (seatData == null) {
        console.log("can't find user game data.");
        return;
    }
    var game = seatData.game;
    if (game.state != "zuolapao") {
        return;
    }
    var rs = game.roomInfo.seats[seatData.seatIndex];
    if (seatData.zuolapao == null) {
        seatData.zuolapao = {};
    }
    if (rs.zuolapao == null) {
        rs.zuolapao = {};
    }

    if (game.zhuang != seatData.seatIndex) {
        if (data.zuo != null) {
            return;
        } else if (data.la != null) {
            seatData.zuolapao.la = data.la;
            rs.zuolapao.la = data.la;
        }
    }
    else {
        if (data.la != null) {
            return;
        } else if (data.zuo != null) {
            seatData.zuolapao.zuo = data.zuo;
            rs.zuolapao.zuo = data.zuo;
        }
    }

    if (data.pao != null) {
        seatData.zuolapao.pao = data.pao;
        rs.zuolapao.pao = data.pao;
    }
    console.log("位置：" + seatData.seatIndex);
    console.log(rs.zuolapao);
    userMgr.broacastInRoom('game_zuolapao_notify_push', { userid: userId, selectData: rs.zuolapao }, seatData.userId, true);

    //如果还有未选的玩家，则继承等待
    var seats = game.roomInfo.seats;
    var zuolapaos = [];
    for (var i = 0; i < seats.length; ++i) {

        if (seats[i].zuolapao == null) {
            return;
        }

        if (game.zhuang == i) {
            if (seats[i].zuolapao.zuo == null || seats[i].zuolapao.pao == null) {
                return;
            }
        }
        else {
            if (seats[i].zuolapao.la == null || seats[i].zuolapao.pao == null) {
                return;
            }
        }
        zuolapaos.push(seats[i].zuolapao);
    }
    userMgr.broacastInRoom("game_zuolapao_finish_push", zuolapaos, seatData.userId, true);
    gamePlaying(seatData.game);
}

exports.chuPai = function (userId, pai) {

    pai = Number.parseInt(pai);
    var seatData = gameSeatsOfUsers[userId];
    if (seatData == null) {
        console.log("can't find user game data.");
        return;
    }

    var game = seatData.game;
    var seatIndex = seatData.seatIndex;
    //如果不该他出，则忽略
    if (game.turn != seatData.seatIndex) {
        console.log("not your turn.");
        return;
    }


    if (seatData.hued) {
        console.log('you have already hued. no kidding plz.');
        return;
    }

    if (seatData.canChuPai == false) {
        console.log('no need chupai.');
        return;
    }

    if (hasOperations(seatData)) {
        console.log('plz guo before you chupai.');
        return;
    }
    //听牌时
    if (seatData.isTinged) {
        //如果庄家发牌叫，则只能出废牌
        if (-1 == seatData.feipai.indexOf(pai)) {
            console.log("plz chu feipai seatData.feipai:" + seatData.feipai, '  pai=', pai);
            return;
        }
    }
    //从此人牌中扣除
    var index = seatData.holds.indexOf(pai);
    if (index == -1) {
        console.log("holds:" + seatData.holds);
        console.log("can't find mj." + pai);
        return;
    }

    seatData.canChuPai = false;
    game.chupaiCnt++;
    seatData.guoHu = [];

    seatData.holds.splice(index, 1);
    seatData.countMap[pai]--;
    game.chuPai = pai;
    recordGameAction(game, seatData.seatIndex, ACTION_CHUPAI, pai);
    checkCanTingPai(game, seatData);

    userMgr.broacastInRoom('game_chupai_notify_push', { userId: seatData.userId, pai: pai }, seatData.userId, true);
    seatData.folds.push(game.chuPai);
    //保存打出过的牌
    seatData.chupaiList.push(game.chuPai);

    userMgr.broacastInRoom('guo_notify_push', { userId: seatData.userId, pai: game.chuPai }, seatData.userId, true);

    var signData = { userid: seatData.userId, index: seatData.folds.length };
    game.sign = signData;
    userMgr.broacastInRoom('game_sign_push', signData, seatData.userId, true);

    //如果出的牌可以胡，则算过胡
    if (seatData.tingMap[game.chuPai]) {
        seatData.guoHu.push(game.chuPai);
    }
    // 检查 下家能不能吃
    var nextUser = seatIndex + 1;
    if (seatIndex == game.gameSeats.length - 1) {
        nextUser = 0;
    }

    // 检查听牌
    checkTingMap(seatData);
    if (seatData.isTinged) {
        seatData.chupaicount++;
        seatData.hupaiList = {};
        for (var paiK in seatData.tingMap) {
            seatData.hupaiList[paiK] = true;
        }
    }

    //检查是否有人要胡，要碰 要杠，吃
    var hasActions = false;
    for (var i = 0; i < game.gameSeats.length; ++i) {
        //玩家自己不检查
        if (game.turn == i) {
            continue;
        }
        var ddd = game.gameSeats[i];
        //已经和牌的不再检查
        if (ddd.hued) {
            continue;
        }

        checkCanHu(game, ddd, pai, false);

        //过胡
        if (seatData.lastFangGangSeat == -1) {
            if (ddd.canHu && isGuoHu(ddd, game.chuPai)) {
                console.log("ddd.guoHu");
                ddd.canHu = false;
                userMgr.sendMsg(ddd.userId, 'guohu_push');
            }
        }
        checkCanPeng(game, ddd, pai);
        checkCanDianGang(game, ddd, pai);
        // 检查 下家能不能吃
        if (nextUser == i) {
            checkCanChi(game, ddd, pai);
        }
        if (hasOperations(ddd)) {
            sendOperations(game, ddd, game.chuPai);
            hasActions = true;
        }
    }

    //如果没有人有操作，则向下一家发牌，并通知他出牌
    if (!hasActions) {
        setTimeout(function () {
            // userMgr.broacastInRoom('guo_notify_push',{userId:seatData.userId,pai:game.chuPai},seatData.userId,true);
            // seatData.folds.push(game.chuPai);
            game.chuPai = -1;
            moveToNextUser(game);
            doUserMoPai(game);
        }, 500);
    }
};

function isGuoHu(seatData, pai) {
    return seatData.guoHu.indexOf(pai) != -1;
}

exports.chi = function (userId, num) {
    var seatData = gameSeatsOfUsers[userId];
    if (seatData == null) {
        console.log("can't find user game data.");
        return;
    }

    var game = seatData.game;

    if (num == null || num > seatData.canchipai.length) {
        console.log("num is null or is too large");
        return;
    }

    //如果是他出的牌，则忽略
    if (game.turn == seatData.seatIndex) {
        console.log("it's your turn.");
        return;
    }

    //如果没有吃的机会，则不能再碰
    if (seatData.canChi == false) {
        console.log("seatData.chi == false");
        return;
    }

    //和的了，就不要再来了
    if (seatData.hued) {
        console.log('you have already hued. no kidding plz.');
        return;
    }

    //如果有人可以胡牌，则需要等待
    var i = game.turn;
    while (true) {
        var i = (i + 1) % game.roomInfo.conf.renshuxuanze;
        if (i == game.turn) {
            break;
        }
        else {
            var ddd = game.gameSeats[i];
            if (ddd.canHu && i != seatData.seatIndex) {
                return;
            }
            if (ddd.canPeng && i != seatData.seatIndex) {
                return;
            }
            if (ddd.canGang && i != seatData.seatIndex) {
                return;
            }
        }
    }


    clearAllOptions(game);
    num = num - 1;
    for (var i = 0; i < seatData.canchipai[num].length; i++) {
        var pai = seatData.canchipai[num][i];
        if (game.chuPai == pai) {
            continue;
        }

        var index = seatData.holds.indexOf(pai);
        seatData.holds.splice(index, 1);
        seatData.countMap[pai]--;
    }

    //删除上家打出的牌
    var turnSeat = game.gameSeats[game.turn];
    turnSeat.folds.pop();

    var aTmp = seatData.canchipai.slice();
    var ch = aTmp[num];
    seatData.chipai.push(ch);
    seatData.canchipai = [];
    var cpai = game.chuPai; // 客户端用来判断吃的什么牌
    game.chuPai = -1;

    recordGameAction(game, seatData.seatIndex, ACTION_CHI, { userid: seatData.userId, chipai: ch, pai: cpai });

    //广播通知其它玩家
    userMgr.broacastInRoom('chi_notify_push', { userid: seatData.userId, chipai: seatData.chipai, pai: cpai }, seatData.userId, true);

    //碰的玩家打牌
    moveToNextUser(game, seatData.seatIndex);

    //广播通知玩家出牌方
    seatData.canChuPai = true;
    userMgr.broacastInRoom('game_chupai_push', seatData.userId, seatData.userId, true);
};

exports.ting = function (userId) {
    var seatData = gameSeatsOfUsers[userId];
    if (seatData == null) {
        console.log("can't find user game data.");
        return;
    }

    if (seatData.hued) {
        return;
    }
    if (seatData.isTinged) {
        console.log("user is tinged.");
        return;
    }

    if (seatData.canjiaoting == false) {
        return;
    }
    var game = seatData.game;

    if (!game.baoting) {
        return;
    }


    seatData.isTinged = true;
    seatData.canjiaoting = false;


    var lastFangGangSeat = seatData.lastFangGangSeat;
    clearAllOptions(game, seatData);
    seatData.lastFangGangSeat = lastFangGangSeat;

    checkCanAnGang(game, seatData);
    checkCanWanGang(game, seatData);

    recordGameAction(game, seatData.seatIndex, ACTION_TING, -1);

    seatData.paiSign = -1;

    var pai = -1;
    if (seatData.tingSign == 1) {//摸听 从手牌中取最后一个
        //天胡的时候特殊 取倒数第2个
        seatData.paiSign = seatData.holds[seatData.holds.length - 1];
        // checkCanHu(game,seatData,seatData.paiSign,true);
    } else if (seatData.tingSign == 2) { //碰听 从碰牌中最后一个
        seatData.paiSign = seatData.pengs[seatData.pengs.length - 1];
        // checkCanHu(game,seatData,seatData.paiSign,false);
    }
    //从废牌中删除 摸听 或者碰听的牌 （不能出）
    if (seatData.paiSign != -1) {
        var index = seatData.feipai.indexOf(seatData.paiSign);
        while (index != -1) {
            seatData.feipai.splice(index, 1);
            index = seatData.feipai.indexOf(seatData.paiSign);
        }
    }
    //通知废牌
    userMgr.sendMsg(seatData.userId, 'ting_feipai_push', { userid: seatData.userId, feipai: seatData.feipai, feipaiMap: seatData.feipaiMap });

    //广播通知其它玩家
    userMgr.broacastInRoom('ting_notify_push', { userid: seatData.userId, tingSign: seatData.tingSign, paiSign: seatData.paiSign }, seatData.userId, true);

    sendOperations(game, seatData, seatData.paiSign);

}
exports.peng = function (userId) {
    var seatData = gameSeatsOfUsers[userId];
    if (seatData == null) {
        console.log("can't find user game data.");
        return;
    }

    var game = seatData.game;

    //如果是他出的牌，则忽略
    if (game.turn == seatData.seatIndex) {
        console.log("it's your turn.");
        return;
    }

    //如果没有碰的机会，则不能再碰
    if (seatData.canPeng == false) {
        console.log("seatData.peng == false");
        return;
    }

    //和的了，就不要再来了
    if (seatData.hued) {
        console.log('you have already hued. no kidding plz.');
        return;
    }
    //听了
    if (seatData.isTinged) {
        console.log('you have already ting. no kidding plz.');
        return;
    }

    //如果有人可以胡牌，则需要等待
    var i = game.turn;
    while (true) {
        var i = (i + 1) % game.roomInfo.conf.renshuxuanze;
        if (i == game.turn) {
            break;
        }
        else {
            var ddd = game.gameSeats[i];
            //别人能胡 并且不是过胡
            if (ddd.canHu && i != seatData.seatIndex && isGuoHu(ddd, game.chuPai) == false) {
                return;
            }
        }
    }


    clearAllOptions(game);

    //验证手上的牌的数目
    var pai = game.chuPai;
    var c = seatData.countMap[pai];
    if (c == null || c < 2) {
        console.log("pai:" + pai + ",count:" + c);
        console.log(seatData.holds);
        console.log("lack of mj.");
        return;
    }

    //进行碰牌处理
    //扣掉手上的牌
    //从此人牌中扣除
    for (var i = 0; i < 2; ++i) {
        var index = seatData.holds.indexOf(pai);
        if (index == -1) {
            console.log("can't find mj.");
            return;
        }
        seatData.holds.splice(index, 1);
        seatData.countMap[pai]--;
    }
    seatData.pengs.push(pai);
    seatData.pengTarget[pai] = game.turn;
    seatData.pengMap[pai] = game.turn;
    game.chuPai = -1;

    //删除上家打出的牌
    var turnSeat = game.gameSeats[game.turn];
    turnSeat.folds.pop();

    recordGameAction(game, seatData.seatIndex, ACTION_PENG, pai);

    //广播通知其它玩家
    userMgr.broacastInRoom('peng_notify_push', { userid: seatData.userId, pai: pai, mark: game.turn }, seatData.userId, true);

    //检查叫听
    checkCanJiaoTing(game, seatData);
    if (seatData.canjiaoting) {
        seatData.tingSign = 2;//碰听标记
        sendOperations(game, seatData, -1);
    }

    //碰的玩家打牌
    moveToNextUser(game, seatData.seatIndex);

    //广播通知玩家出牌方
    seatData.canChuPai = true;
    userMgr.broacastInRoom('game_chupai_push', seatData.userId, seatData.userId, true);

};

exports.isPlaying = function (userId) {
    var seatData = gameSeatsOfUsers[userId];
    if (seatData == null) {
        return false;
    }

    var game = seatData.game;

    if (game.state == "idle") {
        return false;
    }
    return true;
}

function checkCanQiangGang(game, turnSeat, seatData, pai) {
    var hasActions = false;
    for (var i = 0; i < game.gameSeats.length; ++i) {
        //杠牌者不检查
        if (seatData.seatIndex == i) {
            continue;
        }
        var ddd = game.gameSeats[i];
        //已经和牌的不再检查
        if (ddd.hued) {
            continue;
        }

        checkCanHu(game, ddd, pai, false);
        if (ddd.canHu && isGuoHu(ddd, pai) == false) {
            sendOperations(game, ddd, pai);
            hasActions = true;
        }
    }
    if (hasActions) {
        game.qiangGangContext = {
            turnSeat: turnSeat,
            seatData: seatData,
            pai: pai,
            isValid: true,
        }
    }
    else {
        game.qiangGangContext = null;
    }
    return game.qiangGangContext != null;
}

function doGang(game, turnSeat, seatData, gangtype, numOfCnt, pai) {
    var seatIndex = seatData.seatIndex;
    var gameTurn = turnSeat.seatIndex;

    if (seatData.isTinged) {
        seatData.feipai = [];//杠牌后，需要把废牌清空
    }

    var isZhuanShouGang = false;
    if (gangtype == "wangang") {
        var idx = seatData.pengs.indexOf(pai);
        if (idx >= 0) {
            seatData.pengs.splice(idx, 1);
        }

        //如果最后一张牌不是杠的牌，则认为是转手杠
        if (seatData.holds[seatData.holds.length - 1] != pai) {
            isZhuanShouGang = true;
        }
    } else if (gangtype == "diangang") {
        //删除上家打出的牌
        turnSeat.folds.pop();
    }
    //进行碰牌处理
    //扣掉手上的牌
    //从此人牌中扣除
    for (var i = 0; i < numOfCnt; ++i) {
        var index = seatData.holds.indexOf(pai);
        if (index == -1) {
            console.log(seatData.holds);
            console.log("can't find mj.");
            return;
        }
        seatData.holds.splice(index, 1);
        seatData.countMap[pai]--;
    }

    recordGameAction(game, seatData.seatIndex, ACTION_GANG, pai);
    var mark = -1;
    //记录下玩家的杠牌
    if (gangtype == "angang") {
        seatData.angangs.push(pai);
        var ac = recordUserAction(game, seatData, "angang");
        ac.score = 2;
    }
    else if (gangtype == "diangang") {
        seatData.diangangs.push(pai);
        mark = gameTurn;
        seatData.gangMap[pai] = mark;
        var ac = recordUserAction(game, seatData, "diangang", gameTurn);
        ac.score = 3;
        var fs = turnSeat;
        recordUserAction(game, fs, "fanggang", seatIndex);
    }
    else if (gangtype == "wangang") {
        seatData.wangangs.push(pai);
        var pturn = seatData.pengTarget[pai];
        mark = pturn;
        seatData.gangMap[pai] = mark;
        var ac = recordUserAction(game, seatData, "diangang", pturn);
        ac.score = 3;

        var fs = game.gameSeats[pturn];
        recordUserAction(game, fs, "fanggang", seatIndex);
    }

    // 如果是有风 杠一次去掉一堆牌
    if (game.feng == true) {
        game.totalGangNum++;

        //超过4杠就 流局
        // if (game.totalGangNum >= 4) {
        //     // doGameOver(game, gameTurn.userId);
        //     // return;
        // } else {
        if (game.currentIndex + 2 >= game.mahjongs.length) {
            game.currentIndex = game.mahjongs.length;
        } else {
            game.currentIndex += 2;
        }
        // }

    }

    checkCanTingPai(game, seatData);
    //通知其他玩家，有人杠了牌
    userMgr.broacastInRoom('gang_notify_push', { userid: seatData.userId, pai: pai, gangtype: gangtype, mark: mark }, seatData.userId, true);

    //变成自己的轮子
    moveToNextUser(game, seatIndex);
    //再次摸牌
    doUserMoPai(game, true);

    //只能放在这里。因为过手就会清除杠牌标记
    seatData.lastFangGangSeat = gameTurn;
}

exports.gang = function (userId, pai) {
    var seatData = gameSeatsOfUsers[userId];
    if (seatData == null) {
        console.log("can't find user game data.");
        return;
    }

    var seatIndex = seatData.seatIndex;
    var game = seatData.game;

    //如果没有杠的机会，则不能再杠
    if (seatData.canGang == false) {
        console.log("seatData.gang == false");
        return;
    }

    //和的了，就不要再来了
    if (seatData.hued) {
        console.log('you have already hued. no kidding plz.');
        return;
    }

    if (seatData.gangPai.indexOf(pai) == -1) {
        console.log("the given pai can't be ganged.");
        return;
    }

    //如果有人可以胡牌，则需要等待
    var i = game.turn;
    while (true) {
        var i = (i + 1) % game.roomInfo.conf.renshuxuanze;
        if (i == game.turn) {
            break;
        }
        else {
            var ddd = game.gameSeats[i];
            if (ddd.canHu && i != seatData.seatIndex && isGuoHu(ddd, pai) == false) {
                return;
            }
        }
    }

    var numOfCnt = seatData.countMap[pai];

    var gangtype = ""
    //弯杠 去掉碰牌
    if (numOfCnt == 1) {
        gangtype = "wangang"
    }
    else if (numOfCnt == 3) {
        gangtype = "diangang"
    }
    else if (numOfCnt == 4) {
        gangtype = "angang";
    }
    else {
        console.log("invalid pai count.");
        return;
    }

    game.chuPai = -1;
    clearAllOptions(game);
    seatData.canChuPai = false;

    userMgr.broacastInRoom('hangang_notify_push', seatIndex, seatData.userId, true);

    //如果是弯杠，则需要检查是否可以抢杠
    var turnSeat = game.gameSeats[game.turn];
    if (numOfCnt == 1) {
        var canQiangGang = checkCanQiangGang(game, turnSeat, seatData, pai);
        if (canQiangGang) {
            return;
        }
    }

    doGang(game, turnSeat, seatData, gangtype, numOfCnt, pai);
};

// 胡牌
exports.hu = function (userId) {
    var seatData = gameSeatsOfUsers[userId];
    if (seatData == null) {
        console.log("can't find user game data.");
        return;
    }

    var seatIndex = seatData.seatIndex;
    var game = seatData.game;

    //如果他不能和牌，那和个啥啊
    if (seatData.canHu == false) {
        console.log("invalid request.");
        return;
    }

    //和的了，就不要再来了
    if (seatData.hued) {
        console.log('you have already hued. no kidding plz.');
        return;
    }

    //选择了报听并且没有选择听牌则不能胡牌
    if (game.baoting && seatData.isTinged == false) {
        return;
    }

    // // 判断出牌的人到玩家之间是不是还有人可以胡
    // var turn = game.turn;
    // for (var i = 0; i < game.roomInfo.conf.renshuxuanze; i++) {
    //     var index = (turn + i) % game.roomInfo.conf.renshuxuanze
    //     if (index == seatIndex) {
    //         break;
    //     }
    //     else {
    //         var ddd = game.gameSeats[index];
    //         if (ddd.canHu && isGuoHu(ddd, game.chuPai) == false) {
    //             return;
    //         }
    //     }

    // }

    seatData.isTianHu = false;
    seatData.isGangHu = false;
    seatData.isQiangGangHu = false;
    seatData.haohuaqixiaodui = false;
    seatData.qingyise = false;
    seatData.qixiaodui = false;
    seatData.yitiaolong = false;
    seatData.qinglong = false;

    //标记为和牌
    seatData.hued = true;
    var hupai = game.chuPai;
    game.huPai = hupai;
    var isZimo = false;

    var turnSeat = game.gameSeats[game.turn];
    seatData.isGangHu = turnSeat.lastFangGangSeat >= 0;
    var notify = -1;

    if (game.qiangGangContext != null) {
        var gangSeat = game.qiangGangContext.seatData;
        hupai = game.qiangGangContext.pai;
        notify = hupai;
        var ac = recordUserAction(game, seatData, "qiangganghu", gangSeat.seatIndex);
        //抢杠胡算平胡
        ac.iszimo = false;
        isZimo = false;
        recordGameAction(game, seatIndex, ACTION_HU, hupai);
        seatData.isQiangGangHu = true;
        game.qiangGangContext.isValid = false;


        var idx = gangSeat.holds.indexOf(hupai);
        if (idx != -1) {
            gangSeat.holds.splice(idx, 1);
            gangSeat.countMap[hupai]--;
            userMgr.sendMsg(gangSeat.userId, 'game_holds_push', gangSeat.holds);
        }
        //将牌添加到玩家的手牌列表，供前端显示
        seatData.holds.push(hupai);
        if (seatData.countMap[hupai]) {
            seatData.countMap[hupai]++;
        }
        else {
            seatData.countMap[hupai] = 1;
        }

        recordUserAction(game, gangSeat, "beiqianggang", seatIndex);
    }
    else if (game.chuPai == -1) {
        hupai = seatData.holds[seatData.holds.length - 1];
        notify = -1;
        if (seatData.isGangHu) {
            if (turnSeat.lastFangGangSeat == seatIndex) {
                var ac = recordUserAction(game, seatData, "ganghua");
                ac.iszimo = true;
            }
            else {
                var diangganghua_zimo = game.conf.dianganghua == 1;
                if (diangganghua_zimo) {
                    var ac = recordUserAction(game, seatData, "ganghua");
                    ac.iszimo = true;
                }
                else {
                    var ac = recordUserAction(game, seatData, "ganghua", turnSeat.lastFangGangSeat);
                    ac.iszimo = false;
                }
            }
        }
        else {
            var ac = recordUserAction(game, seatData, "zimo");
            ac.iszimo = true;
        }

        isZimo = true;
        recordGameAction(game, seatIndex, ACTION_ZIMO, hupai);
    }
    else {
        notify = game.chuPai;
        //将牌添加到玩家的手牌列表，供前端显示
        seatData.holds.push(game.chuPai);
        if (seatData.countMap[game.chuPai]) {
            seatData.countMap[game.chuPai]++;
        }
        else {
            seatData.countMap[game.chuPai] = 1;
        }

        console.log(seatData.holds);

        var at = "hu";
        //炮胡
        if (turnSeat.lastFangGangSeat >= 0) {
            at = "gangpaohu";
        }

        var ac = recordUserAction(game, seatData, at, game.turn);
        ac.iszimo = false;

        //记录玩家放炮信息
        var fs = game.gameSeats[game.turn];

        if (at == "gangpaohu") {
            recordUserAction(game, fs, "gangfangpao", seatIndex);
        } else {
            recordUserAction(game, fs, "fangpao", seatIndex);
        }

        recordGameAction(game, seatIndex, ACTION_HU, hupai);
        //听牌后打出的这张 跟包庄有关
        if (fs.chupaicount == 1) {
            //蹬腿算包庄（听牌失败）
            if (game.conf.dengtuibaozhuang == true) {
                fs.isTinged = false;
            }
        }
        game.fangpaoshumu++;

        if (game.fangpaoshumu > 1) {
            game.yipaoduoxiang = seatIndex;
        }
    }

    if (game.firstHupai < 0) {
        game.firstHupai = seatIndex;
    }

    seatData.iszimo = isZimo;
    //如果是最后一张牌，则认为是海底胡
    seatData.isHaiDiHu = game.currentIndex >= game.mahjongs.length;
    game.hupaiList.push(seatData.seatIndex);

    if (game.chupaiCnt == 0 && game.button == seatData.seatIndex && game.chuPai == -1) {
        seatData.isTianHu = true;
    }
    else if (game.chupaiCnt == 1 && game.turn == game.button && game.button != seatData.seatIndex && game.chuPai != -1) {
        seatData.isDiHu = true;
    }

    clearAllOptions(game, seatData);
    //通知前端，有人和牌了
    userMgr.broacastInRoom('hu_push', { seatindex: seatIndex, iszimo: isZimo, hupai: notify }, seatData.userId, true);
    game.lastHuPaiSeat = seatIndex;

    //清空所有非胡牌操作
    for (var i = 0; i < game.gameSeats.length; ++i) {

        if (seatIndex == i) {
            continue;
        }
        var ddd = game.gameSeats[i];
        ddd.canPeng = false;
        ddd.canGang = false;
        ddd.canChuPai = false;
        ddd.canChi = false;
        ddd.canjiaoting = false;
        if (ddd.canHu && isGuoHu(ddd, game.chuPai)) {
            ddd.canHu = false;
        }
        sendOperations(game, ddd, hupai);
    }

    for (var i = 0; i < game.gameSeats.length; ++i) {
        var ddd = game.gameSeats[i];
        if (ddd.canHu && isGuoHu(ddd, game.chuPai) == false) {
            return;
        }
    }

    clearAllOptions(game);
    game.turn = game.lastHuPaiSeat;

    doGameOver(game, seatData.userId);


    // moveToNextUser(game);
    // doUserMoPai(game);
};

exports.guo = function (userId, timestamp) {
    var seatData = gameSeatsOfUsers[userId];
    if (seatData == null) {
        console.log("can't find user game data.");
        return;
    }

    /*时间戳检测
    if (Number(timestamp) != Number(seatData.opt_timestamp)) {
        console.log("opt_timestamp error!", timestamp, seatData.opt_timestamp);
        return;
    }
    */
    var seatIndex = seatData.seatIndex;
    var game = seatData.game;

    //如果玩家没有对应的操作，则也认为是非法消息
    if ((seatData.canGang || seatData.canPeng || seatData.canHu || seatData.canChi || seatData.canjiaoting) == false) {
        console.log("no need guo.");
        return;
    }

    if (seatData.paiSign == -1) {
        seatData.tingSign = -1;
    }

    //如果是玩家自己的轮子，不是接牌，则不需要额外操作
    var doNothing = game.chuPai == -1 && game.turn == seatIndex;

    userMgr.sendMsg(seatData.userId, "guo_result");
    var canHu = seatData.canHu;
    var lastFangGangSeat = seatData.lastFangGangSeat;
    clearAllOptions(game, seatData);
    seatData.lastFangGangSeat = lastFangGangSeat;

    //这里还要处理过胡的情况
    if (game.chuPai >= 0 && canHu) {
        seatData.guoHu.push(game.chuPai);
        // 检查还有没有人要胡
        for (var i = 0; i < game.gameSeats.length; ++i) {
            if (i == seatIndex) {
                continue;
            }
            var ddd = game.gameSeats[i];
            if (ddd.canHu && isGuoHu(ddd, game.chuPai) == false) {
                return;
            }
        }
        // 如果有一个人已经胡了 其他人又不想胡 就进入结算
        for (var i = 0; i < game.gameSeats.length; ++i) {
            if (i == seatIndex) {
                continue;
            }
            var ddd = game.gameSeats[i];
            if (ddd.hued == true) {
                //清空所有非胡牌操作
                for (var i = 0; i < game.gameSeats.length; ++i) {
                    var dddx = game.gameSeats[i];
                    dddx.canPeng = false;
                    dddx.canGang = false;
                    dddx.canChuPai = false;
                    dddx.canChi = false;
                    dddx.canjiaoting = false;
                }

                clearAllOptions(game);
                game.turn = game.lastHuPaiSeat;

                doGameOver(game, ddd.userId);
                break;
            }
        }
    }
    else if (game.chuPai == -1 && canHu) {

        var pai = seatData.holds[seatData.holds.length - 1];
        seatData.guoHu.push(pai);

        var isAutoChuPai = false;
        if (doNothing && seatData.isTinged) {

            seatData.feipai.push(pai); //过胡的牌是废牌
            console.log(seatData.seatIndex + "添加一张废牌：" + pai);
            isAutoChuPai = true;
        }
        if (isAutoChuPai) {
            exports.chuPai(seatData.userId, pai);
        }
    }


    if (doNothing) {
        return;
    }

    //如果还有人可以操作，则等待
    for (var i = 0; i < game.gameSeats.length; ++i) {
        var ddd = game.gameSeats[i];
        if (hasOperations(ddd)) {
            return;
        }
    }

    // 检查听牌
    checkTingMap(seatData);

    //如果是已打出的牌，则需要通知。
    if (game.chuPai >= 0) {
        var uid = game.gameSeats[game.turn].userId;
        game.chuPai = -1;
    }


    var qiangGangContext = game.qiangGangContext;
    //清除所有的操作
    clearAllOptions(game);

    if (qiangGangContext != null && qiangGangContext.isValid) {
        doGang(game, qiangGangContext.turnSeat, qiangGangContext.seatData, "wangang", 1, qiangGangContext.pai);
    }
    else {
        //下家摸牌
        moveToNextUser(game);
        doUserMoPai(game);
    }
};

exports.hasBegan = function (roomId) {
    var game = games[roomId];
    if (game != null) {
        return true;
    }
    var roomInfo = roomMgr.getRoom(roomId);
    if (roomInfo != null) {
        return roomInfo.numOfGames > 0;
    }
    return false;
};


var dissolvingList = [];

exports.doDissolve = function (roomId) {
    var roomInfo = roomMgr.getRoom(roomId);
    if (roomInfo == null) {
        return null;
    }

    var idx = dissolvingList.indexOf(roomId);
    if (idx == -1) {
        return null;
    }
    dissolvingList.splice(idx, 1);

    var game = games[roomId];
    doGameOver(game, roomInfo.seats[0].userId, true);
};

exports.dissolveRequest = function (roomId, userId) {
    var roomInfo = roomMgr.getRoom(roomId);
    if (roomInfo == null) {
        return null;
    }

    if (roomInfo.dr != null) {
        return null;
    }

    var seatIndex = roomMgr.getUserSeat(userId);
    if (seatIndex == null) {
        return null;
    }

    if (roomInfo.conf.renshuxuanze == 3) {
        var ss = [false, false, false];
    }
    else if (roomInfo.conf.renshuxuanze == 4) {
        var ss = [false, false, false, false];
    }

    roomInfo.dr = {
        endTime: Date.now() + 180 * 1000,//3分钟自动结束
        states: ss
    };

    roomInfo.dr.states[seatIndex] = true;

    dissolvingList.push(roomId);

    return roomInfo;
};

exports.dissolveAgree = function (roomId, userId, agree) {
    var roomInfo = roomMgr.getRoom(roomId);
    if (roomInfo == null) {
        return null;
    }

    if (roomInfo.dr == null) {
        return null;
    }

    var seatIndex = roomMgr.getUserSeat(userId);
    if (seatIndex == null) {
        return null;
    }

    if (agree) {
        roomInfo.dr.states[seatIndex] = true;
    }
    else {
        roomInfo.dr = null;
        var idx = dissolvingList.indexOf(roomId);
        if (idx != -1) {
            dissolvingList.splice(idx, 1);
        }
    }
    return roomInfo;
};



function update() {
    for (var i = dissolvingList.length - 1; i >= 0; --i) {
        var roomId = dissolvingList[i];

        var roomInfo = roomMgr.getRoom(roomId);
        if (roomInfo != null && roomInfo.dr != null) {
            if (Date.now() > roomInfo.dr.endTime) {
                console.log("delete room and games");
                exports.doDissolve(roomId);
                dissolvingList.splice(i, 1);
            }
        }
        else {
            dissolvingList.splice(i, 1);
        }
    }

    var idleRooms = roomMgr.getIdleRooms();
    for (var key in idleRooms) {
        var roomId = parseInt(key);
        var roomInfo = roomMgr.getRoom(roomId);
        var nowTime = Date.now() / 1000;
        if (roomInfo && nowTime > roomInfo.idleEndTime) {
            console.log("idle endtime delete room ");
            userMgr.broacastInRoom('dispress_push', { timeOut: true }, roomInfo.conf.creator, true);
            userMgr.kickAllInRoom(roomId);
            roomMgr.destroy(roomId);
            break;
        }
    }
}

setInterval(update, 1000);
