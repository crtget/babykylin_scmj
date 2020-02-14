//这里封装了游戏中一些公共的功能

var db = require('./db');
var dealerdb = require('./dealerdb');

/**
 * 通过roomInfo.conf.kouzuan参数来判断是否AA支付房卡
 * 如果是单人支付，则通过roomInfo.clubid来确定扣房主房卡还是扣俱乐部会长的dealer的房卡
 * @param game
 * @param roomInfo
 * @param cost
 */
exports.gameCostGems = function (game, roomInfo,cost) {
    console.log('try to cost gems...')
    if (roomInfo.conf.kouzuan == 0 || roomInfo.conf.kouzuan === undefined) {
        console.log('cost one user gem')
        //房主扣卡
        if (roomInfo.clubid) {
            console.log('cost one user gem in club...')
            //如果是俱乐部开的房，直接扣代理后台的卡
            db.get_club_info_byID(roomInfo.clubid, function (clubInfo) {
                console.log('cost one user gem in club success')
                dealerdb.dec_dealer_gems(clubInfo.dealerid, cost);
            });
        }
        else {
            console.log('cost one user gem as room master')
            //房主扣卡
            db.cost_gems(game.gameSeats[0].userId, cost, roomInfo.gametype);
        }
    }
    else {
        console.log('cost multi user gem')
        //AA扣卡
        for (var i = 0; i < game.gameSeats.length; ++i) {
            var seateD = game.gameSeats[i];
            if (seateD && seateD.userId && seateD.userId > 0) {
                db.cost_gems(seateD.userId, cost, roomInfo.gametype);
            }
        }
    }
}

exports.createClubRoom = function (userId,roomMgr,gems,conf,serverIp,dealerid,clubId,config,http,res) {

    dealerdb.get_gems_by_dealerid(dealerid,function (data) {
        var dealergems = data.gems
        console.log('User '+userId+' create club room,dealer would cost gems ,dealer '+dealerid+' now gems:',dealergems)
        roomMgr.createClubRoom(userId, conf, gems, dealergems, serverIp, config.CLIENT_PORT, config.TYPE, dealerid, clubId, function (errcode, roomId) {
            if (errcode != 0 || roomId == null) {
                http.send(res, errcode, "create failed.");
                return;
            }
            else {
                http.send(res, 0, "ok", { roomid: roomId });
            }
        });
    })
}