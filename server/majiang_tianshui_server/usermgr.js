var roomMgr = require('./roommgr');
var userList = {};
var userOnline = 0;
//需要时才输出，不需要时可以完全屏蔽
var tmpLog = console.log;
// var tmpLog = function () { };
exports.bind = function(userId,socket){
    if (!userList[userId]) userOnline++;
    userList[userId] = socket;
};

exports.del = function(userId,socket){
    if (userList[userId]) userOnline--;
    delete userList[userId];
};

exports.get = function(userId){
    return userList[userId];
};

exports.isOnline = function(userId){
    if (userList[userId]) {
        return true;
    }
    return false;
};

exports.getOnlineCount = function(){
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
exports.sendMsg = function(userId,event,msgdata){
    var roomId = roomMgr.getUserRoom(userId);
    // tmpLog('exports.sendMsg start 11111111');
    // tmpLog(new Date().Format("yyyy-MM-dd hh:mm:ss"));
    // tmpLog(event + " roomID:" + roomId);
    // tmpLog(event + " userId:" + userId);
    // tmpLog(msgdata);
    // tmpLog('exports.sendMsg end 222222222222');
    var userInfo = userList[userId];
    if(userInfo == null){
        return;
    }
    var socket = userInfo;
    if(socket == null){
        return;
    }

    socket.emit(event,msgdata);
};

exports.kickAllInRoom = function(roomId){
    if(roomId == null){
        return;
    }
    var roomInfo = roomMgr.getRoom(roomId);
    if(roomInfo == null){
        return;
    }

    for(var i = 0; i < roomInfo.seats.length; ++i){
        var rs = roomInfo.seats[i];

        //如果不需要发给发送方，则跳过
        if(rs.userId > 0){
            var socket = userList[rs.userId];
            if(socket != null){
                exports.del(rs.userId);
                socket.disconnect();
            }
        }
    }
};

exports.broacastInRoom = function(event,data,sender,includingSender){
    var roomId = roomMgr.getUserRoom(sender);
    if(roomId == null){
        return;
    }
    var roomInfo = roomMgr.getRoom(roomId);
    if(roomInfo == null){
        return;
    }

    // tmpLog('exports.sendMsg start 11111111');
    // tmpLog(new Date().Format("yyyy-MM-dd hh:mm:ss"));
    // tmpLog(event + " roomID:" + roomInfo.id);
    // tmpLog(event + " sender:" + sender);
    // tmpLog(event + " includingSender:" + includingSender);
    // tmpLog(data);
    // tmpLog('exports.sendMsg end 222222222222');
    for(var i = 0; i < roomInfo.seats.length; ++i){
        var rs = roomInfo.seats[i];

        //如果不需要发给发送方，则跳过
        if(rs.userId == sender && includingSender != true){
            continue;
        }
        var socket = userList[rs.userId];
        if(socket != null){
            socket.emit(event,data);
        }
    }
};