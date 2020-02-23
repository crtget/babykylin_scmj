var crypto = require('../utils/crypto');
var express = require('express');
var db = require('../utils/db');
var http = require('../utils/http');
var roomMgr = require("./roommgr");
var userMgr = require("./usermgr");
var tokenMgr = require("./tokenmgr");
var logicutils = require("../utils/logicutils");

var app = express();
var config = null;

var serverIp = "";

//测试
app.all('*', function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
	res.header("X-Powered-By", ' 3.2.1');
	res.header("Content-Type", "application/json;charset=utf-8");
	next();
});

app.get('/get_server_info', function (req, res) {
	var serverId = req.query.serverid;
	var sign = req.query.sign;
	console.log(serverId);
	console.log(sign);
	if (serverId != config.SERVER_ID || sign == null) {
		http.send(res, 1, "invalid parameters");
		return;
	}

	var md5 = crypto.md5(serverId + config.ROOM_PRI_KEY);
	if (md5 != sign) {
		http.send(res, 1, "sign check failed.");
		return;
	}

	var locations = roomMgr.getUserLocations();
	var arr = [];
	for (var userId in locations) {
		var roomId = locations[userId].roomId;
		arr.push(userId);
		arr.push(roomId);
	}
	http.send(res, 0, "ok", { userroominfo: arr });
});

app.get('/create_room', function (req, res) {
	var userId = parseInt(req.query.userid);
	var sign = req.query.sign;
	var gems = req.query.gems;
	var conf = req.query.conf;
	if (userId == null || sign == null || conf == null) {
		http.send(res, 1, "invalid parameters");
		return;
	}

	var md5 = crypto.md5(userId + conf + gems + config.ROOM_PRI_KEY);
	if (md5 != req.query.sign) {
		console.log("invalid reuqest.");
		http.send(res, 1, "sign check failed.");
		return;
	}

	conf = JSON.parse(conf);
	roomMgr.createRoom(userId, conf, gems, serverIp, config.CLIENT_PORT, config.TYPE, null, function (errcode, roomId) {
		if (errcode != 0 || roomId == null) {
			http.send(res, errcode, "create failed.");
			return;
		}
		else {
			http.send(res, 0, "ok", { roomid: roomId });
		}
	});
});

app.get('/create_club_room', function (req, res) {
    var userId = parseInt(req.query.userid)
    var clubId = parseInt(req.query.clubid)
    var sign = req.query.sign;
    var gems = req.query.gems; //玩家身上的房卡数
    var dealerid = req.query.dealerid; //代理后台的房卡数
    var dealergems = req.query.dealergems; //代理后台的房卡数
    var conf = req.query.conf
    if (userId == null || sign == null || conf == null) {
        http.send(res, 1, "invalid parameters");
        return;
    }

    var md5 = crypto.md5(userId + conf + gems + config.ROOM_PRI_KEY);
    if (md5 != req.query.sign) {
        console.log("invalid reuqest.");
        http.send(res, 1, "sign check failed.");
        return;
    }

    conf = JSON.parse(conf);
    logicutils.createClubRoom(userId,roomMgr,gems,conf,serverIp,dealerid,clubId,config,http,res)
    // console.log('http tianshui:/create_agent_room: start createClubRoom ...')
    // roomMgr.createClubRoom(userId, conf, gems, dealergems, serverIp, config.CLIENT_PORT, config.TYPE, dealerid, clubId, function (errcode, roomId) {
    //     if (errcode != 0 || roomId == null) {
    //         http.send(res, errcode, "create failed.");
    //         return;
    //     }
    //     else {
    //         http.send(res, 0, "ok", { roomid: roomId });
    //     }
    // });
});

app.get('/dissolve_club_room', function (req, res) {
    var userid = parseInt(req.query.userid);
    var roomid = req.query.roomid;
    var sign = req.query.sign
    if (userid == null || roomid == null || sign == null) {
        console.log("http_service invalid parameters.");
        http.send(res, 1, "invalid parameters");
        return;
    }

    var md5 = crypto.md5(userid.toString() + roomid.toString() + config.ROOM_PRI_KEY);
    if (md5 != req.query.sign) {
        console.log("http_service invalid reuqest.");
        http.send(res, 2, "sign check failed.");
        return;
    }

    var roomInfo = roomMgr.getRoom(roomid);
    if (roomInfo == null) {
        console.log("http_service unknow roomid.");
        http.send(res, 0, "ok");
        return;
    }

    //找到一个在房间里的玩家
    var roomUserID = -1;
    for (var i = 0; i < roomInfo.seats.length; ++i) {
        var rs = roomInfo.seats[i];
        if (rs.userId > 0) {
            roomUserID = rs.userId;
            break;
        }
    }

    userMgr.broacastInRoom('dispress_push', {}, roomUserID, true);
    userMgr.kickAllInRoom(roomid);
    roomMgr.destroy(roomid);

    http.send(res, 0, "ok");
});
app.get('/enter_room', function (req, res) {
	var userId = parseInt(req.query.userid);
	var name = req.query.name;
	var roomId = req.query.roomid;
	var sign = req.query.sign;
	var lucky = req.query.lucky ? req.query.lucky : 0;
	if (userId == null || roomId == null || sign == null) {
		http.send(res, 1, "invalid parameters");
		return;
	}



	var md5 = crypto.md5(userId + name + roomId + config.ROOM_PRI_KEY);
	console.log(req.query);
	console.log(md5);
	if (md5 != sign) {
		http.send(res, 2, "sign check failed.");
		return;
	}
	db.get_gems_by_userid(userId, function (data) {
		var gems = 0;
		if (data != null) {
			gems =  data.gems;
		}
		//安排玩家坐下
		roomMgr.enterRoom(roomId, userId, name, gems, lucky, function (ret) {
			if (ret != 0) {
				if (ret == 1) {
					http.send(res, 4, "room is full.");
				}
				else if (ret == 2) {
					http.send(res, 3, "can't find room.");
				}
				else if (ret == 3) {
					http.send(res,5,"not enough gmes ");
				}
				return;
			}

			var token = tokenMgr.createToken(userId, 5000);
			http.send(res, 0, "ok", { token: token });
		});
	});
	
});

app.get('/ping', function (req, res) {
	var sign = req.query.sign;
	var md5 = crypto.md5(config.ROOM_PRI_KEY);
	if (md5 != sign) {
		return;
	}
	http.send(res, 0, "pong");
});

app.get('/is_room_runing', function (req, res) {
	var roomId = req.query.roomid;
	var sign = req.query.sign;
	if (roomId == null || sign == null) {
		http.send(res, 1, "invalid parameters");
		return;
	}

	var md5 = crypto.md5(roomId + config.ROOM_PRI_KEY);
	if (md5 != sign) {
		http.send(res, 2, "sign check failed.");
		return;
	}

	//var roomInfo = roomMgr.getRoom(roomId);
	http.send(res, 0, "ok", { runing: true });
});

var gameServerInfo = null;
var lastTickTime = 0;
//向大厅服定时心跳
function update() {
	if (lastTickTime + config.HTTP_TICK_TIME < Date.now()) {
		lastTickTime = Date.now();
		gameServerInfo.load = roomMgr.getTotalRooms();
		gameServerInfo.player = userMgr.getOnlineCount();
		http.get(config.HALL_IP, config.HALL_PORT, "/register_gs", gameServerInfo, function (ret, data) {
			if (ret == true) {
				if (data.errcode != 0) {
					console.log(data.errmsg);
				}

				if (data.ip != null) {
					serverIp = data.ip;
				}
			}
			else {
				//
				lastTickTime = 0;
			}
		});

		var mem = process.memoryUsage();
		var format = function (bytes) {
			return (bytes / 1024 / 1024).toFixed(2) + 'MB';
		};
		//console.log('Process: heapTotal '+format(mem.heapTotal) + ' heapUsed ' + format(mem.heapUsed) + ' rss ' + format(mem.rss));
	}
}

exports.start = function ($config) {
	config = $config;

	//
	gameServerInfo = {
		id: config.SERVER_ID,
		clientip: config.CLIENT_IP,
		clientport: config.CLIENT_PORT,
		httpPort: config.HTTP_PORT,
		load: roomMgr.getTotalRooms(),
		player: userMgr.getOnlineCount(),
		type: config.TYPE,
	};

	setInterval(update, 1000);
	app.listen(config.HTTP_PORT, config.FOR_HALL_IP);
	console.log("game server is listening on " + config.FOR_HALL_IP + ":" + config.HTTP_PORT);
};