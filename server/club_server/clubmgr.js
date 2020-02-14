var db = require('../utils/db');
var dealerdb = require('../utils/dealerdb');
var room_service = require('../hall_server/room_service')
var crypto = require('../utils/crypto');
var configs = require('../configs');

Date.prototype.Format = function (fmt) {
    var o = {
        "M+": this.getMonth() + 1, //月份 
        "d+": this.getDate(), //日 
        "h+": this.getHours(), //小时 
        "m+": this.getMinutes(), //分 
        "s+": this.getSeconds(), //秒 
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度 
        "S": this.getMilliseconds() //毫秒 
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}

var protocolCallBack = {}

var DEFAULT_TABLE_NUM = 4;
var DEFAULT_TABLE_MAX = 20;
var DEFAULT_MEMBER_MAX = 300;
var DEFAULT_CREATECLUB_COST = 188;

/*
俱乐部数据
举例说明
{
    "123456": {
        "clubid": 123456,
        "userid": 286604,
        "level": 1,
        "name": "俱乐部1",
        "notice": "公告啥的",
        "table_num": 4,
        "table_max": 20,
        "member_max": 300,
        "mumber": {
            "286604": {
                "userid": "286604",
                "username": "玩家1",
                "sex": "1"
            },
            "286605": {
                "userid": "286605",
                "username": "玩家2",
                "sex": "2"
            },
            ...
        },
        "request": [],
        "table": [{
            "table_index": 0,
            "uuid": -1,
            "status": 0,
            "base_info": {
                "type": "handan",
                "gametype": 3,
                "cost": 2,
                "baseScore": 2,
                "feng": 1,
                "qidui": 1,
                "qingyise": 1,
                "liuzhuang": 0,
                "zhuangfanbei": 1,
                "baoting": 0,
                "maxFan": 999,
                "renshuxuanze": 4,
                "kouzuan": 1,
                "creator": -1,
                "zhuang": -1,
                "isZhuangHu": false,
                "maxGames": 16,
                "realNumOfGames": 0,
                "clubid": 1
            },
            "seatdata": []
        }, {
            "table_index": 1,
            "uuid": -1,
            "status": 0,
            "base_info": {
                "type": "handan",
                "gametype": 3,
                "cost": 2,
                "baseScore": 2,
                "feng": 1,
                "qidui": 1,
                "qingyise": 1,
                "liuzhuang": 0,
                "zhuangfanbei": 1,
                "baoting": 0,
                "maxFan": 999,
                "renshuxuanze": 4,
                "kouzuan": 1,
                "creator": -1,
                "zhuang": -1,
                "isZhuangHu": false,
                "maxGames": 16,
                "realNumOfGames": 0,
                "clubid": 1
            },
            "seatdata": []
        }, {
            "table_index": 2,
            "uuid": -1,
            "status": 0,
            "base_info": {
                "type": "handan",
                "gametype": 3,
                "cost": 2,
                "baseScore": 2,
                "feng": 1,
                "qidui": 1,
                "qingyise": 1,
                "liuzhuang": 0,
                "zhuangfanbei": 1,
                "baoting": 0,
                "maxFan": 999,
                "renshuxuanze": 4,
                "kouzuan": 1,
                "creator": -1,
                "zhuang": -1,
                "isZhuangHu": false,
                "maxGames": 16,
                "realNumOfGames": 0,
                "clubid": 1
            },
            "seatdata": []
        }, {
            "table_index": 3,
            "uuid": -1,
            "status": 0,
            "base_info": {
                "type": "handan",
                "gametype": 3,
                "cost": 2,
                "baseScore": 2,
                "feng": 1,
                "qidui": 1,
                "qingyise": 1,
                "liuzhuang": 0,
                "zhuangfanbei": 1,
                "baoting": 0,
                "maxFan": 999,
                "renshuxuanze": 4,
                "kouzuan": 1,
                "creator": -1,
                "zhuang": -1,
                "isZhuangHu": false,
                "maxGames": 16,
                "realNumOfGames": 0,
                "clubid": 1
            },
            "seatdata": []
        }],
        "create_time": "2018-01-19 15:11:01"
    },

    "123457": {
        ......
    },

    "123458": {
        ......
    },
}
*/

var allClubInfo = {};
/*
玩家对应俱乐部数据
举例说明
{
    "286001":[123456, 654321, 987654],
    "286002":[123457],
}
*/
var userClubInfo = {};

// 默认俱乐部房间信息
//石家庄麻将

var default_table_info = {
    gametype: "3",
    type: "3",
    renshuxuanze: 1,
    jushuxuanze: 0,
    feng: 0,
    zhuangfanbei: 1,
    qidui: 1,
    qingyise: 1,
    difen: 0,
    baoting: 0,
    liuzhuang: 0,
    kouzuan: 0
}

// //保定麻将
// var default_table_info = {
//     "gametype":"5",
//     "type": 5,
//     "jushuxuanze": 0,
//     "bazhang": 1,
//     "koupai": 0,
//     "dajiang": 0,
//     "feng": 0,
//     "dianpaomiangang": 0,
//     "fengding": 0,
//     "dianpaotype": 2,
//     "kouzuan": 1
// }


var init = function () {

    //     initAllClubInfo();

    protocolCallBack = {
        "create_club": exports.create_club,
        "get_club_members": exports.get_club_members,
        "get_club_request": exports.get_club_request,
        "club_RequestOp": exports.club_RequestOp,
        "club_MemberOp": exports.club_MemberOp,
        "get_first_club_info": exports.get_first_club_info,
        "get_club_tableinfo": exports.get_club_tableinfo,
        "club_addTable": exports.club_addTable,
        "get_user_clubinfo": exports.get_user_clubinfo,
        "set_club_default_tableinfo": exports.set_club_default_tableinfo,
        "get_club_info_byID": exports.get_club_info_byID,
        "set_club_notice": exports.set_club_notice,
        "set_club_name": exports.set_club_name,
        //"get_recharge_config": exports.get_recharge_config,
        "get_club_name_notice": exports.get_club_name_notice,
        "delete_club":exports.delete_club,
        "exit_club":exports.exit_club,
        "get_club_tableinfo_by_roomid": exports.get_club_tableinfo_by_roomid,
        "get_dealergems_by_clubid":exports.get_dealergems_by_clubid,
        //"get_club_gameRecords": exports.get_club_gameRecords,
        //"get_club_rankinfo": exports.get_club_rankinfo,
        //"join_game": exports.join_game,
        //"club_editTable": exports.club_editTable,

    };

    console.log("clubmgr init db complate!");
}

var initAllClubInfo = function () {
    //初始化所有俱乐部基础信息
    db.get_club_base_info(function (base_info) {
        // console.log("antest", base_info);
        if (!base_info) {
            // console.log("antest11111111", base_info);
            return;
        }
        for (var i = 0; i < base_info.length; i++) {
            var info = base_info[i];

            allClubInfo[info.clubid.toString()] = {
                clubid: info.clubid,
                userid: info.userid,
                level: info.level,
                name: info.name,
                notice: info.notice,
                table_num: info.table_num,
                table_max: info.table_max,
                member_max: info.member_max,

                member: info.member.length == 0 ? {} : JSON.parse(info.member),
                //                 member_online: [],
                //request: info.request.length == 0 ? {} : JSON.parse(info.request),
                //table: info.table.length == 0 ? {} : JSON.parse(info.table),

                create_time: info.create_time,
            }
        }

        for (var i in allClubInfo) {
            var info = allClubInfo[i];
            //初始化成员信息
            for (var ii in info.member) {
                info.member[ii].isonline = 0; //初始化所有玩家均不在线

                //将该玩家与俱乐部ID对应上
                if (!userClubInfo[ii]) {
                    userClubInfo[ii] = [];
                }
                userClubInfo[ii].push(info.clubid);
            }

            //             //初始化桌子信息
            //             for (var j = 0; j < info.table_num; j++) {
            //                 if (!info.table[j]) {
            //                     info.table[j] = {
            //                         table_index: j,
            //                         uuid: -1,
            //                         status: 0,
            //                         base_info: {
            //                             "type": "handan",
            //                             "gametype": 3,
            //                             "cost": 2,
            //                             "baseScore": 2,
            //                             "feng": 1,
            //                             "qidui": 1,
            //                             "qingyise": 1,
            //                             "liuzhuang": 0,
            //                             "zhuangfanbei": 1,
            //                             "baoting": 0,
            //                             "maxFan": 999,
            //                             "renshuxuanze": 4,
            //                             "kouzuan": 1,
            //                             "creator": -1,
            //                             "zhuang": -1,
            //                             "isZhuangHu": false,
            //                             "maxGames": 16,
            //                             "realNumOfGames": 0,
            //                             "clubid": info.clubid,
            //                         },

            //                         seatdata: [],//在坐的玩家
            //                     }
            //                 }
            //             }

        }

    });
}

var generateClubid = function () {
    var clubid = "";
    for (var i = 0; i < 6; ++i) {
        clubid += Math.floor(Math.random() * 10);
    }
    return clubid;
}

exports.RunProtocol = function (protocol, userid, data, cb) {
    var errorid = 0;
    var ret = {};
    if (!protocolCallBack[protocol]) {
        cb(errorid, ret);
        return;
    }
    protocolCallBack[protocol](userid, data, cb);
}



//创建俱乐部方法
exports.create_club = function (userid, data, cb) {
    data = JSON.parse(data);
    var clubname = data.clubname;
    var clubid = generateClubid();
    // var clubids = [];
    var notice = data.notice;
    // var username = data.username;
    var sex = 0;
    // var clubname = "MyClud";
    var icode = data.icode;
    var t_dealerid = "";
    var gems = 0;
    var theclubidcanuse = false;
    // console.log("************************username:", username, default_table_info);
    if (!icode) {
        cb(1, "该验证码不可用1");
        return;
    } else if (icode.length != 32) {
        cb(1, "该验证码不可用2");
        return;
    }

    dealerdb.get_dealerid_by_icode(icode, function (ret) {
        // console.log("代理帐号 icode :", icode)
        if (ret && ret.active == 0) {
            // console.log("代理帐号1", ret.dearlerid);
            dealerid = ret.dearlerid;
        }
        else {
            cb(1, "该验证码不可用3");
            return;
        }
        // console.log("代理帐号2", ret.dearlerid, ret.active, ret.dealerid);
        t_dealerid = ret.dealerid;
        dealerdb.getDealerByAccount(t_dealerid, function (ret) {
            if (ret) {
                gems = ret.gems;

                //获取操作用户的用户名和性别
                db.get_user_by_userid(userid, function (row) {
                    if (row) {
                        username = row.name;
                        sex = row.sex;

                        var fnCreate = function () {
                            clubid = generateClubid();
                            db.get_club_info_byID(clubid, function (ret) {
                                if (ret) {
                                    //能查到则再随机一次
                                    fnCreate();
                                }
                                else {
                                    //没查到 证明是个可以用的clubid
                                    var clubInfo = {
                                        clubid: clubid,
                                        userid: userid,
                                        level: 1,
                                        name: clubname,
                                        notice: notice,
                                        table_num: DEFAULT_TABLE_NUM,
                                        table_max: DEFAULT_TABLE_MAX,
                                        member_max: DEFAULT_MEMBER_MAX,
                                        member: {},
                                        request: {},
                                        dealerid: t_dealerid,
                                        default_table_info: JSON.stringify(default_table_info),
                                    }

                                    //增加新创建俱乐部记录
                                    db.insert_operation(clubInfo, function (err) {
                                        if (err) {
                                            cb(1, "creat club unsucceed");
                                            return;
                                        }
                                        //把创建者放入俱乐部成员列表
                                        var memberstr = {
                                            member: [{ userid: userid, username: username, sex, sex }]
                                        };
                                        // var defaultTableInfo = {
                                        //     type: default_table_info.gametype,
                                        //     conf: default_table_info
                                        // }

                                        db.set_club_default_tableinfo(clubid, JSON.stringify(JSON.stringify(default_table_info)), function (err) {
                                            if (err) {
                                                // console.log("修改成功***********")
                                            } else {
                                                // console.log("修改失败-----------")
                                            }
                                        });


                                        db.update_operation("t_club", "member", JSON.stringify(JSON.stringify(memberstr)), "clubid", clubid, function (err) {
                                            if (err) {
                                                cb(1, "add club creater to club member list unsucceed ");
                                                return;
                                            }
                                            //在玩家信息中加入俱乐部ID

                                            var create_clubArray = [clubid];

                                            db.get_user_by_userid(userid, function (ret) {
                                                var create_clubid = [];
                                                if (ret) {
                                                    if (ret.create_clubid) {
                                                        create_clubid = JSON.parse(ret.create_clubid);
                                                        if (create_clubid.length > 3) {
                                                            cb(2, "超出上限，不能创建");
                                                            return;
                                                        }
                                                        for (i = 0; i < create_clubid.length; i++) {
                                                            // console.log("antest----------2")
                                                            if (create_clubid[i] == clubid) {
                                                                cb(1, "俱乐部ID重复");
                                                                return;
                                                            }
                                                        }
                                                        // console.log("antest----------3")
                                                        create_clubid[create_clubid.length] = clubid;
                                                    } else {
                                                        create_clubid = create_clubArray;
                                                    }
                                                }
                                                // console.log("antest----------2", create_clubid)
                                                db.update_operation("t_users", "create_clubid", JSON.stringify(JSON.stringify(create_clubid)), "userid", userid, function (err) {
                                                    if (err) {
                                                        // console.log("在玩家信息中加入俱乐部ID失败");
                                                        cb(1, "在玩家信息中加入俱乐部ID失败");
                                                        return;
                                                    }
                                                })
                                                //记录秘钥为已使用
                                                dealerdb.set_ticket_active_by_icode(icode, clubid);

                                                ret = clubInfo;
                                                ret.room_card = gems;

                                                cb(0, "ok", ret);
                                                return;
                                            })
                                        })
                                    })
                                }
                            })
                        }

                        fnCreate();
                    }

                });
            }
        })
    })


}
//获取用户的俱乐部相关信息
exports.get_user_clubinfo = function (userid, data, cb) {
    // console.log("获取用户的俱乐部相关信息", userid);
    db.get_user_by_userid(userid, function (ret) {
        if (!ret) {
            cb(1, "没找到对应的用户");
            return;
        }

        var cClubList =[];
        if(ret.create_clubid) {
            cClubList=JSON.parse(ret.create_clubid);
        }    
        var jClubList = [];
        if(ret.join_clubid){
            jClubList =JSON.parse(ret.join_clubid);
        }
        

        var clubidList = [];
        clubidList = clubidList.concat(cClubList, jClubList);

        db.get_club_info_list_byID(clubidList, function (infos) {
            if (infos) {
                var result = [];
                var getClubInfo = function (cid) {
                    for (var m = 0; m < infos.length; m++) {
                        if (infos[m].clubid == cid) {
                            return infos[m];
                        }
                    }
                }

                if (Array.isArray(cClubList)) {
                    for (var i = 0; i < cClubList.length; i++) {
                        var info = getClubInfo(cClubList[i]);
                        result.push({ clubid: info.clubid, clubname: info.name, userid: info.userid });
                    }
                }

                if (Array.isArray(jClubList)) {
                    for (var i = 0; i < jClubList.length; i++) {
                        var info = getClubInfo(jClubList[i]);
                        result.push({ clubid: info.clubid, clubname: info.name, userid: info.userid });
                    }
                }

                cb(0, "ok", { list: result });
            }
            else {
                cb(2, "error")
            }
        });
    })
}
//获取俱乐部桌子信息
exports.get_club_tableinfo = function (userid, data, cb) {
    data = JSON.parse(data)
    var clubid = data.clubid;
    // console.log("get_club_tableinfo------0", data, typeof (data), clubid)
    db.get_club_tableinfo(clubid, function (tableinfo) {
        var roomstate = 0;//桌子状态 创建 0 加入 1 游戏中 2
        var gametype = 0;  // 游戏类型 type
        var roomid = 0;   //房间ID id
        var dealerid = 0; //dealerid
        var t_tableinfo = [];
        // console.log("tableinfo", tableinfo.length)

        if (tableinfo) {
            for (i = 0; i < tableinfo.length; i++) {

                var temp = tableinfo[i];
                //console.log("for-----", i, " --- temp.status" ,temp.status)
                if (temp.user_id0 == 0) {
                    roomstate = 0;
                } else if (temp.status == 1) {
                    //
                    roomstate = 2;
                } else {
                    roomstate = 1;
                }

                //console.log("-----------test----------",roomstate)
                var maxseats = getRoomSeatsNum(temp.type, JSON.parse(temp.base_info));

                var playernum = getRoomPlayerNum(temp);



                gametype = temp.type;
                roomid = temp.id;
                dealerid = temp.dealerid;
                var e_tableinfo = {
                    roomstate: roomstate,
                    gametype: gametype,
                    type: temp.base_info.type,
                    roomid: roomid,
                    creater: temp.user_name0,
                    dealerid: dealerid,
                    maxseats: maxseats,
                    playernum: playernum,

                }
                t_tableinfo[i] = e_tableinfo;
                // console.log("get_club_tableinfo------1:", roomid, dealerid);
            }
        }
        // console.log("get_club_tableinfo------2:", t_tableinfo);

        cb(0, "ok", { tableinfo: t_tableinfo });

    })
}
//获取俱乐部桌子详细信息
exports.get_club_tableinfo_by_roomid = function (userid, data, cb) {
    console.log("get_club_tableinfo_by_roomid !!!!!!!!!!!!!");
    console.log(data);
    data = JSON.parse(data);
    var clubid = data.clubid;
    var roomid = data.roomid;


    db.get_room_data(roomid, function (dbdata) {
        if (dbdata) {
            var roominfo = {
                uuid: dbdata.uuid,
                roomid: dbdata.id,
                gametype: dbdata.type,
                numOfGames: dbdata.num_of_turns,
                numOfSaveGames: dbdata.numOfSaveGames,
                createTime: dbdata.create_time,
                idleEndTime: dbdata.idle_end_time,
                nextButton: dbdata.next_button,
                seats: new Array(),
                conf: JSON.parse(dbdata.base_info),
                dealer: dbdata.dealer,
                clubid: dbdata.clubid,

                roomstate: dbdata.status == 0 ? 1 : 2,
            };

            for (var i = 0; i < 10; ++i) {
                var s = roominfo.seats[i] = {};
                s.userId = dbdata["user_id" + i];
                s.score = dbdata["user_score" + i];
                s.name = dbdata["user_name" + i];
            }

            cb(0, "ok", { roominfo: roominfo });
        }
        else {
            cb(1, "have no the roomid");
        }
    });

}


function getRoomPlayerNum(temp) {
    var playernum = 0;
    //console.log("-----------test----------1",JSON.parse(temp.base_info).renshuxuanze,JSON.parse(temp.base_info));
    for (var j = 0; j < 10; j++) {

        if (temp["user_id" + j]) {
            playernum++;
            //console.log("-----------test----------2",j,playernum,temp["user_id" + j])
        }
    }
    return playernum;
}
function getRoomSeatsNum(type, data) {
    if (data.renshuxuanze) {
        return data.renshuxuanze;
    } else {

        //小天九 
        if (type == 19000) {
            return 4;
        }
        //牛牛 拼十
        if (type == 10000) {
            return 5;
        }
        // 大天九
        if (type == 19001) {
            return 4;
        }
        // 诈金花 拼十
        if (type == 10001) {
            return 9;
        }
    }
}

//获取用户第一个俱乐部
exports.get_first_club_info = function (userid, data, cb) {
    // console.log("*-*-*-*-*-*-*-*-")
    db.get_user_by_userid(userid, function (ret) {
        if (!ret) {
            cb(1, "没找到对应的用户");
            return;
        }
        var result = [];
        if (ret.join_clubid != null) {
            if (ret.join_clubid.length > 0) {
                // console.log("********join********")
                result = JSON.parse(ret.join_clubid);
            }
        }
        if (ret.create_clubid != null) {
            if (ret.create_clubid.length > 0) {
                // console.log("********create********")
                result = JSON.parse(ret.create_clubid);
            }
        }
        if(ret.last_clubid>0){
            result[0] = ret.last_clubid;
        }
        // console.log("**********", result, result.length)
        if (result.length < 1) {
            cb(1, "not ok");
            return;
        } 

        db.get_club_info_byID(result[0], function (clubinfo) {
            // console.log("get_club_info_byID*-*-*-*--*", clubinfo);
            db.get_club_tableinfo(clubinfo.clubid, function (tableinfo) {
                var roomstate = 0;//桌子状态 创建 0 加入 1 游戏中 2
                var gametype = 0;  // 游戏类型 type
                var roomid = 0;   //房间ID id
                var dealerid = 0; //dealerid
                var t_tableinfo = [];
                if (tableinfo) {
                    for (var i = 0; i < tableinfo.length; i++) {
                        var temp = tableinfo[i];
                        if (temp.user_id0 == 0) {
                            roomstate = 0;
                        } else if (temp.status == 1) {
                            roomstate = 2;
                        } else {
                            roomstate = 1;
                        }

                        var maxseats = getRoomSeatsNum(temp.type, JSON.parse(temp.base_info));
                        var playernum = getRoomPlayerNum(temp);
                        gametype = temp.type;
                        roomid = temp.id;
                        dealerid = temp.dealer;
                        t_tableinfo[i] = {
                            roomstate: roomstate,
                            gametype: gametype,
                            roomid: roomid,
                            creater: temp.user_name0,
                            dealerid: dealerid,
                            maxseats: maxseats,
                            playernum: playernum
                        };
                    }
                }

                console.log(t_tableinfo);

                var temp = {};
                if (typeof (clubinfo.default_table_info) == "string") {
                    console.log("-------clubinfo.default_table_info----------", clubinfo.default_table_info);
                    temp = JSON.parse(clubinfo.default_table_info);
                } else {
                    temp = clubinfo.default_table_info;
                }
                var data = {
                    clubid: clubinfo.clubid,
                    userid: clubinfo.userid,
                    dealerid: clubinfo.dealerid,
                    name: clubinfo.name,
                    notice: clubinfo.notice,
                    level: clubinfo.level,
                    table_num: clubinfo.table_num,
                    table_max: clubinfo.table_max,
                    member_max: clubinfo.member_max,
                    member: clubinfo.member,
                    request: clubinfo.request,
                    default_table_info: temp,
                    tableinfo: t_tableinfo
                }
                // console.log("-*-*-*default_table_info-*-*-", clubinfo.default_table_info)
                cb(0, "ok", data);
                db.set_user_last_clubid(userid,result[0],function(ret){})
            })

        })
    })
}
//获取俱乐部基本信息
exports.get_club_info_byID = function (userid, data, cb) {
    // console.log("get_club_info_byID----------0", data, typeof (data), data.clubid)
    data = JSON.parse(data);

    var clubid = data.clubid;
    db.get_club_info_byID(clubid, function (ret) {
        var t_data = {
            clubid: clubid
        };
        t_data = JSON.stringify(t_data);
        exports.get_club_tableinfo(userid, t_data, function (err, errmsg, tableinfo) {
            if (err == 0) {
                ret.tableinfo = tableinfo.tableinfo;
                ret.default_table_info = JSON.parse(ret.default_table_info);
                cb(0, "ok", ret);
                db.set_user_last_clubid(userid,clubid,function(ret){})
            }
        })
    })

}
//获取俱乐部成员列表
exports.get_club_members = function (userid, data, cb) {
    var data = JSON.parse(data);
    var clubid = data.clubid;
    // console.log("获取俱乐部成员列表clubid :", clubid)
    db.get_clubmember_byclubid(clubid, function (ret) {
        var members = [];
        if (ret) {
            for (i = 0; i < ret.length; i++) {
                var temp = ret[i];
                var element = {
                    userid: temp.userid,
                    username: temp.name,
                    sex: temp.sex,
                    lastlogin: temp.last_login
                }
                members[i] = element;
            }
            //console.log(ret);
            cb(0, "ok", { members: members })
        } else {
            cb(1, "获取俱乐部成员列表出错")
        }
        return;
    })

}

//获取俱乐部申请列表
exports.get_club_request = function (userid, data, cb) {
    var data = JSON.parse(data);
    var clubid = data.clubid;
    db.select_operation("*", "t_club", "clubid", clubid, function (err, ret) {
        if (!err) {
            cb(1, "获取俱乐部申请列表失败");
            return;
        }
        var result = { member: [] };
        // console.log("JSON.parse(ret.request)", JSON.parse(ret.request))
        if (JSON.parse(ret.request) != null) {
            result = JSON.parse(ret.request);
        }
        cb(0, "ok", result);
    });
}


//俱乐部成员增删操作
exports.club_MemberOp = function (userid, data, cb) {
    // console.log("俱乐部成员消息增删操作");
    data = JSON.parse(data);
    var clubid = data.clubid;
    var isadd = data.isadd;
    // var username = data.username;
    // var sex = data.sex;
    var t_memberstr = {
        member: [{ userid: userid, username: "", sex: 0 }]
    };
    db.get_user_by_userid(userid, function (ret) {
        if (ret) {
            t_memberstr.member[0].username = ret.name;
            t_memberstr.member[0].sex = ret.sex;
        }
        // console.log("俱乐部成员消息增删操作")
        //     var userinfo=JSON.parse(data.userinfo);
        db.select_operation("member", "t_club", "clubid", clubid, function (err, ret) {
            if (err) {
                var t_member = [];

                if (ret) {
                    if (ret.member) {
                        t_member = JSON.parse(ret.member);

                        // console.log("antest----------1", t_member, t_member.member[0])
                        for (i = 0; i < t_member.member.length; i++) {
                            // console.log("antest----------2")
                            if (t_member.member[i].userid == userid) {
                                if (isadd) {
                                    cb(1, "已经加入该俱乐部")
                                    return;
                                } else {
                                    t_member.member.splice(i, 1);
                                }
                            }
                        }
                        // console.log("antest----------3")
                        if (isadd) {
                            t_member.member[t_member.member.length] = t_memberstr.member[0];
                        }
                    } else {
                        t_member = t_memberstr;
                    }
                    db.update_operation("t_club", "member", JSON.stringify(JSON.stringify(t_member)), "clubid", clubid, function (err) {
                        var dclubid = data.clubid;

                        if (isadd) {
                            var t_data = {
                                clubid: data.clubid,
                                isadd: false,
                                username: t_memberstr.member[0].username
                            }
                            t_data = JSON.stringify(t_data);
                            exports.club_RequestOp(userid, t_data, function (err, ret) {
                                var t_data = {
                                    clubid: dclubid,
                                    isadd: isadd
                                }
                                t_data = JSON.stringify(t_data);

                                // console.log("set_user_join_clubid", userid, t_data)
                                exports.set_user_join_clubid(userid, t_data, function (err, ret) { });
                                cb(0, "ok");
                            });
                        } else {
                            db.set_user_last_clubid(userid, 0, function (ret) {
                                if (!ret) {
                                    cb(1, "set_user_last_clubid failed")
                                }
                                else {
                                    var t_data = {
                                        clubid: dclubid,
                                        isadd: isadd
                                    }
                                    t_data = JSON.stringify(t_data);

                                    // console.log("set_user_join_clubid", userid, t_data)
                                    exports.set_user_join_clubid(userid, t_data, function (err, ret) { });
                                    cb(0, "ok");
                                }
                            })
                        }
                        // console.log("x");
                    });
                } else {
                    cb(1, "有错出现了")
                }
            }
        });
    })

}
//俱乐部申请消息增删操作
exports.club_RequestOp = function (userid, data, cb) {
    // console.log("俱乐部申请消息增删操作");
    data = JSON.parse(data);
    var clubid = data.clubid;
    var isadd = data.isadd;
    // var username = "data.username";
    // var sex = data.sex;
    var t_requeststr = {
        member: [{ userid: userid, username: "", sex: 0 }]
    };
    db.get_user_by_userid(userid, function (ret) {
        // console.log("retretretretretretret", ret.name)
        if (ret) {
            t_requeststr.member[0].username = ret.name;
            t_requeststr.member[0].sex = ret.sex;
        }
        db.select_operation("request", "t_club", "clubid", clubid, function (err, ret) {
            if (err) {
                var t_request = [];

                if (ret) {
                    if (ret.request) {
                        t_request = JSON.parse(ret.request);

                        // console.log("antest----------1", t_request, t_request.member[0])
                        for (i = 0; i < t_request.member.length; i++) {
                            // console.log("antest----------2")
                            if (t_request.member[i].userid == userid) {
                                // console.log("**t_request.member[i].userid***", t_request.member[i].userid, "*userid*", userid)
                                if (isadd) {
                                    cb(1, "You have been asked to join the club!");
                                    return;
                                } else {
                                    t_request.member.splice(i, 1);
                                }
                            }
                        }
                        // console.log("antest----------3")
                        if (isadd) {
                            t_request.member[t_request.member.length] = t_requeststr.member[0];
                        }
                    } else {
                        t_request = t_requeststr;
                    }
                    db.update_operation("t_club", "request", JSON.stringify(JSON.stringify(t_request)), "clubid", clubid, function (err) {
                        cb(0, "ok");
                    });
                }
                else {
                    cb(2, "error clubid");
                }

            }
        })
    })
}

//给成员增加 已经加入俱乐部信息
exports.set_user_join_clubid = function (userid, data, cb) {
    data = JSON.parse(data);
    var clubid = data.clubid;
    //var userid =userid;
    var join_clubid = [];
    var join_clubidstr = [clubid];
    var isadd = data.isadd;
    // console.log("-------给成员增加 已经加入俱乐部信息------------", userid)
    db.get_user_by_userid(userid, function (ret) {
        //-------------- 
        // console.log("-------------------", ret)
        if (ret) {
            if (ret.join_clubid) {
                join_clubid = JSON.parse(ret.join_clubid);
                if (join_clubid.length > 3 && isadd) {
                    cb(2, "加入的俱乐部数量达到上限")
                    return;
                }
                for (i = 0; i < join_clubid.length; i++) {
                    if (join_clubid[i] == clubid) {
                        if (isadd) {
                            cb(1, "已经加入该俱乐部")
                            return;
                        } else {
                            join_clubid.splice(i, 1);
                        }
                    }
                }
                if (isadd) {
                    join_clubid[join_clubid.length] = clubid
                }
            } else {
                join_clubid = join_clubidstr;
            }
        }
        // console.log("给成员增加 已经加入俱乐部信息2", join_clubid)
        // db.update_operation("t_users", "join_clubid", JSON.stringify(JSON.stringify(join_clubid)), "userid", userid, function (err) {
        //     if (err) {
        //         // console.log("在玩家信息中加入俱乐部ID失败");
        //         cb(1, "在玩家信息中加入俱乐部ID失败");
        //         return;
        //     }
        // })
        db.set_user_join_clubid(userid,JSON.stringify(JSON.stringify(join_clubid)),function(ret){
            if(!ret){
                cb(1,"在玩家信息中加入俱乐部ID失败");
                return;
            }
        })
        //--------------- 
    })
}
//获取俱乐部游戏记录
exports.get_club_gameRecords = function (userid, data, cb) {
    data = JSON.parse(data);
    var clubid = data.clubid;
    db.get_club_gamerecords(clubid, function (err, ret) {
        if (!err) {
            cb(1, "获取记录出错");
            return;
        }
        cb(0, "ok", { data: ret });
    })

}

//设置俱乐部默认房间信息
exports.set_club_default_tableinfo = function (userid, data, cb) {
    var data = JSON.parse(data);
    var clubid = data.clubid;
    var info = data.conf;
    info.gametype = data.gametype;
    //console.log("--------room base info---------", info,"----------end---------")

    db.set_club_default_tableinfo(clubid, JSON.stringify(JSON.stringify(info)), function (ret) {
        if (ret) {
            // console.log("设置俱乐部默认房间成功")
            cb(0, "ok");
        } else {
            cb(1, "设置俱乐部默认房间信息失败");
            // console.log("设置俱乐部默认房间失败")
        }
    })
}
//修改俱乐部名字
exports.set_club_name = function (userid, data, cb) {
    var data = JSON.parse(data);
    var clubid = data.clubid;
    var clubname = data.clubname;
    //console.log("--------test--------",data,clubname,typeof(clubname))
    db.set_club_name(clubid, JSON.stringify(clubname), function (ret) {
        if (ret) {
            cb(0, "ok")
        } else {
            cb(1, "修改俱乐部名字失败")
        }
    })
}
//修改俱乐部公告
exports.set_club_notice = function (userid, data, cb) {
    var data = JSON.parse(data);
    var clubid = data.clubid;
    var notice = data.notice;
    db.set_club_notice(clubid, JSON.stringify(notice), function (ret) {
        if (ret) {
            cb(0, "ok")
        } else {
            cb(1, "修改俱乐部公告失败")
        }
    })
}
// //获取充值配置信息
// exports.get_recharge_config = function (userid, data, cb) {
//     dealerdb.get_recharge_config(function (ret) {
//         var PAY_URL = configs.PAY_URL;
//         if (ret) {
//             cb(0, "ok", { data: ret, PAY_URL: PAY_URL });
//         } else {
//             cb(1, "未找到对应数据")
//         }
//     })
// }
//获取俱乐部名称公告
exports.get_club_name_notice = function (userid, data, cb) {
    var data = JSON.parse(data);
    var clubid = data.clubid;
    db.get_club_info_byID(clubid, function (ret) {
        if (ret) {
            var result = {
                name: ret.name,
                notice: ret.notice
            }
            cb(0, "ok", result);
        } else {
            cb(1, "不知道出什么错了")
        }
    })
}

//删除俱乐部 (功能暂不用)
exports.delete_club =function(userid,data,cb){
    var data = JSON.parse(data);
    var clubid = data.clubid;
    db.get_club_info_byID(clubid,function(ret){
        if(!ret){
            cb(1,"找不到对应俱乐部");
            return
        }
        if(ret.userid == userid){
            db.delete_club(clubid,function(ret){
                if(ret){
                    cb(0,"ok 删除成功")
                    db.get_clubmember_byclubid(clubid,function(ret){

                        for(i=0;i<ret.length;i++){
                            var temp = ret[i]
                            var join =JSON.parse(temp.join_clubid);
                            var create =JSON.parse(temp.create_clubid);
                            for(j=0;j<join.length;j++){
                                if(join[j] == clubid){
                                    join.splice(j,1);
                                    db.set_user_join_clubid(userid,JSON.stringify(JSON.stringify(join)),function(ret){
                                        if(ret){
                                            console.log("删除用户 加入俱乐部字段内容")
                                        }
                                    })
                                    break;
                                }
                            }
                            for(k=0;k<create.length;k++){
                                if(create[k]==clubid){
                                    create.splice(k,1);
                                    db.set_user_create_clubid(userid,JSON.stringify(create),function(ret){
                                        if(ret){
                                            console.log("删除用户 创建俱乐部字段内容")
                                        }
                                    })
                                    break;
                                }
                            }

                        }
                    })
                }else{
                    cb(1,"删除失败")
                }
            })
        }

    });

}
//退出俱乐部
exports.exit_club =function(userid,data,cb){
    var data = JSON.parse(data);
    var clubid = data.clubid;
    db.get_user_by_userid(userid,function(ret){
        var join =[]
        join =JSON.parse(ret.join_clubid);
        if(!join){
            cb(1,"用户没有加入俱乐部")
            return;
        }
        for(i=0;i<join.length;i++){
            if(join[i]==clubid){
                join.splice(i,1);
                db.set_user_join_clubid(userid,JSON.stringify(JSON.stringify(join)),function(ret){
                    if(ret){
                        db.get_club_member(clubid,function(ret){
                            var member = ret.member
                            for(j=0;j<member.length;j++ ){
                                if(member[j].userid==userid){
                                    member.splice(j,1);
                                    break;
                                }
                            }
                            var tmember={
                                member:member
                            }
                            db.update_club_member(clubid,JSON.stringify(JSON.stringify(tmember)))
                        })
                        db.set_user_last_clubid(userid,0,function(ret){
                            if(ret){
                                cb(0,"ok")
                            }
                        });
                        
                    }else{
                        cb(2,"退出俱乐部 失败")
                    }
                })
            }
        }

    })
}

//获取俱乐部对应代理的房卡数
exports.get_dealergems_by_clubid = function( userid,data,cb ){
    var data = JSON.parse(data);
    var clubid = data.clubid;
    db.get_club_info_byID(clubid,function(ret){
        if(ret){
            var dealerid = ret.dealerid;
            dealerdb.get_gems_by_dealerid(dealerid,function(ret){
                if(ret){
                    cb(0,"ok",ret);
                }else{
                    cb(1,"没找到对应信息")
                }
            })
        }else{
            cb(2,"没找到对应的俱乐部")
        }
    })

}
//-------------------------------------
//加入游戏
exports.join_game = function (userid, data, cb) {
    var data = JSON.parse(data);
    var table_index = data.table_index;
    var account = data.account;
    var clubid = data.clubid;
    var type = data.type;
    db.get_user_data(account, function (data1) {
        if (isTableEmpty) {
            var conf = data.conf ? data.conf : default_table_info;
            db.get_user_data(account, function (data1) {
                if (data == null) {
                    http.send(res, 1, "system error");
                    return;
                }
                var userId = data1.userid;
                var mask = data1.mask ? data1.mask : "";
                var name = data1.name;
                var lucky = data1.lucky ? data1.lucky : 0;
                //验证玩家状态
                db.get_room_id_of_user(userId, function (roomId) {
                    if (roomId != null) {
                        http.send(res, -1, "user is playing in room now.");
                        return;
                    }
                    //创建房间
                    room_service.createRoom(account, userId, conf, type, function (err, roomId) {
                        if (err == 0 && roomId != null) {
                            room_service.enterRoom(userId, mask, name, roomId, lucky, function (errcode, enterInfo) {
                                if (enterInfo) {
                                    var ret = {
                                        roomid: roomId,
                                        ip: enterInfo.ip,
                                        port: enterInfo.port,
                                        type: enterInfo.type,
                                        token: enterInfo.token,
                                        time: Date.now()
                                    };
                                    ret.sign = crypto.md5(ret.roomid + ret.token + ret.time + config.ROOM_PRI_KEY);
                                    http.send(res, 0, "ok", ret);
                                }
                                else {
                                    http.send(res, errcode, "room doesn't exist.");
                                }
                            });
                        }
                        else {
                            http.send(res, err, "create failed.");
                        }
                    });
                });
            });
        }
        else if (isFull) {
            return false;
        }
        else if (notFull) {
            room_service.enterRoom(userid, '', name, roomId, lucky, function (errcode, enterInfo) {
                if (enterInfo) {
                    var ret = {
                        roomid: roomId,
                        ip: enterInfo.ip,
                        port: enterInfo.port,
                        type: enterInfo.type,
                        token: enterInfo.token,
                        time: Date.now()
                    };
                    ret.sign = crypto.md5(roomId + ret.token + ret.time + config.ROOM_PRI_KEY);
                    http.send(res, 0, "ok", ret);
                }
                else {
                    http.send(res, errcode, "enter room failed.");
                }
            });
        }
    });
}
//增加俱乐部桌子
exports.club_addTable = function (userid, data, cb) {
    var data = JSON.parse(data);
    var clubid = data.clubid;
    db.update_club_tablenum(clubid, function (ret) {
        if (ret) {
            cb(1, "没找到俱乐部，或俱乐部桌子数量达到上限");
        } else {
            cb(0, "ok");
        }

    })

}
//修改俱乐部桌子信息
exports.club_editTable = function (userid, data, cb) {
    data = JSON.parse(data);
    var baseinfo = data.baseinfo;
    var roomid = data.roomid;
    db.update_operation("t_rooms", "baseinfo", baseinfo, "roomid", roomid, function (err, ret) {
        cb(err, ret);
    });
}
//获取俱乐部排行榜信息
exports.get_club_rankinfo = function (userid, data, cb) {
    data = JSON.parse(data);
    var clubid = data.clubid;
}



//
//延迟加载
setTimeout(init, 1000);

// // 测试从数据库中读取数据信息
// setTimeout(function () {
//     console.log(JSON.stringify(allClubInfo));
// }, 5000);