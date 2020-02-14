var clubmgr = require('./clubmgr');
var userList = {};
var userOnline = 0;
//需要时才输出，不需要时可以完全屏蔽
var tmpLog = console.log;
// var tmpLog = function () { };
exports.bind = function (userid, socket) {
    if (!userList[userid]) userOnline++;
    userList[userid] = socket;
};

exports.del = function (userid, socket) {
    if (userList[userid]) userOnline--;
    delete userList[userid];
};

exports.get = function (userid) {
    return userList[userid];
};

exports.isOnline = function (userid) {
    if (userList[userid]) {
        return true;
    }
    return false;
};

exports.getOnlineCount = function () {
    return userOnline;
}

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

exports.sendMsg = function (userid, event, msgdata) {
    // tmpLog('exports.sendMsg start 11111111');
    // tmpLog(new Date().Format("yyyy-MM-dd hh:mm:ss"));
    // tmpLog(event + " roomID:" + roomId);
    // tmpLog(event + " userid:" + userid);
    // tmpLog(msgdata);
    // tmpLog('exports.sendMsg end 222222222222');
    var userInfo = userList[userid];
    if (userInfo == null) {
        return;
    }
    var socket = userInfo;
    if (socket == null) {
        return;
    }

    socket.emit(event, msgdata);
};

exports.broacastInClub = function (event, data, clubid) {
    var member = clubmgr.getAllMember(clubid);
    if (member == null) {
        return;
    }

    // tmpLog('exports.sendMsg start 11111111');
    // tmpLog(new Date().Format("yyyy-MM-dd hh:mm:ss"));
    // tmpLog(event + " roomID:" + roomInfo.id);
    // tmpLog(event + " sender:" + sender);
    // tmpLog(event + " includingSender:" + includingSender);
    // tmpLog(data);
    // tmpLog('exports.sendMsg end 222222222222');
    var onlineList = [];
    for (var userid in member) {
        var socket = userList[userid];
        if (socket != null) {
            socket.emit(event, data);
            onlineList.push(userid);
        }
    }
    //设置在线的玩家
    clubmgr.setAllOnlineMember(clubid, onlineList);
};