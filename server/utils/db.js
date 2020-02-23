var mysql = require("mysql");
var crypto = require('./crypto');

var pool = null;

function nop(a, b, c, d, e, f, g) {

}

var MONEY_TYPE = {
    COINS: 0, //金币
    GEMS: 1, //房卡(钻石)
    TICKET: 2, //参赛卷
    POINT: 3, //积分
}
exports.MONEY_TYPE = MONEY_TYPE;

var MONEY_FIELD_NAME = {
    0: "coins", //金币
    1: "gems", //房卡(钻石)
    2: "ticket", //参赛卷
    3: "point", //积分
}
exports.MONEY_FIELD_NAME = MONEY_FIELD_NAME;

function query(sql, callback) {
    console.log(sql);
    pool.getConnection(function (err, conn) {
        if (err) {
            callback(err, null, null);
        } else {
            conn.query(sql, function (qerr, vals, fields) {
                //释放连接  
                conn.release();
                //事件驱动回调  
                callback(qerr, vals, fields);
            });
        }
    });
};

exports.init = function (config) {
    pool = mysql.createPool({
        host: config.HOST,
        user: config.USER,
        password: config.PSWD,
        database: config.DB,
        port: config.PORT,
        dateStrings: true,
    });
};

exports.is_account_exist = function (account, callback) {
    callback = callback == null ? nop : callback;
    if (account == null) {
        callback(false);
        return;
    }

    var sql = 'SELECT * FROM t_accounts WHERE account = "' + account + '"';
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            if (rows.length > 0) {
                callback(true);
            }
            else {
                callback(false);
            }
        }
    });
};

exports.create_account = function (account, password, callback) {
    callback = callback == null ? nop : callback;
    if (account == null || password == null) {
        callback(false);
        return;
    }

    var psw = crypto.md5(password);
    var sql = 'INSERT INTO t_accounts(account,password) VALUES("' + account + '","' + psw + '")';
    query(sql, function (err, rows, fields) {
        if (err) {
            if (err.code == 'ER_DUP_ENTRY') {
                callback(false);
                return;
            }
            callback(false);
            console.log(err);
        }
        else {
            callback(true);
        }
    });
};

exports.get_account_info = function (account, password, callback) {
    callback = callback == null ? nop : callback;
    if (account == null) {
        callback(null);
        return;
    }

    var sql = 'SELECT * FROM t_accounts WHERE account = "' + account + '"';
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(null);
            console.log(err);
        }

        if (rows.length == 0) {
            callback(null);
            return;
        }

        if (password != null) {
            var psw = crypto.md5(password);
            if (rows[0].password == psw) {
                callback(null);
                return;
            }
        }

        callback(rows[0]);
    });
};

exports.is_user_exist = function (account, callback) {
    callback = callback == null ? nop : callback;
    if (account == null) {
        callback(false);
        return;
    }

    var sql = 'SELECT userid FROM t_users WHERE account = "' + account + '"';
    query(sql, function (err, rows, fields) {
        if (err) {
            console.log(err);
        }

        if (rows.length == 0) {
            callback(false);
            return;
        }

        callback(true);
    });
}

exports.get_user_data = function (account, callback) {
    callback = callback == null ? nop : callback;
    if (account == null) {
        callback(null);
        return;
    }

    var sql = 'SELECT * FROM t_users WHERE account = "' + account + '"';
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(null);
            console.log(err);
        }

        if (rows.length == 0) {
            callback(null);
            return;
        }
        rows[0].name = crypto.fromBase64(rows[0].name);
		
		if (rows[0].exp > 0){
			rows[0].lucky = 100;
		}
		
        callback(rows[0]);
    });
};
/**清除俱乐部房间 */
exports.delete_club_room = function (clubId, callback) {
    callback = callback == null ? nop : callback;
    if (clubId == null) {
        callback(null);
        return;
    }
    var sql = 'DELETE FROM t_rooms WHERE clubid = "' + clubId + '"';
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
        }
        else {
            callback(true);
        }
    });
};
exports.get_club_room = function (clubId, callback) {
    callback = callback == null ? nop : callback;
    if (clubId == null) {
        callback(null);
        return;
    }
    var sql = 'select * FROM t_rooms WHERE clubid = "' + clubId + '"';
    query(sql, function (err, rows, fields) {
        query(sql, function (err, rows, fields) {
            if (err) {
                callback(false);
                console.log(err);
            }
            if (rows.length == 0) {
                callback(null);
                return;
            }
            callback(rows);
        });
    });
};
//排行榜
exports.get_user_rank = function (type, limit, callback) {
    callback = callback == null ? nop : callback;
    var field = MONEY_FIELD_NAME[type];
    var sql = `SELECT userid,uname,${field},last_login FROM t_users ORDER BY ${field} DESC LIMIT ${limit}`;
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }

        if (rows.length == 0) {
            callback(null);
            return;
        }

        callback(rows);

    });
};

exports.get_userid_by_mask = function (mask, callback) {
    callback = callback == null ? nop : callback;
    if (mask == null) {
        callback(null);
        return;
    }

    var sql = 'SELECT userid FROM t_users WHERE mask = ' + mask;
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(null);
            console.log(err);
        }

        if (rows.length == 0) {
            callback(null);
            return;
        }
        callback(rows[0]);
    });
};

exports.get_user_data_by_userid = function (userid, callback) {
    callback = callback == null ? nop : callback;
    if (userid == null) {
        callback(null);
        return;
    }

    var sql = 'SELECT * FROM t_users WHERE userid = ' + userid;
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(null);
            console.log(err);
        }

        if (rows.length == 0) {
            callback(null);
            return;
        }
        rows[0].name = crypto.fromBase64(rows[0].name);
        callback(rows[0]);
    });
};
/**增加玩家房卡 */
exports.add_user_gems = function (userid, gems, callback) {
    callback = callback == null ? nop : callback;
    if (userid == null) {
        callback(false);
        return;
    }

    var sql = 'UPDATE t_users SET gems = gems +' + gems + ' WHERE userid = ' + userid;
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            return;
        }
        else {
            callback(rows.affectedRows > 0);
            return;
        }
    });
};

exports.get_gems_by_userid = function (userid, callback) {
    callback = callback == null ? nop : callback;
    if (userid == null) {
        callback(null);
        return;
    }

    var sql = 'SELECT gems FROM t_users WHERE userid = "' + userid + '"';
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(null);
            console.log(err);
        }

        if (rows.length == 0) {
            callback(null);
            return;
        }


        callback(rows[0]);
    });
};

exports.get_gems = function (account, callback) {
    callback = callback == null ? nop : callback;
    if (account == null) {
        callback(null);
        return;
    }

    var sql = 'SELECT gems, exp FROM t_users WHERE account = "' + account + '"';
    query(sql, function (err, rows, fields) {
        console.log("rows ========================= ", rows);
        if (err) {
            callback(null);
            console.log(err);
        }

        if (rows.length == 0) {
            callback(null);
            return;
        }

        if (rows[0].exp > 0){
			rows[0].gems = 10;
		}

        callback(rows[0]);
    });
};

exports.get_ticket = function (userid, callback) {
    callback = callback == null ? nop : callback;
    if (userid == null) {
        callback(null);
        return;
    }

    var sql = 'SELECT ticket FROM t_users WHERE userid = "' + userid + '"';
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(null);
            console.log(err);
        }

        if (rows.length == 0) {
            callback(null);
            return;
        }

        callback(rows[0]);
    });
};

exports.get_point = function (userid, callback) {
    callback = callback == null ? nop : callback;
    if (userid == null) {
        callback(null);
        return;
    }

    var sql = 'SELECT point FROM t_users WHERE userid = "' + userid + '"';
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(null);
            console.log(err);
        }

        if (rows.length == 0) {
            callback(null);
            return;
        }

        callback(rows[0]);
    });
};

//获取玩家历史信息
exports.get_user_history = function (userId, callback) {
    callback = callback == null ? nop : callback;
    if (userId == null) {
        callback(null);
        return;
    }

    var sql = 'SELECT history FROM t_users WHERE userid = "' + userId + '"';
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(null);
            console.log(err);
        }

        if (rows.length == 0) {
            callback(null);
            return;
        }
        var history = rows[0].history;
        if (history == null || history == "") {
            callback(null);
        }
        else {
            history = JSON.parse(history);
            callback(history);
        }
    });
};

exports.update_user_history = function (userId, history, callback) {
    callback = callback == null ? nop : callback;
    if (userId == null || history == null) {
        callback(false);
        return;
    }

    history = JSON.stringify(history);
    var sql = 'UPDATE t_users SET roomid = null, history = \'' + history + '\' WHERE userid = "' + userId + '"';
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }

        if (rows.length == 0) {
            callback(false);
            return;
        }

        callback(true);
    });
};

// 防止重复记录信息
var recordInfoList = [];
exports.update_user_games_record = function (roomid, gametype, userid, username, score, callback) {
    callback = callback == null ? nop : callback;
    if (roomid == null || gametype == null || userid == null || username == null || score == null) {
        callback(false);
        return;
    }

    var sql = "INSERT INTO `t_games_record` (`room_id`, `type`, `create_time`, `user_id`, `user_name`, `user_score`) VALUES ('{0}', '{1}', NOW(), '{2}', '{3}', '{4}');";
    sql = sql.format(roomid, gametype, userid, username, score);
    if (recordInfoList.indexOf(sql) != -1) {
        callback(true);
        return;
    }
    if (recordInfoList.length >= 100) {
        recordInfoList.shift();//最多只保留100条
    }
    recordInfoList.push(sql); //向末尾添加一个sql语句
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            throw err;
        }

        if (rows.length == 0) {
            callback(false);
            return;
        }

        callback(true);
    });
};

exports.get_games_of_room = function (room_uuid, callback) {
    callback = callback == null ? nop : callback;
    if (room_uuid == null) {
        callback(null);
        return;
    }

    var sql = 'SELECT game_index,create_time,result FROM t_games_archive WHERE room_uuid = "' + room_uuid + '"';
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(null);
            console.log(err);
        }

        if (rows.length == 0) {
            callback(null);
            return;
        }

        callback(rows);
    });
};

exports.get_detail_of_game = function (room_uuid, index, callback) {
    callback = callback == null ? nop : callback;
    if (room_uuid == null || index == null) {
        callback(null);
        return;
    }
    var sql = 'SELECT type,base_info,action_records FROM t_games_archive WHERE room_uuid = "' + room_uuid + '" AND game_index = ' + index;
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(null);
            console.log(err);
        }

        if (rows.length == 0) {
            callback(null);
            return;
        }
        callback(rows[0]);
    });
}

exports.create_user = function (account, name, coins, gems, sex, headimg, callback) {
    callback = callback == null ? nop : callback;
    if (account == null || name == null || coins == null || gems == null) {
        callback(false);
        return;
    }


    name = typeof (name) == "string" ? name : "";
    var uname = name; //未加密的名称
    name = crypto.toBase64(name);

    headimg = headimg ? headimg : "null";
    var sql = 'INSERT INTO t_users(account,name,uname,coins,gems,sex,headimg,create_time) VALUES("{0}","{1}","{2}",{3},{4},{5},"{6}",NOW())';
    sql = sql.format(account, name, uname, coins, gems, sex, headimg);
    query(sql, function (err, rows, fields) {
        if (err) {
            console.log(err);
        }
        callback(true);
    });
};

exports.update_user_info = function (userid, name, headimg, sex, callback) {
    callback = callback == null ? nop : callback;
    if (userid == null) {
        callback(null);
        return;
    }

    name = typeof (name) == "string" ? name : "";
    var uname = name; //未加密的名称
    name = crypto.toBase64(name);

    headimg = headimg ? headimg : "null";
    var sql = 'UPDATE t_users SET name="{0}",uname="{1}",headimg="{2}",sex={3} WHERE account="{4}"';
    sql = sql.format(name, uname, headimg, sex, userid);
    query(sql, function (err, rows, fields) {
        if (err) {
            console.log(err);
        }
        callback(rows);
    });
};

exports.get_user_by_userid = function (puserid, callback) {
    if (!puserid || puserid == "")
        return null;
    var sql = "select * from t_users where userid='{0}';";
    sql = sql.format(puserid);
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            if (rows.length > 0) {
                callback(rows[0]);
            }
            else {
                callback(false);
            }
        }
    });
};
exports.bind_friend = function (userid, puserid, callback) {
    if (!userid || puserid == "")
        return false;
    var sql = "INSERT INTO `t_bind_friend` (`userid`, `puserid`, `time`) VALUES ('{0}', '{1}', NOW());";
    sql = sql.format(userid, puserid);

    var sql_up = 'UPDATE t_users SET gems = gems+1 where userid="{0}";';
    sql_up = sql_up.format(userid);

    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            var db = require('../utils/db');
            db.query(sql_up, function (err, rows, fields) {
                if (err) {
                    callback(false);
                    console.log(err);
                }
                else {
                    callback(true);
                }
            }
            )
        }
    });
};
exports.get_friend_by_userid = function (userid, callback) {
    if (!userid || userid == "")
        return null;
    var sql = "select * from t_bind_friend where userid='{0}';";
    sql = sql.format(userid);
    query(sql, function (err, rows, fields) {
        if (err) {
            // callback(false);
            callback(true);
            console.log(err);
        }
        else {
            if (rows.length > 0) {
                callback(true);
            }
            else {
                callback(false);
            }
        }
    });
};

exports.get_user_base_info = function (userid, callback) {
    callback = callback == null ? nop : callback;
    if (userid == null) {
        callback(null);
        return;
    }
    var sql = 'SELECT name,sex,headimg,coins FROM t_users WHERE userid={0}';
    sql = sql.format(userid);
    query(sql, function (err, rows, fields) {
        if (err) {
            console.log(err);
        }
        rows[0].name = crypto.fromBase64(rows[0].name);
        callback(rows[0]);
    });
};

exports.is_room_exist = function (roomId, callback) {
    callback = callback == null ? nop : callback;
    var sql = 'SELECT * FROM t_rooms WHERE id = "' + roomId + '"';
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(rows.length > 0);
        }
    });
};

exports.cost_gems = function (userid, cost, gameType, callback) {
    callback = callback == null ? nop : callback;
    var sql = 'UPDATE t_users SET gems = gems -' + cost + ' WHERE exp = 0 and userid = ' + userid;
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(rows.length > 0);
        }
    });

    //记录房卡消费信息
    var sql1 = "INSERT INTO `t_user_cost_record` (`gametype`, `create_time`, `user_id`, `cost`) VALUES ('{0}', NOW(), '{1}', '{2}');";
    sql1 = sql1.format(gameType, userid, cost);
    query(sql1, function (err, rows, fields) {
        if (err) {
            console.log(err);
        }
    });
};

exports.cost_ticket = function (userid, cost, callback) {
    callback = callback == null ? nop : callback;
    var sql = 'UPDATE t_users SET ticket = ticket -' + cost + ' WHERE userid = ' + userid;
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(rows.length > 0);
        }
    });
};

exports.add_ticket = function (userid, add, callback) {
    callback = callback == null ? nop : callback;
    var sql = 'UPDATE t_users SET ticket = ticket +' + add + ' WHERE userid = ' + userid;
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(rows.length > 0);
        }
    });
};

exports.add_point = function (userid, add, callback) {
    callback = callback == null ? nop : callback;
    var sql = 'UPDATE t_users SET point = point +' + add + ' WHERE userid = ' + userid;
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(rows.length > 0);
        }
    });
};

exports.cost_point = function (userid, cost, callback) {
    callback = callback == null ? nop : callback;
    var sql = 'UPDATE t_users SET point = point -' + cost + ' WHERE userid = ' + userid;
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(null);
            console.log(err);
        } else {
            callback(rows.length > 0);
        }
    });
};


exports.update_room_result = function (room_uuid, index, result, callback) {
    callback = callback == null ? nop : callback;
    if (room_uuid == null || result) {
        callback(false);
    }

    result = JSON.stringify(result);
    var sql = "UPDATE t_rooms SET user_score" + index + " = '" + result + "' WHERE uuid = '" + room_uuid + "'";
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(true);
        }
    });
};

exports.update_room_cions = function (room_uuid, index, result, callback) {
    callback = callback == null ? nop : callback;
    if (room_uuid == null || result) {
        callback(false);
    }

    result = JSON.stringify(result);
    var sql = "UPDATE t_rooms SET user_cions" + index + " = '" + result + "' WHERE uuid = '" + room_uuid + "'";
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(true);
        }
    });
};

exports.update_room_score = function (roomid, index, score, callback) {
    callback = callback == null ? nop : callback;
    if (room_uuid == null || score) {
        callback(false);
    }
    var sql = "UPDATE t_rooms SET user_score" + index + " = '" + score + "' WHERE id = '" + roomid + "'";
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(true);
        }
    });
};


exports.set_room_id_of_user = function (userId, roomId, callback) {
    callback = callback == null ? nop : callback;
    if (roomId != null) {
        roomId = '"' + roomId + '"';
    }
    var sql = 'UPDATE t_users SET roomid = ' + roomId + ' WHERE userid = "' + userId + '"';
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(rows.length > 0);
        }
    });
};

exports.get_room_id_of_user = function (userId, callback) {
    callback = callback == null ? nop : callback;
    var sql = 'SELECT roomid FROM t_users WHERE userid = "' + userId + '"';
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(null);
            console.log(err);
        }
        else {
            if (rows.length > 0) {
                callback(rows[0].roomid);
            }
            else {
                callback(null);
            }
        }
    });
};
exports.update_last_login = function (userId, callback) {
    callback = callback == null ? nop : callback;
    var sql = 'UPDATE t_users SET last_login =NOW() WHERE userid = "' + userId + '"';
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(rows.length > 0);
        }
    });
};

exports.create_room = function (roomId, conf, ip, port, create_time, type, dealer, callback) {
    callback = callback == null ? nop : callback;
    dealer = dealer ? dealer : null;
    var sql = "INSERT INTO t_rooms(uuid,id,base_info,ip,port,create_time,type,dealer) \
                VALUES('{0}','{1}','{2}','{3}',{4},{5},{6},{7}) ON DUPLICATE KEY UPDATE uuid = '{8}'";
    var uuid = Date.now() + roomId;
    var baseInfo = JSON.stringify(conf);
    sql = sql.format(uuid, roomId, baseInfo, ip, port, create_time, type, dealer ? dealer : "null", uuid);
    query(sql, function (err, row, fields) {
        if (err) {
            callback(null);
            console.log(err);
        }
        else {
            callback(uuid);
        }
    });
};

//创建代开房间
exports.create_agent_room = function (roomId, conf, ip, port, create_time, type, dealer, agent, callback) {
    callback = callback == null ? nop : callback;
    dealer = dealer ? dealer : null;
    var sql = "INSERT INTO t_rooms(uuid,id,base_info,ip,port,create_time,type,dealer,agent) \
                VALUES('{0}','{1}','{2}','{3}',{4},{5},{6},{7},{8}) ON DUPLICATE KEY UPDATE uuid = '{9}'";
    var uuid = Date.now() + roomId;
    var baseInfo = JSON.stringify(conf);
    sql = sql.format(uuid, roomId, baseInfo, ip, port, create_time, type, dealer ? dealer : "null", agent, uuid);
    query(sql, function (err, row, fields) {
        if (err) {
            callback(null);
            console.log(err);
        }
        else {
            callback(uuid);
        }
    });
};

//获取代开的房间
exports.get_club_room = function (clubid, callback) {
    callback = callback == null ? nop : callback;
    var sql = "select * from t_rooms where clubid='{0}' order by create_time;";
    sql = sql.format(clubid);
    console.log(sql);
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(null);
            throw err;
        }
        else {
            var infos = [];
            console.log("get_club_room ================ ", rows);
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];

                var info = {}
                info.roomid = row.id;
                info.base_info = JSON.parse(row.base_info);
                info.numOfSaveGames = row.numOfSaveGames;
                info.type = row.type;
                info.users = [];
                console.log("info.base_info ============= ", info.base_info, "    base_info.renshuxuanze ============= ", info.base_info.renshuxuanze);
                if (typeof (info.base_info.renshuxuanze) == "undefind") {
                    if (info.type == 10000) {
                        //牛牛
                        for (var j = 0; j < 10; j++) {
                            info.users[j] = {
                                userid: row["user_id" + j],
                                icon: row["user_icon" + j],
                                name: crypto.fromBase64(row["user_name" + j]),
                                score: row["user_score" + j],
                            }
                        }
                    }
                    else {
                        for (var j = 0; j < 4; j++) {
                            info.users[j] = {
                                userid: row["user_id" + j],
                                icon: row["user_icon" + j],
                                name: crypto.fromBase64(row["user_name" + j]),
                                score: row["user_score" + j],
                            }
                        }
                    }
                }
                else {
                    for (var j = 0; j < info.base_info.renshuxuanze; j++) {
                        info.users[j] = {
                            userid: row["user_id" + j],
                            icon: row["user_icon" + j],
                            name: crypto.fromBase64(row["user_name" + j]),
                            score: row["user_score" + j],
                        }
                    }
                }
                info.create_time = row.create_time;
                infos.push(info);
            }
            callback(infos);
        }
    });
};

//获取单个代开房信息
exports.get_single_club_room = function (roomid, callback) {
    callback = callback == null ? nop : callback;
    var sql = "select * from t_rooms where id='{0}'";
    sql = sql.format(roomid);
    console.log(sql);
    query(sql, function (err, rows, fields) {
        console.log('==================', rows);
        if (err) {
            callback(null);
            throw err;
        }
        else {
            callback(rows[0]);
        }
    });
};

//清除房间
exports.clear_user_roomid = function (roomId, callback) {
    callback = callback == null ? nop : callback;
    if (roomId == null) {
        callback(false);
    }
    var sql = "update t_users set roomid=null where roomid='{0}';";
    sql = sql.format(roomId);
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            throw err;
        }
        else {
            callback(true);
        }
    });
}

exports.update_idle_endtime = function (roomId, idleEndtime, callback) {
    callback = callback == null ? nop : callback;
    var sql = 'UPDATE t_rooms SET idle_end_time = ' + idleEndtime + ' WHERE id = "' + roomId + '"';
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(true);
        }
    });
}

exports.get_room_uuid = function (roomId, callback) {
    callback = callback == null ? nop : callback;
    var sql = 'SELECT uuid FROM t_rooms WHERE id = "' + roomId + '"';
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(null);
            console.log(err);
        }
        else {
            callback(rows[0].uuid);
        }
    });
};

exports.update_seat_info = function (roomId, seatIndex, userId, icon, name, callback) {
    callback = callback == null ? nop : callback;
    var sql = 'UPDATE t_rooms SET user_id{0} = {1},user_icon{0} = "{2}",user_name{0} = "{3}" WHERE id = "{4}"';
    name = crypto.toBase64(name);
    sql = sql.format(seatIndex, userId, icon, name, roomId);
    query(sql, function (err, row, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(true);
        }
    });
};

exports.update_num_of_turns = function (roomId, numOfTurns, callback) {
    callback = callback == null ? nop : callback;
    var sql = 'UPDATE t_rooms SET num_of_turns = {0} WHERE id = "{1}"'
    sql = sql.format(numOfTurns, roomId);
    query(sql, function (err, row, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(true);
        }
    });
};

exports.update_room_status = function (roomId, status, callback) {
    callback = callback == null ? nop : callback;
    var sql = 'UPDATE t_rooms SET status = {0} WHERE id = "{1}"'
    sql = sql.format(status, roomId);
    query(sql, function (err, row, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(true);
        }
    });
};

exports.friend_query_turns = function (userid, callback) {
    callback = callback == null ? nop : callback;
    var sql = 'select * from t_bind_friend WHERE userid = "{0}"'
    sql = sql.format(userid);
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else if (rows.length > 0) {
            callback(true, rows[0].puserid, rows[0].turns, userid);
        } else {
            callback(false);
        }
    });
};
exports.friend_add_turns = function (userid, callback) {
    callback = callback == null ? nop : callback;
    var sql = 'UPDATE t_bind_friend SET turns = (turns+1) WHERE userid = "{0}"'
    sql = sql.format(userid);
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {

            callback(true);
        }
    });
};
exports.user_add_gems = function (userid, callback) {
    callback = callback == null ? nop : callback;
    var sql = 'UPDATE t_users SET gems = (gems+1) WHERE userid = "{0}"'
    sql = sql.format(userid);
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(true);
        }
    });
};
exports.update_saveindex = function (roomId, numOfSaveGames, callback) {
    callback = callback == null ? nop : callback;
    var sql = 'UPDATE t_rooms SET numOfSaveGames = {0} WHERE id = "{1}"'
    sql = sql.format(numOfSaveGames, roomId);
    query(sql, function (err, row, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(true);
        }
    });
};

exports.update_next_button = function (roomId, nextButton, callback) {
    callback = callback == null ? nop : callback;
    var sql = 'UPDATE t_rooms SET next_button = {0} WHERE id = "{1}"'
    sql = sql.format(nextButton, roomId);
    query(sql, function (err, row, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(true);
        }
    });
};

exports.get_room_addr = function (roomId, callback) {
    callback = callback == null ? nop : callback;
    if (roomId == null) {
        callback(false, null, null);
        return;
    }

    var sql = 'SELECT ip,port FROM t_rooms WHERE id = "' + roomId + '"';
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false, null, null);
            console.log(err);
        }
        if (rows.length > 0) {
            callback(true, rows[0].ip, rows[0].port);
        }
        else {
            callback(false, null, null);
        }
    });
};

exports.get_room_data = function (roomId, callback) {
    callback = callback == null ? nop : callback;
    if (roomId == null) {
        callback(null);
        return;
    }

    var sql = 'SELECT * FROM t_rooms WHERE id = "' + roomId + '"';
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(null);
            console.log(err);
        }
        if (rows.length > 0) {
            for (var i = 0; i < 10; i++) {
                rows[0]['user_name' + i] = crypto.fromBase64(rows[0]['user_name' + i]);
            }
            // rows[0].user_name0 = crypto.fromBase64(rows[0].user_name0);
            // rows[0].user_name1 = crypto.fromBase64(rows[0].user_name1);
            // rows[0].user_name2 = crypto.fromBase64(rows[0].user_name2);
            // rows[0].user_name3 = crypto.fromBase64(rows[0].user_name3);

            callback(rows[0]);
        }
        else {
            callback(null);
        }
    });
};

exports.delete_room = function (roomId, callback) {
    callback = callback == null ? nop : callback;
    if (roomId == null) {
        callback(false);
    }
    var sql = "DELETE FROM t_rooms WHERE id = '{0}'";
    sql = sql.format(roomId);
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(true);
        }
    });
};

exports.create_game = function (room_uuid, index, type, base_info, callback) {
    callback = callback == null ? nop : callback;
    var sql = "INSERT INTO t_games(room_uuid,game_index,type,base_info,create_time) VALUES('{0}',{1},'{2}','{3}',unix_timestamp(now())) ON DUPLICATE KEY UPDATE game_index={1}";
    sql = sql.format(room_uuid, index, type, base_info);
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(null);
            console.log(err);
        }
        else {
            callback(rows.insertId);
        }
    });
};

exports.delete_games = function (room_uuid, callback) {
    callback = callback == null ? nop : callback;
    if (room_uuid == null) {
        callback(false);
    }
    var sql = "DELETE FROM t_games WHERE room_uuid = '{0}'";
    sql = sql.format(room_uuid);

    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(true);
        }
    });
}

exports.archive_games = function (room_uuid, callback) {
    callback = callback == null ? nop : callback;
    if (room_uuid == null) {
        callback(false);
    }
    var sql = "INSERT INTO t_games_archive(SELECT * FROM t_games WHERE room_uuid = '{0}') ON DUPLICATE KEY UPDATE room_uuid = '{0}'";
    sql = sql.format(room_uuid);

    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            exports.delete_games(room_uuid, function (ret) {
                callback(ret);
            });
        }
    });
}

//清理过期的游戏历史记录 默认保留15天
exports.clear_games_archive = function (days) {
    days = parseInt(days);
    days = days ? days : 15;
    var sql = `DELETE FROM t_games_archive WHERE create_time < (UNIX_TIMESTAMP(NOW()) - (86400*${days}));`;
    query(sql, function (err, rows, fields) {
        if (err) {
            console.log(err);
        }
    });
}

exports.update_game_action_records = function (room_uuid, index, actions, callback) {
    callback = callback == null ? nop : callback;
    var sql = "UPDATE t_games SET action_records = '" + actions + "' WHERE room_uuid = '" + room_uuid + "' AND game_index = " + index;

    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(true);
        }
    });
};

exports.update_room_conf = function (roomId, conf, callback) {
    callback = callback == null ? nop : callback;
    var sql = "UPDATE t_rooms SET base_info = '{0}' WHERE id = '{1}'";
    var baseInfo = JSON.stringify(conf);

    sql = sql.format(baseInfo, roomId);

    query(sql, function (err, row, fields) {
        if (err) {
            callback(null);
            console.log(err);
        }
        else {
            callback(roomId);
        }
    });
};

exports.update_game_result = function (room_uuid, index, result, callback) {
    callback = callback == null ? nop : callback;
    if (room_uuid == null || result) {
        callback(false);
    }

    result = JSON.stringify(result);
    var sql = "UPDATE t_games SET result = '" + result + "' WHERE room_uuid = '" + room_uuid + "' AND game_index = " + index;
    // 
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(true);
        }
    });
};

exports.get_message = function (type, version, callback) {
    callback = callback == null ? nop : callback;

    var sql = 'SELECT * FROM t_message WHERE type = "' + type + '"';

    if (version == "null") {
        version = null;
    }

    if (version) {
        version = '"' + version + '"';
        sql += ' AND version != ' + version;
    }

    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            if (rows.length > 0) {
                callback(rows[0]);
            }
            else {
                callback(null);
            }
        }
    });
};

exports.update_message = function (type, msg, version, callback) {
    callback = callback == null ? nop : callback;

    var sql = 'UPDATE `t_message` SET `msg`="' + msg + '" WHERE `type` = "' + type + '"';

    if (version == "null") {
        version = null;
    }

    if (version) {
        version = '"' + version + '"';
        sql += ' AND version != ' + version;
    }

    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            if (rows.length > 0) {
                callback(rows[0]);
            }
            else {
                callback(null);
            }
        }
    });
};
//添加兑换记录
exports.init_order_duiba = function (orderid, userid, orderNum, callback) {
    callback = callback == null ? nop : callback;

    var sql = "INSERT INTO t_orderlist_duiba (`orderid`,`appuserid`,`orderNum`,`createtime`) VALUES('{0}', '{1}', '{2}', NOW());";
    sql = sql.format(orderid, userid, orderNum);

    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            if (rows.length > 0) {
                callback(rows[0]);
            }
            else {
                callback(null);
            }
        }
    });
};
//更新兑换订单信息
exports.update_order_duiba = function (orderNum, result, callback) {
    callback = callback == null ? nop : callback;
    var sql = "UPDATE t_orderlist_duiba SET result='{0}', transtime=NOW() WHERE orderNum='{1}';";
    sql = sql.format(result, orderNum);
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            if (rows.length > 0) {
                callback(rows[0]);
            }
            else {
                callback(null);
            }
        }
    });
};

//存储充值订单信息
exports.init_order = function (orderid, userid, money, callback) {
    callback = callback == null ? nop : callback;

    var sql = "INSERT INTO t_orderlist (`orderid`,`appuserid`,`money`,`createtime`) VALUES('{0}', '{1}', '{2}', NOW());";
    sql = sql.format(orderid, userid, money);

    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            if (rows.length > 0) {
                callback(rows[0]);
            }
            else {
                callback(null);
            }
        }
    });
};

//获取充值订单信息
exports.get_order = function (orderid, callback) {
    callback = callback == null ? nop : callback;

    var sql = "SELECT * FROM t_orderlist WHERE orderid='{0}' and isok='0';";
    sql = sql.format(orderid);
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            if (rows.length > 0) {
                callback(rows[0]);
            }
            else {
                callback(null);
            }
        }
    });
};

//获取充值订单信息
exports.update_order = function (orderid, sysorderid, result, callback) {
    callback = callback == null ? nop : callback;
    var sql = "UPDATE t_orderlist SET sysorderid='{0}', result='{1}', isok='1', transtime=NOW() WHERE orderid='{2}';";
    sql = sql.format(sysorderid, result, orderid);
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            if (rows.length > 0) {
                callback(rows[0]);
            }
            else {
                callback(null);
            }
        }
    });
};
/////////////////////////////Poker 纸牌////////////////////////////////////
//输入审核码
exports.enter_pass = function (uid, pass, callback) {
    callback = callback == null ? nop : callback;
    var sql = "select isPass from t_users  WHERE userid='{0}';";
    sql = sql.format(uid);
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(3);
            console.log(err);
        }
        else {
            if (rows.length > 0) {
                //说明已经输入过审核码
                callback(1);
            }
            else {
                //检查审核码是不是对的
                var sql = "select passcord from t_passcord  WHERE passcord='{0}';";
                sql = sql.format(pass);
                query(sql, function (err2, rows2, fields2) {
                    if (err2) {
                        callback(3);
                        console.log(err2);
                    }
                    else {
                        if (rows2.length > 0) {
                            //审核码是对的,修改审核状态
                            var sql = "UPDATE t_users set isPass=1  WHERE userid='{0}';";
                            sql = sql.format(uid);
                            if (err) {
                                callback(3);
                                console.log(err);
                            }
                            else {
                                callback(4);
                            }
                        }
                        else {
                            callback(2);
                        }
                    }
                })
            }
        }
    });
};


//启动时候，先对poker room data 进行插入。
exports.insert_poker_room = function (room_id, room_type, room_level, table_id, callback) {
    callback = callback == null ? nop : callback;
    if (room_id == null || room_level == null || room_type == null || table_id == null) {
        return callback(false);
    }
    var sql = "INSERT INTO t_pokers(room_id,room_type,room_level,table_id) VALUES({0},{1},{2},{3}) ";
    sql = sql.format(room_id, room_type, room_level, table_id);
    query(sql, function (err, rows, fileds) {
        if (err) {
            return callback(false);
        }
        return callback(true);

    });

};
//插入t_tables 基础数据 ，游戏启动时
exports.insert_poker_table_info = function (table_id, game_level, game_type, next_button, callback) {
    callback = callback == null ? nop : callback;
    if (table_id == null || game_level == null || game_type == null) {
        callback(false);
        return;
    }
    if (next_button == null)
        next_button = 0;

    var sql = 'INSERT INTO t_tables(table_id,game_level,game_type,next_button) VALUES({0},{1},{2},{3})';
    sql = sql.format(table_id, game_level, game_type, next_button);

    query(sql, function (err, rows, fields) {
        if (err) {
            console.log(err);
        }
        callback(true);
    });
};

//更新t_tables 座位上 玩家数据
exports.update_poker_table_user_info = function (table_id, index, user_id, user_name, user_score, user_niuiniu, callback) {
    callback = callback == null ? nop : callback;
    if (table_id == null || Number(table_id) <= 0 || index == null || user_id == null) {
        return callBack(null);
    }

    var sql = 'UPDATE t_users SET user_id{0}="{1}" user_name{0} = "{2}" user_score{0} = "{3}" user_niuniu{0} = "{4}" WHERE table_id = "{5}" ';
    sql = sql.format(index, user_id, user_name, user_score, user_niuiniu, table_id);

    query(sql, function (err, rows, fields) {
        if (err) {
            console.log(err);
        }
        callback(rows);
    });
};
//更新 t-tables 庄家索引
exports.update_poker_table_button_index = function (table_id, next_button, callback) {
    callback = callback == null ? nop : callback;
    if (table_id == null || Number(table_id) <= 0 || next_button == null) {
        return callBack(null);
    }
    var sql = 'UPDATE t_tables SET next_button= "{1}" WHERE table_id = "{0}"';
    sql = sql.format(table_id, next_button);

    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        callback(true);
    });
};

//从SQL数据库中查找 roomID
exports.get_poker_roomId = function (callBack) {
    callback = callback == null ? nop : callback;
    if (userid == null) {
        callback(null);
        return;
    }

    var sql = 'SELECT room_id FROM t_pokers "';
    // 
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(null);
            console.log(err);
        }
        if (rows.length == 0) {
            callback(null);
            return;
        }

        callback(rows);
    });
};
//从SQL数据库中查找Room信息。
exports.get_poker_room_info = function (callback) {
    callback = callback == null ? nop : callback;
    if (userid == null) {
        callback(null);
        return;
    }

    var sql = 'SELECT * FROM t_pokers "';
    // 
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(null);
            console.log(err);
        }
        if (rows.length == 0) {
            callback(null);
            return;
        }

        callback(rows);
    });
};
//存储玩家战绩记录
exports.insert_poker_user_record = function (userid, name, gameType, gameLevel, tableId, baseInfo, winOrLose, coins, callback) {
    callback = callback == null ? nop : callback;
    if (userid == null || name == null || tableId == null) {
        callback(false);
        return;
    }
    name = crypto.toBase64(name);
    var sql = 'INSERT INTO t_records(id,userid,name,time,game_type,game_level,table_id,baseInfo,win,coins) VALUES(NOW(),{0},{1},NOW(),{2},{3},{4},{5},{6},{7})';
    sql = sql.format(userid, name, gameType, gameLevel, tableId, winOrLose, coins);

    query(sql, function (err, rows, fields) {
        if (err) {
            console.log(err);
        }
        callback(true);
    });
};
//获取玩家战绩记录
exports.get_poker_user_record = function (userid, callback) {
    callback = callback == null ? nop : callback;
    if (userid == null) {
        callback(null);
        return;
    }

    var sql = 'SELECT time,game_type,game_level,table_id,baseInfo,win,coins FROM t_records WHERE userid = "' + userid + '"';
    // 
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(null);
            console.log(err);
        }

        if (rows.length == 0) {
            callback(null);
            return;
        }

        callback(rows);
    });
};
//增加金币.
exports.add_coins = function (userid, cost, callback) {
    if (cost <= 0) {
        callback(false);
        return;
    }
    callback = callback == null ? nop : callback;
    var sql = 'UPDATE t_users SET coins = coins +' + cost + ' WHERE userid = ' + userid;

    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(rows.length > 0);
        }
    });
};


//消耗金币.
exports.cost_coins = function (userid, cost, callback) {
    callback = callback == null ? nop : callback;
    var sql = 'UPDATE t_users SET coins = coins -(' + cost + ') WHERE userid = ' + userid;

    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(rows.length > 0);
        }
    });
};

//设置金币.
exports.set_coins = function (userid, num, callback) {
    if (num < 0) {
        callback(false);
        return;
    }
    callback = callback == null ? nop : callback;
    var sql = 'UPDATE t_users SET coins = ' + num + ' WHERE userid = ' + userid;

    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(rows.length > 0);
        }
    });
};
//获取玩家金币
exports.get_user_coin = function (userId, callBack) {
    if (!userId || Number(userId) <= 0) {
        return callBack(null);
    }
    var sql = 'SELECT coins FROM t_users WHERE userid = "' + userId + '"';
    query(sql, function (err, rows, fields) {
        if (err) {
            callBack(null);
            console.log(err);
        } else {
            if (rows.length > 0) {
                callBack(rows[0]);
            } else {
                callBack(null);
            }
        }
    });

};
//更新玩家金币
exports.update_user_coin = function (userId, coins, callBack) {
    if (!userId || Number(userId) <= 0 || Number(coins) < 0) {
        return callBack(null);
    }
    var sql = 'UPDATE t_users SET coins="{0}"';
    sql = sql.format(coins);

    query(sql, function (err, rows, fields) {
        if (err) {
            console.log(err);
        }
        callBack(rows);
    });

};

//纸牌 获取某游戏类型，某场收取的税率.
exports.get_poker_rate = function (game_type, game_level, callback) {
    if (game_level == null || typeof (game_level) == 'undefind' || game_type == null || typeof (game_type) == 'undefind') {
        return callback(null);
    }

    var sql = 'SELECT shuilv FROM t_pokers WHERE room_type =' + game_type + 'AND room_level =' + game_level;
    query(sql, function (err, rows, fileds) {
        if (err) {
            callback(null);
            console.log(err);
        } else {
            if (rows.length > 0) {
                callback(rows[0]);
            } else {
                callback(null);
            }
        }
    });
};

//纸牌 获取某游戏类型，某场的限制。.
exports.get_poker_limit = function (game_type, game_level, callback) {
    if (game_level == null || typeof (game_level) == 'undefind' || game_type == null || typeof (game_type) == 'undefind') {
        return callback(null);
    }

    var sql = 'SELECT coinlimit FROM t_pokers WHERE room_type =' + game_type + 'AND room_level =' + game_level;
    query(sql, function (err, rows, fileds) {
        if (err) {
            callback(null);
            console.log(err);
        } else {
            if (rows.length > 0) {
                callback(rows[0]);
            } else {
                callback(null);
            }
        }
    });
};



exports.get_user_promotion = function (userid, callback) {
    callback = callback == null ? nop : callback;
    if (userid == null) {
        callback(null);
        return;
    }
    var sql = 'SELECT userid,name FROM t_users WHERE promotionId = "' + userid + '"';
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(null);
            console.log(err);
        }
        callback(rows);
    });
}

exports.update_user_promotionstate = function (userid, state, callback) {
    callback = callback == null ? nop : callback;
    if (userid == null) {
        callback(false);
        return;
    }
    var sql = "UPDATE t_users SET promotionRewardState={0} WHERE userid='{1}';";
    sql = sql.format(state, userid);
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            if (rows.length > 0) {
                callback(rows[0]);
            }
            else {
                callback(null);
            }
        }
    });
}

exports.update_user_bindtimestamp = function (userId, timestamp, callback) {
    callback = callback == null ? nop : callback;

    var sql = "UPDATE t_users SET bindtimestamp = '{0}' WHERE userid = '{1}'";
    sql = sql.format(timestamp, userId);

    query(sql, function (err, rows, fields) {

        if (err) {
            callback(false);
            console.log(err);
        }
        if (rows.length == 0) {
            callback(false);
            return;
        }
        callback(true);
    });
}


exports.get_user_rewardtimestamp = function (account, callback) {
    callback = callback == null ? nop : callback;
    if (account == null) {
        callback(null);
        return;
    }
    var sql = 'SELECT rewardtimestamp FROM t_users WHERE account = "' + account + '"';
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(null);
            console.log(err);
        }

        if (rows.length == 0) {
            callback(null);
            return;
        }
        callback(rows[0]);
    });
}

exports.update_user_rewardtimestamp = function (userId, timestamp, callback) {
    callback = callback == null ? nop : callback;

    var sql = "UPDATE t_users SET rewardtimestamp = '{0}' WHERE userid = '{1}'";
    sql = sql.format(timestamp, userId);

    query(sql, function (err, rows, fields) {

        if (err) {
            callback(false);
            console.log(err);
        }
        if (rows.length == 0) {
            callback(false);
            return;
        }
        callback(true);
    });
}

exports.get_match_template = function (callback) {
    callback = callback == null ? nop : callback;

    var sql = "select * from t_match_template;";

    query(sql, function (err, rows, fields) {

        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(rows);
        }
    });
}


exports.get_match = function (callback) {
    callback = callback == null ? nop : callback;

    var sql = "select * from t_matchs where `end_time`='0000-00-00 00:00:00';";
    query(sql, function (err, rows, fields) {

        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(rows);
        }
    });
}

exports.get_match_by_uuid = function (uuid, callback) {
    callback = callback == null ? nop : callback;

    var sql = "select * from t_matchs where `uuid`='{0}';";
    sql = sql.format(uuid);
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            if (rows.length == 1) {
                callback(rows[0]);
            }
            else {
                callback(false);
            }
        }
    });
}


exports.match_add_match = function (info, callback) {
    callback = callback == null ? nop : callback;

    var sql = "INSERT INTO `t_matchs` (`uuid`, `info`, `create_time`, `begin_time`, `end_time`) VALUES ('{0}', '{1}', NOW(), '0000-00-00 00:00:00', '0000-00-00 00:00:00');";
    sql = sql.format(info.uuid, JSON.stringify(info));

    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(true);
        }
    });
}

exports.match_update_info = function (info, callback) {
    callback = callback == null ? nop : callback;

    var sql = "UPDATE `t_matchs` SET `info`='{1}' WHERE `uuid`='{0}';";
    sql = sql.format(info.uuid, JSON.stringify(info));

    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(true);
        }
    });
}

exports.match_update_begin_time = function (uuid, callback) {
    callback = callback == null ? nop : callback;

    var sql = "UPDATE `t_matchs` SET `begin_time`=NOW() WHERE `uuid`='{0}' and `begin_time`='0000-00-00 00:00:00';";
    sql = sql.format(uuid);

    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(true);
        }
    });
}

exports.match_update_end_time = function (uuid, callback) {
    callback = callback == null ? nop : callback;

    var sql = "UPDATE `t_matchs` SET `end_time`=NOW() WHERE `uuid`='{0}' and `end_time`='0000-00-00 00:00:00';";
    sql = sql.format(uuid);

    query(sql, function (err, rows, fields) {

        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(true);
        }
    });
}

exports.match_update_room_config = function (uuid, config, callback) {
    callback = callback == null ? nop : callback;

    var sql = "UPDATE `t_rooms` SET `base_info`='{1}' WHERE `id`='{0}';";
    sql = sql.format(uuid, JSON.stringify(config));

    query(sql, function (err, rows, fields) {

        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(true);
        }
    });
}


//金币场游戏模板信息
exports.get_gold_game_template = function (gametype, callback) {
    callback = callback == null ? nop : callback;

    var sql = "select * from t_gold_template where gametype='{0}';";
    sql = sql.format(gametype);

    query(sql, function (err, rows, fields) {

        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(rows);
        }
    });
}


//金币场游戏信息
exports.get_gold_game_info = function (gametype, callback) {
    callback = callback == null ? nop : callback;

    var sql = "select * from t_rooms where type='{0}';";
    sql = sql.format(gametype);

    query(sql, function (err, rows, fields) {

        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(rows);
        }
    });
}

//清除玩家身上的金币场roomid
exports.clean_gold_game_roomid = function (roomidList, callback) {
    callback = callback == null ? nop : callback;

    if (typeof (roomidList) != typeof ([]) || roomidList.length <= 0) {
        callback(false);
        return;
    }

    var sql = "UPDATE `t_users` SET `roomid`=null WHERE ";

    for (var i = 0; i < roomidList.length; i++) {
        var element = roomidList[i];
        if (i == roomidList.length - 1) {
            sql += " `roomid`=" + roomidList[i] + ";";
        }
        else {
            sql += " `roomid`=" + roomidList[i] + " or ";
        }
    }

    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(rows);
        }
    });
}

//清理玩家身上的金币场状态
exports.clean_gold_game_state = function (roomidList, callback) {
    callback = callback == null ? nop : callback;

    if (typeof (roomidList) != typeof ([]) || roomidList.length <= 0) {
        callback(false);
        return;
    }

    var sql = "UPDATE `t_users` SET `goldstate`=null WHERE ";

    for (var i = 0; i < roomidList.length; i++) {
        var element = roomidList[i];
        if (i == roomidList.length - 1) {
            sql += " `goldstate`=" + roomidList[i] + ";";
        }
        else {
            sql += " `goldstate`=" + roomidList[i] + " or ";
        }
    }

    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(rows);
        }
    });
}

//清除金币场游戏信息
exports.clean_gold_game_room = function (gametype, callback) {
    callback = callback == null ? nop : callback;

    var sql = "DELETE FROM `t_rooms` WHERE  `type`='{0}';";
    sql = sql.format(gametype);

    query(sql, function (err, rows, fields) {

        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(rows);
        }
    });
}

//更新用户金币场状态
exports.update_user_gold_game_state = function (userid, goldroom, callback) {
    callback = callback == null ? nop : callback;

    var sql = "UPDATE `t_users` SET `goldstate`='{0}' WHERE userid = '{1}'";
    sql = sql.format(goldroom, userid);
    if (goldroom == null) {
        sql = "UPDATE `t_users` SET `goldstate`=null WHERE userid = '{0}'";
        sql = sql.format(userid);
    }

    query(sql, function (err, rows, fields) {

        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(rows);
        }
    });
}

exports.get_recharge_active = function (recharge_index, callBack) {
    if (Number(recharge_index) <= 0) {
        return callBack(null);
    }
    var sql = 'SELECT * FROM t_recharge_active WHERE recharge_index = ' + recharge_index;
    query(sql, function (err, rows, fields) {
        if (err) {
            callBack(null);
            console.log(err);
        } else {
            if (rows.length > 0) {
                callBack(rows[0]);
            } else {
                callBack(null);
            }
        }
    });
}

exports.update_user_recharge = function (account, recharge, callback) {
    callback = callback == null ? nop : callback;
    if (account == null) {
        callback(false);
        return;
    }

    var sql = 'UPDATE t_users SET recharge = \'' + recharge + '\' WHERE account = \'' + account + '\'';
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            return;
        }
        else {
            callback(rows.affectedRows > 0);
            return;
        }
    });
}

exports.update_user_sign_check = function (account, sign_check, callback) {
    callback = callback == null ? nop : callback;
    if (account == null) {
        callback(false);
        return;
    }

    var sql = 'UPDATE t_users SET sign_check = \'' + sign_check + '\' WHERE account = \'' + account + '\'';
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            return;
        }
        else {
            callback(rows.affectedRows > 0);
            return;
        }
    });
}

exports.get_task_data = function (tasktype, callBack) {
    if (tasktype == null) {
        return callBack(null);
    }
    var sql = 'select * from t_task where type = \'' + tasktype + '\'';
    query(sql, function (err, rows, fields) {
        if (err) {
            callBack(null);
            console.log(err);
        } else {
            if (rows.length > 0) {
                callBack(rows[0]);
            } else {
                callBack(null);
            }
        }
    });
}



//以下为俱乐部相关数据库操作
//增加记录
exports.insert_operation = function (data, cbf) {
    var userid = data.userid;
    var clubid = data.clubid;
    var level = data.level;
    var name = data.name;
    var notice = data.notice;
    var dealerid = data.dealerid;
    var default_table_info = data.default_table_info;
    var sql = 'INSERT INTO t_club(clubid,userid,level,name,notice,dealerid,default_table_info,create_time) VALUES("' + clubid + '","' + userid + '","' + level + '","' + name + '","' + notice + '","' + dealerid + '",\'' + default_table_info + '\',NOW())';


    query(sql, function (err, rows, fields) {
        if (err) {
            console.log(err);
        }
        cbf(err);
    })
}
exports.get_club_base_info = function (cb) {
    var sql = " select * from t_club";
    query(sql, function (err, rows, fields) {
        if (err) {
            cb(false);
            console.log(err);
        }
        else {
            console.log("antestrows", rows);
            cb(rows);
        }
    });
}

//简单查找
exports.select_operation_simple = function (sql, cbf) {
    query(sql, function (err, rows, fields) {
        if (err) {
            console.log("antest" + err);
            cbf(null);
        }
        cbf(rows);
    })
}
//查找字段集合
exports.select_operation = function (fieldname, table, condition, value, cbf) {
    var sql = "select {0} from {1} where {2} = {3}"
    sql = sql.format(fieldname, table, condition, value);
    query(sql, function (err, rows, fields) {
        if (err) {
            console.log("antest" + err);
            cbf(false);
            return;
        }
        console.log("执行SELECT 成功", sql);
        cbf(true, rows[0]);
    })
}
//查找字段集合
exports.select_operation_plus = function (fieldname, table, condition, value, cbf, otherCondition) {
    var sql = "select {0} from {1} where {2} = {3} {4}"
    sql = sql.format(fieldname, table, condition, value, otherCondition);
    query(sql, function (err, rows, fields) {
        if (err) {
            console.log("antest" + err);
        }
        cbf(err, rows);
    })
}
//更新字段内容
exports.update_operation = function (table, fieldname, fvalue, condition, cvalue, cbf) {
    var sql = "update {0} set {1} = {2} where {3} = {4}";
    sql = sql.format(table, fieldname, fvalue, condition, cvalue);
    query(sql, function (err) {
        if (err) {
            console.log("update_operation" + err);
        }
        cbf(err);
    })
}
//更新字段内容
exports.update_club_tablenum = function (clubid, cb) {
    var sql = "update t_club set table_num = table_num +1 where clubid = {0} and table_num < table_max";
    sql = sql.format(clubid);
    query(sql, function (err) {
        cb(err)
    })
}


exports.get_club_member = function (clubid, callback) {
    var sql = "select member from t_club where clubid = {0}"
    sql = sql.format(clubid);
    query(sql, function (err, rows) {
        if (err) {
            callback(null);
            console.log(err);
        }
        if (rows.length == 0) {
            callback(null);
            return;
        }
        var member = rows[0].member;
        if (member == null || member == "") {
            callback(null);
        }
        else {
            member = JSON.parse(member);
            callback(member);
        }
    })
}
exports.update_club_member = function (clubid, data) {
    var sql = "update t_club set member = {0} where clubid = {1} ";
    sql = sql.format(data, clubid);
    query(sql, function (err) { });
}

exports.get_club_info_byID = function (clubid, callback) {
    var sql = "select * from t_club where clubid = {0}"
    sql = sql.format(clubid);
    query(sql, function (err, ret, fields) {
        if (err) {
            callback(null);
            console.log(err)
            return;
        }
        callback(ret[0]);
    })
}

//通过多个俱乐部ID 获取俱乐部信息
exports.get_club_info_list_byID = function (clubidList, callback) {
    if (!Array.isArray(clubidList) || clubidList.length == 0) {
        callback(null);
        return;
    }

    var str = clubidList.toString();
    if (str[0] == ',') {
        str = str.slice(1, str.length);
    }
    if (str[str.length - 1] == ',') {
        str = str.slice(0, str.length - 1);
    }

    var sql = "select * from t_club where clubid in ({0});";
    sql = sql.format(str);
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(null);
            console.log(err);
        }
        else {
            callback(rows);
        }
    });
}

exports.insert_club_game_record = function (clubid, roomid, userid, gems, dealer_gems, username, score, dealerid, gametype, callback) {
    callback = callback ? callback : nop;

    var sql = "INSERT INTO `t_club_game_records` (`dealerid`, `clubid`, `roomid`, `userid`, `gems`, `dealer_gems`, `score`, `username`, `enddate`, `gametype`) VALUES ('{0}', '{1}', '{2}', '{3}', '{4}', '{5}', '{6}', '{7}', NOW(), '{8}');";
    sql = sql.format(dealerid, clubid, roomid, userid, gems, dealer_gems, score, username, gametype);
    query(sql, function (err, rows, fields) {
        if (err) {
            if (err.code == 'ER_DUP_ENTRY') {
                callback(false);
                return;
            }
            callback(false);
            console.log(err);
        }
        else {
            callback(true);
        }
    });
}

exports.get_club_request = function (clubid, callback) {
    var sql = "select request from t_club where clubid = {0}"
    sql = sql.format(clubid);
    query(sql, function (err, ret) {
        if (err) {
            callback(null);
            console.log(err);
        }
        if (rows.length == 0) {
            callback(null);
            return;
        }
        var member = rows[0].member;
        if (member == null || member == "") {
            callback(null);
        }
        else {
            member = JSON.parse(member);
            callback(member);
        }
    })
}
exports.update_club_request = function (data, clubid) {
    var sql = "update t_club set request = {0} where clubid = {1} ";
    sql = sql.format(data, clubid);
    query(sql, function (err) { });
}

exports.get_club_tableinfo = function (clubid, cb) {
    var sql = "select * from t_rooms where clubid = {0}"
    sql = sql.format(clubid);
    query(sql, function (err, row, fields) {
        cb(row)
    })
}

exports.set_club_default_tableinfo = function (clubid, data, cb) {
    cb = typeof (cb) == typeof (function () { }) ? cb : nop;
    var sql = 'update t_club set default_table_info = {0} where clubid = {1} ';
    sql = sql.format(data, clubid);
    query(sql, function (err) {
        if (err) {
            cb(false)
        } else {
            cb(true)
        }
    });
}
exports.get_club_gamerecords = function (clubid, cb) {
    var sql = "select * from  t_club_game_records  where clubid = {0}"
    sql = sql.format(clubid)
    query(sql, function (err, rows, fields) {
        if (err) {
            cb(false, null)
        } else {
            cb(true, rows)
        }
    })
}

exports.create_club_room = function (roomId, conf, ip, port, create_time, type, dealer, clubid, callback) {
    callback = callback == null ? nop : callback;
    dealer = dealer ? dealer : "NULL";
    clubid = clubid ? clubid : "NULL";
    var sql = "INSERT INTO t_rooms(uuid,id,base_info,ip,port,create_time,type,dealer,clubid) \
                VALUES('{0}','{1}','{2}','{3}',{4},{5},{6},{7},{8}) ON DUPLICATE KEY UPDATE uuid = '{9}'";
    var uuid = Date.now() + roomId;
    var baseInfo = JSON.stringify(conf);
    sql = sql.format(uuid, roomId, baseInfo, ip, port, create_time, type, dealer, clubid, uuid);
    console.log('db.create_club_room')
    console.log(sql)
    query(sql, function (err, row, fields) {
        if (err) {
            callback(null);
            console.log(err);
        }
        else {
            callback(uuid);
        }
    });
};

exports.set_club_name = function (clubid, clubname, cb) {
    var sql = 'update t_club set name = {0} where clubid = {1}';
    sql = sql.format(clubname, clubid);
    query(sql, function (err) {
        if (err) {
            cb(false)
        } else {
            cb(true)
        }
    })
}
exports.set_club_notice = function (clubid, notice, cb) {
    var sql = 'update t_club set notice = {0} where clubid = {1}';
    sql = sql.format(notice, clubid);
    query(sql, function (err) {
        if (err) {
            cb(false)
        } else {
            cb(true)
        }
    })
}
//删除俱乐部
exports.delete_club = function (clubid,cb){
    var sql = 'DELETE FROM t_club WHERE clubid = {0}'
    sql = sql.format(clubid);
    query(sql,function(err){
        if(err){
            cb(false);
            console.log("删除俱乐部 失败");
        }else{
            cb(true)
        }
    })
}
//设置用户最近一次登录俱乐部ID 
exports.set_user_last_clubid =function (userid,clubid,cb){
    var sql = 'update t_users set last_clubid ={0} where userid = {1}';
    sql = sql.format(clubid,userid)
    query(sql,function(err){
        if(err){
            cb(false)
        } else {
            cb(true)
        }
    })
}
exports.set_user_join_clubid = function(userid,join_clubid,cb){
    var sql = 'update t_users set join_clubid = {0} where userid = {1}';
    sql =sql.format(join_clubid,userid);
    query(sql, function(err){
        if (err) {
            cb(false)
        } else {
            cb(true)
        }
    })
}

exports.set_user_create_clubid = function(userid,create_clubid,cb){
    var sql = 'update t_users set create_clubid = {0} where userid = {1}';
    sql =sql.format(create_clubid,userid);
    query(sql, function(err){
        if (err) {
            cb(false)
        } else {
            cb(true)
        }
    })
}
//获取俱乐部所有成员
exports.get_clubmember_byclubid = function (clubid, cb) {
    var sql = 'select * from t_users where create_clubid like "%{0}%" or join_clubid like "%{1}%"  Order by last_login desc'
    sql = sql.format(clubid, clubid);
    query(sql, function (err, rows, fields) {
        cb(rows);
    })
}

//游戏统计相关操作 增加记录

exports.insert_resultcount_record = function(userid,dealerid,clubid,roomid,gametype,counttype,number){
    var sql ="insert into t_gameresult_count (userid,dealerid,clubid,roomid,gametype,result_type,number,times) values ({0},{1},{2},{3},{4},{5},{6},NOW())"
    sql =sql.format(userid,dealerid,clubid,roomid,gametype,counttype,number)
    query(sql,function(err){
        if(err){
            console.log("游戏统计相关操作 增加记录 出错")
        }
    })
}

//获取牌库信息
exports.get_card_library = function (gametype, cb) {
    cb = cb ? cb : nop;
    var sql = `select * from t_card_library where gametype = ${gametype}`;
    query(sql, function (err, rows, fields) {
        cb(rows);
    })
}

//获取牌库信息
exports.get_all_card_library = function (cb) {
    cb = cb ? cb : nop;
    var sql = "select * from t_card_library;";
    query(sql, function (err, rows, fields) {
        cb(rows);
    })
}
//添加一个牌库牌行
exports.insert_card_library = function (gametype,level,config,content,notes,cb) {
    cb = cb ? cb : nop;
    var sql = "INSERT INTO `t_card_library` (`gametype`, `level`, `config`, `content`, `notes`) VALUES ('{0}', '{1}', '{2}', '{3}', '{4}');";
    sql = sql.format(gametype, level, config, content, notes);

    query(sql, function (err, rows, fields) {
        if (err) {
            if (err.code == 'ER_DUP_ENTRY') {
                cb(false);
                return;
            }
            cb(false);
            console.log(err);
        }
        else {
            cb(true);
        }
    });
}

//删除一条牌行
exports.del_card_library = function (id, callback) {
    callback = callback == null ? nop : callback;

    var sql = "DELETE FROM `t_card_library` WHERE  `id`='{0}';";
    sql = sql.format(id);

    query(sql, function (err, rows, fields) {

        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            callback(true);
        }
    });
}



exports.query = query;