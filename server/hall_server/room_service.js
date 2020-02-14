var crypto = require('../utils/crypto');
var express = require('express');
var db = require('../utils/db');
var dealerdb = require('../utils/dealerdb');
var http = require('../utils/http');
var app = express();

var hallIp = null;
var config = null;
var rooms = {};
var serverMap = {};
var roomIdOfUsers = {};

//设置跨域访问
app.all('*', function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
	res.header("X-Powered-By", ' 3.2.1');
	res.header("Content-Type", "application/json;charset=utf-8");
	next();
});

app.get('/register_gs', function (req, res) {
	var ip = req.ip;
	var clientip = req.query.clientip;
	var clientport = req.query.clientport;
	var httpPort = req.query.httpPort;
	var load = req.query.load;
	var player = req.query.player;
	var id = clientip + ":" + clientport;
	var type = req.query.type;

	if (serverMap[id]) {
		var info = serverMap[id];
		if (info.clientport != clientport
			|| info.httpPort != httpPort
			|| info.ip != ip
		) {
			// console.log("duplicate gsid:" + id + ",addr:" + ip + "(" + httpPort + ")");
			http.send(res, 1, "duplicate gsid:" + id);
			return;
		}
		info.load = load;
		info.player = player;
		http.send(res, 0, "ok", { ip: clientip });
		return;
	}
	serverMap[id] = {
		ip: ip,
		id: id,
		clientip: clientip,
		clientport: clientport,
		httpPort: httpPort,
		load: load,//创建的桌数
		player: player,//在线玩家
		type: type,
	};
	// console.log(id, ip, clientip, httpPort, load, type)
	http.send(res, 0, "ok", { ip: clientip });
	// console.log("game server registered.\n\tid:" + id + "\n\taddr:" + ip + "\n\thttp port:" + httpPort + "\n\tsocket clientport:" + clientport);
	// console.log(serverMap[id]);

	var reqdata = {
		serverid: id,
		sign: crypto.md5(id + config.ROOM_PRI_KEY)
	};
	//获取服务器信息
	http.get(ip, httpPort, "/get_server_info", reqdata, function (ret, data) {
		if (ret && data.errcode == 0) {
			for (var i = 0; i < data.userroominfo.length; i += 2) {
				var userId = data.userroominfo[i];
				var roomId = data.userroominfo[i + 1];
			}
		}
		else {
			// console.log("hall_server register_gs => ", data.errmsg);
		}
	});
});

function chooseServer(type) {
	type = type ? type : -1;
	var serverinfo = null;

	for (var s in serverMap) {
		var info = serverMap[s];
		if (type == info.type) {
			if (serverinfo == null) {
				serverinfo = info;
			}
			else {
				if (serverinfo.load > info.load) {
					serverinfo = info;
				}
			}
		}
	}
	return serverinfo;
}

exports.createRoom = function (account, userId, roomConf, type, fnCallback) {
	type = 1;
	var serverinfo = chooseServer(type);
	console.log("serverinfo ======== ", serverinfo, "type ======= ", type);
	if (serverinfo == null) {
		fnCallback(101, null);
		return;
	}

	db.get_gems(account, function (data) {
		if (data != null) {
			//2、请求创建房间
			var reqdata = {
				userid: userId,
				gems: data.gems,
				conf: roomConf
			};
			reqdata.sign = crypto.md5(userId + roomConf + data.gems + config.ROOM_PRI_KEY);
			console.log("createRoom");
			console.log(serverinfo.ip, serverinfo.httpPort, "create_room");
			http.get(serverinfo.ip, serverinfo.httpPort, "/create_room", reqdata, function (ret, data) {
				console.log(data);
				if (ret) {
					if (data.errcode == 0) {
						fnCallback(0, data.roomid);
					}
					else {
						fnCallback(data.errcode, null);
					}
					return;
				}
				fnCallback(102, null);
			});
		}
		else {
			fnCallback(103, null);
		}
	});
};

// exports.createAgentRoom = function(account, userId, roomConf, type, fnCallback){
// 	var serverinfo = chooseServer(type);
// 	console.log("createAgentRoom ======== serverinfo ============== ", serverinfo, "type ======== ", type);
// 	if(serverinfo == null){
// 		fnCallback(101, null);
// 		return;
// 	}
//
// 	db.get_gems(account, function(data){
//         console.log("createAgentRoom=>get_gems:success,data: ", data)
// 		if(data != null){
// 			//2、请求创建房间
// 			var reqdata = {
// 				userid: userId,
// 				gems: data.gems,
// 				conf: roomConf
// 			};
//
// 			reqdata.sign = crypto.md5(userId + roomConf + data.gems + config.ROOM_PRI_KEY);
//             console.log("createAgentRoom=>start request /create_agent_room ...")
// 			http.get(serverinfo.ip, serverinfo.httpPort, "/create_agent_room", reqdata, function(ret, data){
//                 console.log("createAgentRoom=> request /create_agent_room success,ret:",ret)
// 				if(ret){
// 					if(data.errcode == 0){
// 						fnCallback(0, data.roomid);
// 					}
// 					else{
// 						fnCallback(data.errcode, null);
// 					}
// 					return;
// 				}
// 				fnCallback(102, null);
// 			});
// 		}
// 		else{
// 			fnCallback(103, null);
// 		}
// 	});
// };

exports.createClubRoom = function (account, userId, roomConf, type, clubId, fnCallback) {
	var serverinfo = chooseServer(type);
	console.log("createClubRoom ======== serverinfo ============== ", serverinfo, "type ======== ", type);
	if (serverinfo == null) {
		fnCallback(101, null);
		return;
	}

	//获取该俱乐部群主的房卡数
	db.get_club_info_byID(clubId, function (clubinfo) {
		if (clubinfo) {
			dealerdb.getDealerByAccount(clubinfo.dealerid, function (dealerinfo) {
				if (dealerinfo) {

					db.get_gems(account, function (data) {
						console.log("createClubRoom=>get_gems:success,data: ", data)
						if (data != null) {
							//2、请求创建房间
							var reqdata = {
								userid: userId,
								gems: data.gems,
								dealerid: dealerinfo.account,
								dealergems: dealerinfo.gems,
								conf: roomConf,
								clubid: clubId,
							};

							reqdata.sign = crypto.md5(userId + roomConf + data.gems + config.ROOM_PRI_KEY);
							console.log("createClubRoom=>start request /create_agent_room ...")
							http.get(serverinfo.ip, serverinfo.httpPort, "/create_club_room", reqdata, function (ret, data) {
								console.log("createClubRoom=> request /create_agent_room success,ret:", ret)
								if (ret) {
									if (data.errcode == 0) {
										fnCallback(0, data.roomid);
									}
									else {
										fnCallback(data.errcode, null);
									}
									return;
								}
								fnCallback(102, null);
							});
						}
						else {
							fnCallback(103, null);
						}
					});
				}
				else {
					console.log("Can not find dealerinfo by dealerid=", dealerid);
					fnCallback(104, null);
				}
			})
		}
		else {
			console.log("Can not find clubinfo by clubid=", clubId);
			fnCallback(105, null);
		}
	});


};
//解散代开的房间
exports.dissolveClubRoom = function (userId, roomId, type, fnCallback) {
	var serverinfo = chooseServer(type);
	console.log("dissolveAgentRoom ======== serverinfo ============== ", serverinfo, "type ======== ", type);
	if (serverinfo == null) {
		fnCallback(101, null);
		return;
	}

	var reqdata = {
		userid: userId,
		roomid: roomId,
		type: type,
	};

	reqdata.sign = crypto.md5(userId + roomId + config.ROOM_PRI_KEY);
	http.get(serverinfo.ip, serverinfo.httpPort, "/dissolve_club_room", reqdata, function (ret, data) {
		if (ret) {
			if (data.errcode == 0) {
				fnCallback(0);
			}
			else {
				fnCallback(data.errcode);
			}
			return;
		}
		fnCallback(102);
	});
};

//代理创建桌子
exports.createDealerRoom = function (dealer, roomConf, type, fnCallback) {
	console.log("createDealerRoom 111111111111111111");
	console.log(dealer, roomConf, type);
	var serverinfo = chooseServer(type);
	if (serverinfo == null) {
		fnCallback(101, null);
		return;
	}
	console.log("createDealerRoom 22222222222222222");
	//2、请求创建房间
	var reqdata = {
		dealer: dealer, //代理号
		conf: roomConf,
	};
	reqdata.sign = crypto.md5(dealer + roomConf + config.ROOM_PRI_KEY);
	http.get(serverinfo.ip, serverinfo.httpPort, "/create_dealer_room", reqdata, function (ret, data) {
		if (ret) {
			if (data.errcode == 0) {
				console.log("createDealerRoom 3333333333333333333333");
				fnCallback(0, data.roomid);
			}
			else {
				console.log("createDealerRoom 4444444444444444");
				fnCallback(data.errcode, null);
			}

			console.log("createDealerRoom 55555555555555");
			return;
		}

		console.log("createDealerRoom 666666666666666666666666");
		fnCallback(102, null);
	});

};

exports.enterRoom = function (userId, mask, name, roomId, lucky, fnCallback) {
	var reqdata = {
		userid: userId,
		mask: mask,
		name: name,
		roomid: roomId,
		lucky: lucky ? lucky : 0,
	};
	reqdata.sign = crypto.md5(userId + mask + name + roomId + config.ROOM_PRI_KEY);

	var checkRoomIsRuning = function (serverinfo, roomId, callback) {
		var sign = crypto.md5(roomId + config.ROOM_PRI_KEY);
		http.get(serverinfo.ip, serverinfo.httpPort, "/is_room_runing", { roomid: roomId, sign: sign }, function (ret, data) {
			if (ret) {
				if (data.errcode == 0 && data.runing == true) {
					callback(true);
				}
				else {
					callback(false);
				}
			}
			else {
				callback(false);
			}
		});
	}

	var enterRoomReq = function (serverinfo) {
		http.get(serverinfo.ip, serverinfo.httpPort, "/enter_room", reqdata, function (ret, data) {
			console.log("/enter_room====================", data);
			if (ret) {
				if (data.errcode == 0) {
					db.set_room_id_of_user(userId, roomId, function (ret) {
						console.log("set_room_id_of_user ========================== ");
						fnCallback(0, {
							ip: serverinfo.clientip,
							port: serverinfo.clientport,
							type: serverinfo.type,
							token: data.token
						});
					});
				}
				else {
					console.log(data.errmsg);
					fnCallback(data.errcode, null);
				}
			}
			else {
				fnCallback(-1, null);
			}
		});
	};

	var chooseServerAndEnter = function (serverinfo) {
		serverinfo = chooseServer();
		if (serverinfo != null) {
			enterRoomReq(serverinfo);
		}
		else {
			fnCallback(-1, null);
		}
	}

	db.get_room_addr(roomId, function (ret, ip, port) {
		if (ret) {
			var id = ip + ":" + port;
			console.log(id);
			console.log(serverMap);
			var serverinfo = serverMap[id];
			if (serverinfo != null) {
				checkRoomIsRuning(serverinfo, roomId, function (isRuning) {
					if (isRuning) {
						enterRoomReq(serverinfo);
					}
					else {
						chooseServerAndEnter(serverinfo);
					}
				});
			}
			else {
				//都没有找到为什么还要选择服务器进入呢？
				// chooseServerAndEnter(serverinfo);
				console.log("id:" + id, "enterRoom => db.get_room_addr serverinfo==null");
			}
		}
		else {
			fnCallback(-2, null);
		}
	});
};

exports.joinMatch = function (userid, type, index, icon, name, sex, gems, fnCallback) {
	var serverinfo = chooseServer(type);
	console.log("joinMatch serverinfo=", serverinfo, "  type=", type, "  index =", index);
	if (serverinfo == null) {
		fnCallback(101, null);
		return;
	}

	var reqdata = {
		userid: userid,
		index: index,
		icon: icon,
		name: name,
		sex: sex,
		gems: gems,
	};
	reqdata.sign = crypto.md5(parseInt(userid) + parseInt(gems) + config.ROOM_PRI_KEY);
	http.get(serverinfo.ip, serverinfo.httpPort, "/join_match", reqdata, function (ret, data) {
		//console.log(data);
		if (ret) {
			if (data.errcode == 0) {
				fnCallback(0, data.roomid);
			}
			else {
				fnCallback(data.errcode, null);
			}
			return;
		}
		fnCallback(102, null);
	});
};


//加入金币场游戏
exports.joinGoldGame = function (userid, type, index, icon, name, sex, coins, fnCallback) {
	var serverinfo = chooseServer(type);
	console.log("joinGoldGame serverinfo=", serverinfo, "  type=", type, "  index =", index);
	if (serverinfo == null) {
		fnCallback(101, null);
		return;
	}

	var reqdata = {
		userid: userid,
		index: index,
		icon: icon,
		name: name,
		sex: sex,
		coins: coins,
	};
	reqdata.sign = crypto.md5(parseInt(userid) + parseInt(coins) + config.ROOM_PRI_KEY);
	http.get(serverinfo.ip, serverinfo.httpPort, "/join_gold_game", reqdata, function (ret, data) {
		//console.log(data);
		if (ret) {
			if (data.errcode == 0) {
				fnCallback(0, data.roomid);
			}
			else {
				fnCallback(data.errcode, null);
			}
			return;
		}
		fnCallback(102, null);
	});
};


exports.isServerOnline = function (ip, port, callback) {
	var id = ip + ":" + port;
	var serverInfo = serverMap[id];
	if (!serverInfo) {
		callback(false);
		return;
	}
	var sign = crypto.md5(config.ROOM_PRI_KEY);
	http.get(serverInfo.ip, serverInfo.httpPort, "/ping", { sign: sign }, function (ret, data) {
		if (ret) {
			callback(true);
		}
		else {
			callback(false);
		}
	});
};

/** 获取服务器开桌情况 */
exports.getServerLoad = function () {
	var data = {};
	for (var id in serverMap) {
		var serverInfo = serverMap[id];
		if (!serverInfo) continue;
		if (!data[serverInfo.type]) {
			data[serverInfo.type] = {};
		}
		if (!data[serverInfo.type].load) {
			data[serverInfo.type].load = 0;
		}
		if (!data[serverInfo.type].player) {
			data[serverInfo.type].player = 0;
		}
		data[serverInfo.type].load += serverInfo.load;
		data[serverInfo.type].player += serverInfo.player;
	}
	return data;
};

exports.start = function ($config) {
	config = $config;
	app.listen(config.ROOM_PORT, config.FOR_ROOM_IP);
	console.log("room service is listening on " + config.FOR_ROOM_IP + ":" + config.ROOM_PORT);
};