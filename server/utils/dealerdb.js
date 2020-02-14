var mysql = require("mysql");

var pool = null;

function nop() { }

function query(sql, callback) {
    callback = callback == null ? nop : callback;
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

/**============================================================================================================================ */

// /**新增代理 */
// exports.create_dealer = function (account, password, name, parent, privi) {
//     if (account == null || password == null) {
//         return false;
//     }

//     var sql = 'INSERT INTO t_dealers(account,password,name,parent,create_time,privilege_level) VALUES("{0}",PASSWORD("{1}"),"{2}","{3}",{4},{5})';
//     sql = sql.format(account, password, name, parent, Date.now(), privi);
//     console.log(sql);
//     var ret = query(sql);
//     if (ret.err) {
//         if (ret.err.code == 'ER_DUP_ENTRY') {
//             return false;
//         }
//         else {
//             console.log(ret.err);
//             return false;
//         }
//     }
//     else {
//         this.update_cumulative(parent, 2, 1);
//         return true;
//     }
// };

// /**查询下级代理 */
// exports.search_sub_dealers = function (parent, start, rows) {
//     if (parent == null || parent == "") {
//         return null;
//     }

//     var sql = 'SELECT account,name,gems,score,all_gems,all_score,all_subs FROM t_dealers where parent="{0}" limit {1},{2}';
//     sql = sql.format(parent, start, rows);
//     console.log(sql);
//     var ret = query(sql);
//     if (ret.err) {
//         console.log(ret.err);
//         return null;
//     }
//     else {
//         return ret.rows;
//     }
// };


// /**查询直属下级代理详细信息 */
// exports.get_sub_dealer_by_account = function (account, parent) {
//     if (account == null || parent == null) {
//         return null;
//     }

//     var sql = 'SELECT account,name,gems,score,all_gems,all_score,all_subs FROM t_dealers WHERE account = "{0}" and parent ="{1}"';
//     sql = sql.format(account, parent);
//     var ret = query(sql);
//     console.log(sql);
//     if (ret.err) {
//         console.log(ret.err);
//         return null;
//     }
//     else {
//         if (ret.rows.length == 0) {
//             return null;
//         }
//         return ret.rows[0];
//     }
// };

// /**查询当年的房卡,代理新增,积分入账记录*/
// exports.get_dealer_kpi = function (account, year) {
//     if (account == null || account == "" || !year) {
//         return null;
//     }

//     var sql = 'SELECT * FROM t_dealers_kpi WHERE account = "{0}" and year = {1} ';
//     sql = sql.format(account, year);
//     console.log(sql);
//     var ret = query(sql);
//     if (ret.err) {
//         console.log(ret.err);
//         return null;
//     }
//     else {
//         return ret.rows;
//     }
// };

// /**增加/更新 KPI 数据 */
// exports.update_kpi = function (account, year, month, value) {
//     if (account == null) {
//         return false;
//     }

//     var col = "";
//     var gems = 0;
//     var score = 0;
//     var dealer = 0;
//     switch (type) {
//         case 0:
//             col = "gems";
//             gems = value;
//             break;
//         case 1:
//             col = "score";
//             score = value;
//             break;
//         case 2:
//             col = "subs";
//             dealer = value;
//             break;
//     }
//     if (col == "")
//         return;

//     var sql = 'UPDATE t_dealers_kpi SET {0} = {1} + {2} where account = "{3}" and year = {4} and month = {5} ';
//     sql = sql.format(col, col, value, account, year, month);
//     console.log(sql);
//     var ret = query(sql);
//     if (ret.error) {
//         if (ret.err.code == 'ER_DUP_ENTRY') {

//             sql = 'insert into t_dealers_kpi values({0},{1},{2},{3},{4},{5})'
//             sql = sql.format(account, year, month, gems, scorem, dealer);
//             console.log(sql);
//             ret = query(sql);
//             if (ret.err) {
//                 console.log(ret.err);
//                 return false;
//             } else {
//                 return true;
//             }
//         }
//     } else {
//         return true;
//     }
// }

// /**查询代理信息 主要用于自身*/
// exports.get_dealer_by_account = function (account) {
//     if (account == null) {
//         return null;
//     }
//     var sql = 'SELECT * FROM t_dealers WHERE account = "' + account + '"';
//     console.log(sql);
//     var ret = query(sql);
//     if (ret.err) {
//         console.log(ret.err);
//         return null;
//     }
//     else {
//         if (ret.rows.length == 0) {
//             console.log("can't find dealer =====");
//             return null;
//         }
//         return ret.rows[0];
//     }
// };

// /**============================================================================================================================ */

// /**用户登陆 */
// exports.check_account = function (account, password) {
//     if (account == null || password == null) {
//         return null;
//     }

//     var sql = ' SELECT * FROM t_dealers WHERE account = "' + account + '" AND password = PASSWORD("' + password + '")';
//     console.log(sql);
//     var ret = query(sql);
//     if (ret.err) {
//         console.log(ret.err);
//         return null;
//     }
//     else {
//         if (ret.rows.length == 0) {
//             return null;
//         }
//         return ret.rows[0];
//     }
// };

// exports.get_dealer_by_token = function (token) {
//     if (token == null) {
//         return null;
//     }

//     var sql = 'SELECT * FROM t_dealers WHERE token = "' + token + '"';
//     console.log(sql);
//     var ret = query(sql);
//     if (ret.err) {
//         console.log(ret.err);
//         return null;
//     }
//     else {
//         if (ret.rows.length == 0) {
//             console.log("未找到代理");
//             return null;
//         }
//         return ret.rows[0];
//     }
// };

// exports.update_token = function (account, token) {
//     if (account == null || token == null) {
//         return false;
//     }

//     var sql = 'UPDATE t_dealers SET token = "' + token + '" WHERE account = "' + account + '"';
//     //console.log(sql);
//     var ret = query(sql);
//     if (ret.err) {
//         console.log(ret.err);
//         return false;
//     }
//     else {
//         return true;
//     }
// };


// /**修改密码 */
// exports.change_decaler_pwd = function (account, oldPwd, newPwd) {
//     if (account == null || oldPwd == null || newPwd == null) {
//         return false;
//     }

//     var sql = 'UPDATE t_dealers SET password = PASSWORD("{0}") where account = "{1}" AND password = PASSWORD("{2}")';
//     sql = sql.format(newPwd, account, oldPwd);
//     console.log(sql);
//     var ret = query(sql);
//     if (ret.err) {
//         if (ret.err.code == 'ER_DUP_ENTRY') {
//             return false;
//         }
//         else {
//             console.log(ret.err);
//             return false;
//         }
//     }
//     else {
//         return true;
//     }
// };

// /**============================================================================================================================ */

// /**获得玩家信息 */
// exports.get_user_game_info = function (userid) {
//     if (userid == null) {
//         return null;
//     }

//     var sql = 'SELECT userid,name,gems,headimg FROM t_users WHERE userid = ' + userid;
//     var ret = query(sql);
//     if (ret.err) {
//         console.log(ret.err);
//         return null;
//     }
//     else {
//         if (ret.rows.length == 0) {
//             return null;
//         }
//         ret.rows[0].name = new Buffer(ret.rows[0].name, 'base64').toString();
//         return ret.rows[0];
//     }
// };

// /**============================================================================================================================ */

/**扣除代理房卡 */
exports.dec_dealer_gems = function (account, gems, callback) {
    callback = callback == null ? nop : callback;
    var sql = 'UPDATE t_dealers SET gems = gems - ' + gems + ' WHERE account = "' + account + '" AND gems >= ' + gems;
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

// /**增加代理房卡 */
// exports.add_dealer_gems = function (account, gems) {
//     var sql = 'UPDATE t_dealers SET gems = gems +' + gems + ' WHERE account = "' + account + '"';
//     console.log(sql);
//     var ret = query(sql);
//     if (ret.err) {
//         console.log(ret.err);
//         return false;
//     }
//     else {
//         this.update_cumulative(account, 0, gems);
//         return ret.rows.affectedRows > 0;
//     }
// };


// /**扣除代理积分 */
// exports.dec_dealer_score = function (account, score) {
//     var sql = 'UPDATE t_dealers SET score = score - ' + score + ' WHERE account = "' + account + '" AND score >= ' + score;
//     console.log(sql);
//     var ret = query(sql);
//     if (ret.err) {
//         console.log(ret.err);
//         return false;
//     }
//     else {
//         return ret.rows.affectedRows > 0;
//     }
// };

// /**增加积分 */
// exports.add_dealer_score = function (account, score) {
//     var sql = 'UPDATE t_dealers SET score = score +' + score + ' WHERE account = "' + account + '"';
//     console.log(sql);
//     var ret = query(sql);
//     if (ret.err) {
//         console.log(ret.err);
//         return false;
//     }
//     else {
//         this.update_cumulative(account, 1, score);
//         return ret.rows.affectedRows > 0;
//     }
// };

// /**增加玩家房卡 */
// exports.add_user_gems = function (userid, gems) {
//     var sql = 'UPDATE t_users SET gems = gems +' + gems + ' WHERE userid = ' + userid;
//     console.log(sql);
//     var ret = query(sql);
//     if (ret.err) {
//         console.log(ret.err);
//         return false;
//     }
//     else {
//         return ret.rows.affectedRows > 0;
//     }
// };

// /**订单 */
// exports.add_bill_record = function (orderid, operator, target, num, time, note) {
//     var sql = 'INSERT INTO t_bills(orderid,operator,target,num,time,note) VALUES({0},"{1}","{2}",{3},{4},"{5}")';
//     sql = sql.format(orderid, operator, target, num, time, note);
//     console.log(sql);
//     var ret = query(sql);
//     if (ret.err) {
//         if (ret.err.code == 'ER_DUP_ENTRY') {
//             return false;
//         }
//         else {
//             console.log(ret.err);
//             return false;
//         }
//     }
//     else {
//         return ret.rows.affectedRows > 0;
//     }
// };

// /**获得积分比例 */
// exports.get_rates = function () {
//     var sql = 'SELECT * FROM t_rates';
//     console.log(sql);
//     var ret = query(sql);
//     if (ret.err) {
//         console.log(ret.err);
//         return null;
//     }
//     else {
//         if (ret.rows.length == 0) {
//             return null;
//         }
//         return ret.rows[0];
//     }
// };

// /**设置抽成比例 */
// exports.update_rates = function (rate1, rate2, rate3) {
//     var sql = 'update t_rates set rate1 = {0}, rate2 = {1} ,rate3 = {2} where id =1';
//     sql = sql.format(rate1, rate2, rate3);
//     console.log(sql);
//     var ret = query(sql);
//     if (ret.err) {
//         console.log(ret.err);
//         return false;
//     }
//     else {
//         return ret.rows.affectedRows > 0;
//     }
// };



// /**更新累计数据 */
// exports.update_cumulative = function (account, type, value) {
//     if (account == null) {
//         return false;
//     }

//     var col = "";
//     var gems = 0;
//     var score = 0;
//     var dealer = 0;
//     switch (type) {
//         case 0:
//             col = "all_gems";
//             gems = value;
//             break;
//         case 1:
//             col = "all_score";
//             score = value;
//             break;
//         case 2:
//             col = "all_subs";
//             dealer = value;
//             break;
//     }
//     if (col == "")
//         return;

//     var sql = 'UPDATE t_dealers SET {0} = {1} + {2} where account = "{3}"';
//     sql = sql.format(col, col, value, account);
//     console.log(sql);
//     var ret = query(sql);
//     if (ret.err) {
//         console.log(ret.err);
//         return false;
//     }
//     else {
//         return ret.rows.affectedRows > 0;
//     }
// };

// /**=========================================================================== */
// /**获得公告信息 常规*/
// exports.get_notice = function () {
//     var nowtime = Date.now;
//     var sql = 'SELECT * FROM t_dealers_notice WHERE act_time <= {0} AND ( end_time > {1} OR end_time = -1 ) ORDER BY act_time DESC';
//     sql = sql.format(nowtime, nowtime);
//     var ret = query(sql);
//     if (ret.err) {
//         console.log(ret.err);
//         return null;
//     }
//     else {
//         return ret.rows;
//     }
// };

// /**获得公告信息 管理*/
// exports.get_notice_all = function () {
//     var sql = 'SELECT * FROM t_dealers_notice ORDER BY act_time DESC';
//     var ret = query(sql);
//     if (ret.err) {
//         console.log(ret.err);
//         return null;
//     }
//     else {
//         if (ret.rows.length == 0) {
//             return null;
//         }
//         return ret.rows;
//     }
// };

// /**更新公告信息 管理*/
// exports.update_notice = function (id, title, content, level, actTime, endTime) {
//     var sql = 'UPDATE t_dealers_notice SET title = "{0}",content = "{1}",level = {2},act_time = {3},end_time = {4} where id = {5}';
//     sql = sql.format(title, content, level, actTime, endTime, id);
//     var ret = query(sql);
//     if (ret.err) {
//         console.log(ret.err);
//         return false;
//     }
//     else {
//         return ret.rows.affectedRows > 0;
//     }
// };
// /**新增公告信息*/
// exports.insert_notice = function (title, content, level, actTime, endTime) {
//     var sql = 'INSERT INTO t_dealers_notice(title,content,level,act_time,end_time) VALUES("{0}","{1}",{2},{3},{4})';
//     sql = sql.format(title, content, level, actTime, endTime);
//     var ret = query(sql);
//     if (ret.err) {
//         console.log(ret.err);
//         return false;
//     }
//     else {
//         return ret.rows.affectedRows > 0;
//     }
// };

// /**删除公告信息*/
// exports.delete_notice = function (id) {
//     var sql = 'DELETE FROM t_dealers_notice where id={0}';
//     sql = sql.format(id);
//     var ret = query(sql);
//     if (ret.err) {
//         console.log(ret.err);
//         return false;
//     }
//     else {
//         return ret.rows.affectedRows > 0;
//     }
// };


// /**商品信息=====================================================================================================================*/

// exports.get_goods = function () {
//     var nowtime = Date.now;
//     var sql = 'SELECT * FROM t_dealers_goods WHERE act_time <= {0} AND ( end_time > {1} OR end_time = -1 ) AND state = 1 ORDER BY act_time DESC';
//     sql = sql.format(nowtime, nowtime);
//     var ret = query(sql);
//     if (ret.err) {
//         console.log(ret.err);
//         return null;
//     }
//     else {
//         if (ret.rows.length == 0) {
//             return null;
//         }
//         return ret.rows;
//     }
// };

// exports.get_goods_id = function (id) {
//     var nowtime = Date.now;
//     var sql = 'SELECT * FROM t_dealers_goods WHERE act_time <= {0} AND ( end_time > {1} OR end_time = -1 ) AND state = 1 AND id = {2} ORDER BY act_time DESC';
//     sql = sql.format(nowtime, nowtime, id);
//     var ret = query(sql);
//     if (ret.err) {
//         console.log(ret.err);
//         return null;
//     }
//     else {
//         if (ret.rows.length == 0) {
//             return null;
//         }
//         return ret.rows[0];
//     }
// };

// exports.get_goods_all = function () {
//     var nowtime = Date.now;
//     var sql = 'SELECT * FROM t_dealers_goods WHERE act_time <= {0} AND ( end_time > {1} OR end_time = -1 ) AND state = 1 ORDER BY act_time DESC';
//     sql = sql.format(nowtime, nowtime);
//     var ret = query(sql);
//     if (ret.err) {
//         console.log(ret.err);
//         return null;
//     }
//     else {
//         if (ret.rows.length == 0) {
//             return null;
//         }
//         return ret.rows;
//     }
// };


// /**更新商品信息 管理*/
// exports.update_goods = function (id, goodsName, goodsType, goodsNum, goodPrice, priceType, state, actTime, endTime) {
//     var sql = 'UPDATE t_dealers_goods SET goods_name = "{0}",goods_type = "{1}",goods_num = {2},goods_price = {3},price_type = {4},state = {5} ,act_time = {6},end_time = {7} where id = {8}';
//     sql = sql.format(goodsName, goodsType, goodsNum, goodPrice, priceType, state, actTime, endTime, id);
//     var ret = query(sql);
//     if (ret.err) {
//         console.log(ret.err);
//         return false;
//     }
//     else {
//         return ret.rows.affectedRows > 0;
//     }
// };

// /**新增商品信息*/
// exports.insert_goods = function (goodsName, goodsType, goodsNum, goodPrice, priceType, state, actTime, endTime) {
//     var sql = 'INSERT INTO t_dealers_goods(goods_name,goods_type,goods_num,goods_price,price_type,state,act_time,end_time) VALUES("{0}",{1},{2},{3},{4},{5},{6},{7})';
//     sql = sql.format(goodsName, goodsType, goodsNum, goodPrice, priceType, state, actTime, endTime);
//     var ret = query(sql);
//     if (ret.err) {
//         console.log(ret.err);
//         return false;
//     }
//     else {
//         return ret.rows.affectedRows > 0;
//     }
// };

// /**商品购买记录 */
// exports.buy_goods_log = function (account, goodsType, goodsNum, goodPrice, priceType, time) {
//     console.log(goodsType);
//     var sql = 'INSERT INTO t_buy_goods_log(account,goods_type,goods_num,goods_price,price_type,time) VALUES("{0}",{1},{2},{3},{4},{5})';
//     sql = sql.format(account, goodsType, goodsNum, goodPrice, priceType, time);
//     console.log(sql);
//     var ret = query(sql);
//     if (ret.err) {
//         console.log(ret.err);
//         return false;
//     }
//     else {
//         return ret.rows.affectedRows > 0;
//     }
// };


// /**查询购买记录 */
// exports.get_buy_goods_log = function (account, start, rows) {
//     if (!account || account == "")
//         return null;
//     var sql = 'SELECT * FROM t_buy_goods_log where account="{0}" limit {1},{2}';
//     sql = sql.format(account, start, rows);
//     console.log(sql);
//     var ret = query(sql);
//     if (ret.err) {
//         console.log(ret.err);
//         return null;
//     }
//     else {
//         return ret.rows;
//     }
// };


/**通过邀请码获取代理 */
exports.get_dealer_by_pcode = function (pcode, callback) {
    if (!pcode || pcode == "")
        return null;
    var sql = "select * from t_dealers where pcode='{0}';";
    sql = sql.format(pcode);
    console.log(sql);
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

/**通过userid获取玩家对应代理的id*/
exports.get_bind_dealerid_by_userid = function (userid, callback) {
    if (!userid || userid == "")
        return null;
    var sql = "SELECT * FROM `t_bind` where userid='{0}';";
    sql = sql.format(userid);
    console.log(sql);
    query(sql, function (err, rows, fields) {
        if (err) {
            callback(false);
            console.log(err);
        }
        else {
            if (rows.length > 0) {
                callback(rows[0].dealerid);
            }
            else {
                callback(false);
            }
        }
    });
};
exports.check_bind_dealer = function (userid, callback) {
    if (!userid) {
        return false;
    }
    var sql = "SELECT * from `t_bind` where userid = '{0}'";
    sql = sql.format(userid);
    console.log(sql);
    query(sql, function (err, rows, fields) {
        if (rows.length > 0) {
            callback(true);
        }
        else {
            callback(false);
        }
    });
}
/**绑定代理 */
//成功的话赠送玩家5张房卡
exports.bind_dealer = function (userid, dealerids, callback) {
    if (!userid || dealerids == "")
        return false;
    var sql = "INSERT INTO `t_bind` (`userid`, `dealerid`, `time`) VALUES ('{0}', '{1}', NOW());";
    sql = sql.format(userid, dealerids);
    console.log(sql);

    var sql_up = 'UPDATE t_users SET gems = gems+5 where userid="{0}";';
    sql_up = sql_up.format(userid);
    console.log(sql_up);

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

/**插入在线消费记录*/
exports.saveGemSellLogs = function (money, dealer_id, dealer_account, userid, username, callback) {
    callback = callback == null ? nop : callback;

    if (dealer_id == null) {
        return null;
    }
    var sql = "INSERT INTO t_gems_sell_logs(money,dealer_id,dealer_account,userid,username,time) \
                VALUES('{0}','{1}','{2}','{3}','{4}',NOW())";
    sql = sql.format(money, dealer_id, dealer_account, userid, username);
    query(sql, function (err, row, fields) {
        if (err) {
            callback(null);
            console.log(err);
        }
        else {
            callback(true);
        }
    });
};

/**根据account获得账号 */
exports.getDealerByAccount = function (account, callback) {
    callback = callback == null ? nop : callback;
    if (account == null) {
        return null;
    }
    var sql = 'SELECT * FROM t_dealers WHERE account = "' + account + '"';
    var ret = query(sql, function (err, rows, fields) {
        if (err) {
            callback(null);
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

/**增加积分 */
exports.addDealerScore = function (account, score, callback) {
    callback = callback == null ? nop : callback;
    if (account == null) {
        return null;
    }

    var sql = 'UPDATE t_dealers SET score = score +' + score + ' WHERE account = "' + account + '"';
    query(sql, function (err, rows, fields) {
        if (err) {
            console.log(err);
            callback(false);
            return;
        }
        else {
            callback(rows.affectedRows > 0);
            return;
        }
    });
};

//anedit 根据邀请码获取代理ID
exports.get_dealerid_by_icode = function (icode, callback) {

    var sql = 'SELECT * FROM t_club_ticket WHERE id = "' + icode + '"';
    console.log(" 根据邀请码获取代理ID 0", sql)
    query(sql, function (err, row, fields) {
        console.log(" 根据邀请码获取代理ID 1:");
        if (err) {
            callback(null);
            console.log(err);
        }
        else {
            callback(row[0]);
        }
        console.log(" 根据邀请码获取代理ID 1:", row[0], row[0].dealerid)
    });

}
//anedit 根据邀请码修改本码是否已经激活 并绑定对应的俱乐部ID
exports.set_ticket_active_by_icode = function (icode, clubid, callback) {
    callback = callback == null ? nop : callback;
    if (!icode || !clubid) {
        callback(false);
        return;
    }

    var sql = `UPDATE t_club_ticket SET active=1, clubid="${clubid}" WHERE id="${icode}";`;
    query(sql, function (err, rows, fields) {
        if (err) {
            console.log(err);
            callback(false);
            return;
        }
        else {
            callback(rows.affectedRows > 0);
            return;
        }
    });
}
//anedit 获取充值配置信息
exports.get_recharge_config =function(cb){
    var sql =" select * from t_recharge_config where pay_type =0"
    query(sql,function(err,rows,fields){
        cb(rows);
    })

}
//anedit 获取代理房卡数
exports.get_gems_by_dealerid =function(dealerid,cb){
    var sql = "select gems from t_dealers where account = {0}";
    sql =sql.format(dealerid);
    query(sql,function(err,rows,fields){
        cb(rows[0]);
    })
}
exports.query = query;