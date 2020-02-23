var crypto = require('../utils/crypto');
var express = require('express');
var db = require('../utils/db');
var dealerdb = require('../utils/dealerdb');
var http = require('../utils/http');
var room_service = require("./room_service");
var bodyParser = require('body-parser');
var md5 = require("md5");
var clubMgr = require("../club_server/clubmgr");

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var request = require('request');
var fs = require('fs');
var config = null;

function check_account(req, res) {
	var account = req.query.account;
	var sign = req.query.sign;
	if (account == null || sign == null) {
		http.send(res, 1, "unknown error");
		return false;
	}
	/*
	var serverSign = crypto.md5(account + req.ip + config.ACCOUNT_PRI_KEY);
	if(serverSign != sign){
		http.send(res,2,"login failed.");
		return false;
	}
	*/
	return true;
}

function isToday(timestamp) {
	// var date = new Date(timestamp);
	// var today = new Date();

	// //获取从今天0点开始到现在的时间
	// var todayTime = today.getTime() % (1000 * 60 * 60 * 24);
	// //获取要判断的日期和现在时间的偏差
	// var offset = date.getTime() - today.getTime();
	// //获取要判断日期距离今天0点有多久
	// var dateTime = offset + todayTime;

	// if (dateTime < 0 || dateTime > 1000 * 60 * 60 * 24) {
	// 	return false;
	// } else {
	// 	return true;
	// }

	var date = new Date(timestamp);
	var today = new Date();
	var a = date.getFullYear().toString() + "-" + date.getMonth().toString() + "-" + date.getDate().toString();
	var b = today.getFullYear().toString() + "-" + today.getMonth().toString() + "-" + today.getDate().toString();

	if (a == b) {
		return true;
	}
	return false;
}

//设置跨域访问
app.all('*', function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
	res.header("X-Powered-By", ' 3.2.1');
	res.header("Content-Type", "application/json;charset=utf-8");
	next();
});

app.get('/login', function (req, res) {
	if (!check_account(req, res)) {
		return;
	}

	var ip = req.ip;
	if (ip.indexOf("::ffff:") != -1) {
		ip = ip.substr(7);
	}

	var account = req.query.account;
	db.get_user_data(account, function (data) {
		if (data == null) {
			http.send(res, 0, "ok");
			return;
		}
		db.update_last_login(data.userid);

		//判断该玩家的激活状态
		if (data.active && parseInt(data.active) != 1) {
			var ret = {
				userid: data.userid,
				active: data.active,
			}
			http.send(res, 1, ret);
			return;
		}

		dealerdb.get_bind_dealerid_by_userid(data.userid, function (dealerid) {
			var ret = {
				account: data.account,
				userid: data.userid,
				mask: data.mask ? data.mask : "",
				name: data.name,
				lv: data.lv,
				exp: data.exp,
				coins: data.coins,
				gems: data.gems,
				point: data.point,
				ticket: data.ticket,
				ip: ip,
				sex: data.sex,
				dealerid: dealerid ? dealerid : '',
				active: data.active,
				isPass: data.isPass,
				maxCoin: data.maxCoin,
				lucky: data.lucky ? data.lucky : 0,
			};

			db.get_room_id_of_user(data.userid, function (roomId) {
				//如果用户处于房间中，则需要对其房间进行检查。 如果房间还在，则通知用户进入
				if (roomId != null) {
					//检查房间是否存在于数据库中
					db.is_room_exist(roomId, function (retval) {
						if (retval) {
							ret.roomid = roomId;
						}
						else {
							//如果房间不在了，表示信息不同步，清除掉用户记录
							db.set_room_id_of_user(data.userid, null);
						}
						http.send(res, 0, "ok", ret);
					});
				}
				else {
					http.send(res, 0, "ok", ret);
				}
			});

		});

		//将玩家的头像保存到服务器硬盘上 
		if (data.headimg) {
			//发送请求
			request(data.headimg, function (error, response, body) {
				if (!error && response.statusCode == 200) {
					var path = '/usr/share/nginx/html/headimg/' + data.userid + '.jpg';
					request(data.headimg).pipe(fs.createWriteStream(path));
				}
			});
		}
	});
});

app.get('/create_user', function (req, res) {
	if (!check_account(req, res)) {
		return;
	}
	var account = req.query.account;
	var name = req.query.name;
	var coins = 1000;
	var gems = 6;
	console.log(name);

	db.is_user_exist(account, function (ret) {
		if (!ret) {
			db.create_user(account, name, coins, gems, 0, null, function (ret) {
				if (ret == null) {
					http.send(res, 2, "system error.");
				}
				else {
					http.send(res, 0, "ok");
				}
			});
		}
		else {
			http.send(res, 1, "account have already exist.");
		}
	});
});

app.get('/create_private_room', function (req, res) {
	//验证参数合法性
	var data = req.query;
	//验证玩家身份
	if (!check_account(req, res)) {
		return;
	}

	console.log("client_service====================", data.type);

	var account = data.account;
	data.account = null;
	data.sign = null;
	var conf = data.conf;
	var type = data.type;
	db.get_user_data(account, function (data) {
		if (data == null) {
			http.send(res, 1, "system error");
			return;
		}
		var userId = data.userid;
		var mask = data.mask ? data.mask : "";
		var name = data.name;
		var lucky = data.lucky ? data.lucky : 0;
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
						console.log("errcode ========== ", errcode, ", enterInfo ----------- ", enterInfo);
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
});

//俱乐部开房
// app.get('/create_agent_private_room', function(req, res){
// 	//验证参数合法性
// 	var data = req.query;
// 	//验证玩家身份
// 	if (!check_account(req, res)) {
// 		console.log('create_agent_private_room: check account failed.')
// 		return;
// 	}
//
// 	var account = data.account;
//
// 	data.account = null;
// 	data.sign = null;
// 	var conf = data.conf;
// 	var type = data.type;
// 	db.get_user_data(account, function (data) {
// 		if (data == null) {
// 			http.send(res, 1, "system error");
// 			return;
// 		}
// 		var userId = data.userid;
// 		var mask = data.mask ? data.mask : "";
// 		var name = data.name;
// 		var lucky = data.lucky ? data.lucky : 0;
// 		//验证玩家状态
// 		db.get_room_id_of_user(userId, function (roomId) {
// 			if (roomId != null) {
// 				http.send(res, -1, "user is playing in room now.");
// 				return;
// 			}
// 			//创建房间
// 			room_service.createAgentRoom(account, userId, conf, type, function (err, roomId) {
// 				console.log("create_agent_private_room ===== err 111111111 ", err, ", roomId 222222222 ", roomId);
// 				if (err == 0 && roomId != null) {
// 					// room_service.enterRoom(userId, mask, name, roomId, lucky, function (errcode, enterInfo) {
// 					// 	console.log("errcode ========== ", errcode, ", enterInfo ----------- ", enterInfo);
// 					// 	if (enterInfo) {
// 					// 		var ret = {
// 					// 			roomid: roomId,
// 					// 			ip: enterInfo.ip,
// 					// 			port: enterInfo.port,
// 					// 			type: enterInfo.type,
// 					// 			token: enterInfo.token,
// 					// 			time: Date.now()
// 					// 		};
// 					// 		ret.sign = crypto.md5(ret.roomid + ret.token + ret.time + config.ROOM_PRI_KEY);
// 					// 		http.send(res, 0, "ok", ret);
// 					// 	}
// 					// 	else {
// 					// 		http.send(res, errcode, "room doesn't exist.");
// 					// 	}
// 					// });
//
// 					http.send(res, 0, "ok", { errcode: 0, roomid: roomId });
// 				}
// 				else {
// 					http.send(res, err, "create failed.");
// 				}
// 			});
// 		});
// 	});
// });
app.get('/create_club_room', function (req, res) {
	//验证参数合法性
	var data = req.query;
	//验证玩家身份
	if (!check_account(req, res)) {
		console.log('create_agent_private_room: check account failed.')
		return;
	}

	var account = data.account;
	var clubId = data.clubid

	data.account = null;
	data.sign = null;
	var conf = data.conf;
	var type = data.type;
	db.get_user_data(account, function (data) {
		if (data == null) {
			http.send(res, 1, "system error");
			return;
		}
		var userId = data.userid;
		var mask = data.mask ? data.mask : "";
		var name = data.name;
		var lucky = data.lucky ? data.lucky : 0;
		//验证玩家状态
		db.get_room_id_of_user(userId, function (roomId) {
			if (roomId != null) {
				http.send(res, -1, "user is playing in room now.");
				return;
			}
			//创建房间
			room_service.createClubRoom(account, userId, conf, type, clubId, function (err, roomId) {
				console.log("create_agent_private_room ===== err 111111111 ", err, ", roomId 222222222 ", roomId);
				if (err == 0 && roomId != null) {
					room_service.enterRoom(userId, mask, name, roomId, lucky, function (errcode, enterInfo) {
						console.log("errcode ========== ", errcode, ", enterInfo ----------- ", enterInfo);
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

					// http.send(res, 0, "ok", { errcode: 0, roomid: roomId });
				}
				else {
					http.send(res, err, "create failed.");
				}
			});
		});
	});
});

app.get('/delete_club_room', function (req, res) {
	//验证参数合法性
	var data = req.query;
	//验证玩家身份
	if (!check_account(req, res)) {
		return;
	}
	var account = data.account;
	var clubId = data.clubid
	if(!clubId){
		http.send(res, -1, "parameter don't match.");
	}
	db.get_club_room(clubId,function(data){
		console.log('这里的data是什么？',data);
		if(data==false){
			http.send(res, 1, "have no rooms.");
		}else{
			db.delete_club_room(clubId);
			http.send(res, 0, "its all right.");
		}
	});
});

//获取代开房信息
app.get('/get_club_private_room', function (req, res) {
	//验证参数合法性
	var data = req.query;
	//验证玩家身份
	if (!check_account(req, res)) {
		return;
	}

	var account = data.account;
	var userid = data.userid;

	db.get_club_room(userid, function (infos) {
		http.send(res, 0, "ok", { errcode: 0, infos: JSON.stringify(infos) });
	});
});

//解散代开房
app.get('/dissolve_club_private_room', function (req, res) {
	//验证参数合法性
	var data = req.query;
	//验证玩家身份
	if (!check_account(req, res)) {
		return;
	}

	var account = data.account;
	var userid = data.userid;
	var roomid = data.roomid;
	var type = data.type;

	db.get_single_club_room(roomid, function (info) {
		if (!info) {
			http.send(res, -1, "no club room:" + roomid);
			return;
		}

		db.get_club_info_byID(info.clubid, function (clubInfo) {
			if (clubInfo.userid !== userid) {
				http.send(res, -1, "user " + userid + " can't dissolve room " + roomid);
				return
			}

			//检查该房间玩家人数
			var base_info = JSON.parse(info.base_info);
			console.log("base_info ========= ", base_info);
			var b = 0;
			if (base_info.renshuxuanze != null) {
				for (var i = 0; i < base_info.renshuxuanze; i++) {
					if (info["user_id" + i] != 0) {
						b++;
					}
				}
			}
			else {
				if (info.type == 10000) {
					for (var i = 0; i < 10; i++) {
						if (info["user_id" + i] != 0) {
							b++;
						}
					}
				}
				else {
					for (var i = 0; i < 4; i++) {
						if (info["user_id" + i] != 0) {
							b++;
						}
					}
				}
			}

			console.log("b=", b);

			if (base_info.renshuxuanze != null) {
				if (b < base_info.renshuxuanze) {
					//通知游戏服务器解散房间
					room_service.dissolveClubRoom(userid, roomid, type, function (errcode) {
						if (errcode == 0) {
							//通知房间成功
							//删除玩家ID
							db.clear_user_roomid(roomid);
							//删除房间ID
							db.delete_room(roomid);
							//退还房卡
							var cf = JSON.parse(info.base_info);
							db.add_user_gems(userid, cf.cost);
							http.send(res, 0, "ok");
						}
						else {
							http.send(res, errcode, "");
						}
					})
				}
				else {
					http.send(res, -2, "serious error!");
				}
			}
			else {
				if (info.type == 10000) {
					if (b < 10) {
						//通知游戏服务器解散房间
						room_service.dissolveClubRoom(userid, roomid, type, function (errcode) {
							if (errcode == 0) {
								//通知房间成功
								//删除玩家ID
								db.clear_user_roomid(roomid);
								//删除房间ID
								db.delete_room(roomid);
								//退还房卡
								var cf = JSON.parse(info.base_info);
								db.add_user_gems(userid, cf.cost);
								http.send(res, 0, "ok");
							}
							else {
								http.send(res, errcode, "");
							}
						})
					}
					else {
						http.send(res, -2, "serious error!");
					}
				}
				else {
					if (b < 4) {
						//通知游戏服务器解散房间
						room_service.dissolveClubRoom(userid, roomid, type, function (errcode) {
							if (errcode == 0) {
								//通知房间成功
								//删除玩家ID
								db.clear_user_roomid(roomid);
								//删除房间ID
								db.delete_room(roomid);
								//退还房卡
								var cf = JSON.parse(info.base_info);
								db.add_user_gems(userid, cf.cost);
								http.send(res, 0, "ok");
							}
							else {
								http.send(res, errcode, "");
							}
						})
					}
					else {
						http.send(res, -2, "serious error!");
					}
				}
			}
		})
	});
});

app.get('/enter_private_room', function (req, res) {
	var data = req.query;
	var roomId = data.roomid;
	if (roomId == null) {
		http.send(res, -1, "parameters don't match api requirements.");
		return;
	}
	if (!check_account(req, res)) {
		return;
	}

	var account = data.account;

	db.get_user_data(account, function (data) {
		if (data == null) {
			http.send(res, -1, "system error");
			return;
		}
		var userId = data.userid;
		var mask = data.mask ? data.mask : "";
		var name = data.name;
		var lucky = data.lucky ? data.lucky : 0;

		//验证玩家状态
		//todo
		//进入房间
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
				ret.sign = crypto.md5(roomId + ret.token + ret.time + config.ROOM_PRI_KEY);
				http.send(res, 0, "ok", ret);
			}
			else {
				http.send(res, errcode, "enter room failed.");
			}
		});
	});
});

app.get('/join_match', function (req, res) {
	//验证参数合法性
	var data = req.query;
	//验证玩家身份
	if (!check_account(req, res)) {
		return;
	}

	var account = data.account;

	data.account = null;
	data.sign = null;
	var index = data.index;
	var type = data.type;
	db.get_user_data(account, function (data) {
		if (data == null) {
			http.send(res, 1, "system error");
			return;
		}
		var userId = data.userid;
		var mask = data.mask ? data.mask : "";
		var name = data.name;
		var lucky = data.lucky ? data.lucky : 0;
		//验证玩家状态
		db.get_room_id_of_user(userId, function (roomId) {
			if (roomId != null) {
				http.send(res, -1, "user is playing in room now.");
				return;
			}
			//创建房间
			room_service.joinMatch(userId, type, index, data.icon, data.name, data.sex, data.ticket, function (err, roomId) {
				if (err == 0 && roomId != null) {
					room_service.enterRoom(userId, mask, name, roomId, lucky, function (errcode, enterInfo) {
						console.log("errcode ========== ", errcode, ", enterInfo ----------- ", enterInfo);
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
});

app.get('/get_match_rank', function (req, res) {
	//验证参数合法性
	var data = req.query;
	//验证玩家身份
	if (!check_account(req, res)) {
		return;
	}

	var userid = data.userid;
	var match_uuid = data.match_uuid;
	data = null;

	db.get_match_by_uuid(match_uuid, function (data) {
		if (data) {
			var info = JSON.parse(data.info);//把JSON字符串转换成对象
			var ret = {
				userid: userid,
				match_uuid: match_uuid,
				match_index: info.template.index,
				rank: info.players[userid].rank,
			};
			http.send(res, 0, "ok", ret);
		}
		else {
			http.send(res, errcode, "match doesn't exist.");
		}
	});

});
//排行榜
app.get('/get_user_rank', function (req, res) {
	var data = req.query;
	if (!check_account(req, res)) {
		return;
	}

	var type = data.type; //0金币 1房卡 2参赛卷 3积分
	var limit = data.limit; //前N名

	if (type < db.MONEY_TYPE.COINS || type > db.MONEY_TYPE.POINT) {
		type = db.MONEY_TYPE.COINS;
	}

	if (limit > 20) {
		limit = 20;
	}

	db.get_user_rank(type, limit, function (rank) {
		if (rank) {
			http.send(res, 0, "ok", { rank: rank });
		}
		else {
			http.send(res, -1, "system error");
		}
	});
});

app.get('/join_gold_game', function (req, res) {
	//验证参数合法性
	var data = req.query;
	//验证玩家身份
	if (!check_account(req, res)) {
		return;
	}

	var account = data.account;

	data.account = null;
	data.sign = null;
	var index = data.index;
	var type = data.type;
	db.get_user_data(account, function (data) {
		if (data == null) {
			http.send(res, 1, "system error");
			return;
		} else if (data.goldstate != null) {
			http.send(res, -2, "user is playing in gold room now.");
			return;
		}
		var userId = data.userid;
		var mask = data.mask ? data.mask : "";
		var name = data.name;
		var lucky = data.lucky ? data.lucky : 0;
		//验证玩家状态
		db.get_room_id_of_user(userId, function (roomId) {
			if (roomId != null) {
				http.send(res, -1, "user is playing in room now.");
				return;
			}
			//创建房间
			room_service.joinGoldGame(userId, type, index, data.icon, data.name, data.sex, data.coins, function (err, roomId) {
				if (err == 0 && roomId != null) {
					room_service.enterRoom(userId, mask, name, roomId, lucky, function (errcode, enterInfo) {
						console.log("errcode ========== ", errcode, ", enterInfo ----------- ", enterInfo);
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
});

app.get('/get_history_list', function (req, res) {
	var data = req.query;
	if (!check_account(req, res)) {
		return;
	}
	var account = data.account;
	db.get_user_data(account, function (data) {
		if (data == null) {
			http.send(res, -1, "system error");
			return;
		}
		var userId = data.userid;
		db.get_user_history(userId, function (history) {
			http.send(res, 0, "ok", { history: history });
		});
	});
});

app.get('/get_games_of_room', function (req, res) {
	var data = req.query;
	var uuid = data.uuid;
	if (uuid == null) {
		http.send(res, -1, "parameters don't match api requirements.");
		return;
	}
	if (!check_account(req, res)) {
		return;
	}
	db.get_games_of_room(uuid, function (data) {
		console.log(data);
		http.send(res, 0, "ok", { data: data });
	});
});

app.get('/get_detail_of_game', function (req, res) {
	var data = req.query;
	var uuid = data.uuid;
	var index = data.index;
	if (uuid == null || index == null) {
		http.send(res, -1, "parameters don't match api requirements.");
		return;
	}
	if (!check_account(req, res)) {
		return;
	}
	db.get_detail_of_game(uuid, index, function (data) {
		http.send(res, 0, "ok", { data: data });
	});
});

app.get('/get_user_status', function (req, res) {
	if (!check_account(req, res)) {
		return;
	}
	var account = req.query.account;
	db.get_gems(account, function (data) {
		if (data != null) {
			http.send(res, 0, "ok", { gems: data.gems });
		}
		else {
			http.send(res, 1, "get gems failed.");
		}
	});
});

app.get('/get_user_ticket', function (req, res) {
	if (!check_account(req, res)) {
		return;
	}
	var userid = req.query.userid;
	db.get_ticket(userid, function (data) {
		if (data != null) {
			http.send(res, 0, "ok", { ticket: data.ticket });
		}
		else {
			http.send(res, 1, "get ticket failed.");
		}
	});
});

app.get('/get_user_point', function (req, res) {
	if (!check_account(req, res)) {
		return;
	}
	var userid = req.query.userid;
	db.get_point(userid, function (data) {
		if (data != null) {
			http.send(res, 0, "ok", { point: data.point });
		}
		else {
			http.send(res, 1, "get point failed.");
		}
	});
});

app.get('/get_user_coins', function (req, res) {
	if (!check_account(req, res)) {
		return;
	}
	var userid = req.query.userid;
	db.get_user_coin(userid, function (data) {
		if (data != null) {
			http.send(res, 0, "ok", { coins: data.coins });
		}
		else {
			http.send(res, 1, "get point failed.");
		}
	});
});


app.get('/get_message', function (req, res) {
	console.log('client_service:get_message received!===================================')
	if (!check_account(req, res)) {
		return;
	}
	var type = req.query.type;
	if (type == null) {
		http.send(res, -1, "parameters don't match api requirements.");
		return;
	}

	var version = req.query.version;
	console.log('client_service:get_message start===================================')
	db.get_message(type, version, function (data) {
		console.log('client_service:get_message end===================================')
		console.log(data)
		if (data != null) {
			http.send(res, 0, "ok", { msg: data.msg, version: data.version });
			console.log(data.msg);
		}
		else {
			http.send(res, 1, "get message failed.");
		}
	});
});

app.get('/update_message', function (req, res) {
	if (!check_account(req, res)) {
		console.log("logon failed .");
		return;
	}
	var type = req.query.type;
	if (type == null) {
		http.send(res, -1, "parameters don't match api requirements.");
		console.log("don't match. msg");
		return;
	}

	var version = req.query.version;
	db.update_message(type, msg, version, function (data) {
		if (data != null) {
			http.send(res, 0, "ok", { type: data.type, msg: data.msg, version: data.version });
			console.log("ok to msg！");
		}
		else {
			http.send(res, 1, "update message failed.");
		}
	});
});

app.get('/is_server_online', function (req, res) {
	if (!check_account(req, res)) {
		return;
	}
	var ip = req.query.ip;
	var port = req.query.port;
	room_service.isServerOnline(ip, port, function (isonline) {
		var ret = {
			isonline: isonline
		};
		http.send(res, 0, "ok", ret);
	});
});

app.get('/bind_dealer', function (req, res) {
	if (!check_account(req, res)) {
		return;
	}
	var userid = req.query.userid;
	var pcode = req.query.pcode;

	dealerdb.get_dealer_by_pcode(pcode, function (dealer) {

		if (!dealer) {
			http.send(res, 2, "can't find the dealer");
			return;
		}
		dealerdb.check_bind_dealer(userid, function (dcb) {
			if (!dcb) {
				dealerdb.bind_dealer(userid, dealer.account, function (b) {
					if (b) {
						http.send(res, 0, "ok, bind dealer success!");
						return;
					}
				});
			} else {
				http.send(res, 1, "no,you yijing bangding guo le.");
				return;
			}
		});
	});
});

app.get('/check_bind', function (req, res) {
	if (!check_account(req, res)) {
		return;
	}
	var userid = req.query.userid;
	var pcode = req.query.pcode;

	dealerdb.check_bind_dealer(userid, function (dcb) {
		console.log('client_service:check_bind=================================', dcb)
		if (!dcb) {
			http.send(res, 2, "mast bind!");
			return;
		} else {
			http.send(res, 0, "can buy gems!");
			return;
		}
	});
});

app.get('/bind_friend', function (req, res) {
	if (!check_account(req, res)) {
		return;
	}
	var userid = req.query.userid;
	var puserid = req.query.puserid;
	db.get_friend_by_userid(userid, function (bind) {
		//说明已经绑定过
		if (bind) {
			http.send(res, 1, "no,you yijing bangding guo le!");
			return;
		} else {
			db.get_user_by_userid(puserid, function (friend) {
				//好友id存在,可以绑定
				if (friend) {
					db.bind_friend(userid, puserid, function (b) {
						if (b) {
							http.send(res, 0, "ok, bind friend success!");
							return;
						} else {
							http.send(res, 2, "can't bind the friend.");
							return;
						}
					});
				} else {
					http.send(res, 2, "can't find the friend.");
					return;
				}
			})
		}
	});
});


// http://127.0.0.1:9901/club?%protocol=1&userid=123456&data=7ba%3a123%2cb%3a%27aaaaa%27%7d
app.get('/club', function (req, res) {
	if (!check_account(req, res)) {
		return;
	}
	var protocol = req.query.protocol; //
	var userid = req.query.userid;
	var data = req.query.data;
	console.log("收到客户端发来的消息了", protocol, userid);
	clubMgr.RunProtocol(protocol, userid, data, function (err, errmsg, ret) {
		console.log("要向客户端发消息了");
		http.send(res, err, errmsg, ret);
	});
});

var seed = 0;
var list = [
	{ rmb: 1.5, gems: 1 },
	{ rmb: 7.5, gems: 5 },
	{ rmb: 15, gems: 10 },
	{ rmb: 75, gems: 50 },
];

app.get('/buy_gems', function (req, res) {
	//验证参数合法性
	var data = req.query;

	if (!check_account(req, res)) {
		return;
	}

	var userid = data.userid;
	var index = parseInt(data.index, 10);
	//购买索引
	if (index < 0 || index >= list.length) {
		http.send(res, 1, "index error");
	}

	var today = new Date();
	var year = today.getFullYear();
	var month = today.getMonth() + 1;
	var day = today.getDate();
	var hour = today.getHours();
	var min = today.getMinutes();
	var sec = today.getSeconds();


	function zfill(num, size) {
		var s = "000000000" + num;
		return s.substr(s.length - size);
	}

	var d = "{0}{1}{2}{3}{4}{5}{6}";
	var cporderid = d.format(year, zfill(month, 2), zfill(day, 2), zfill(hour, 2), zfill(min, 2), zfill(sec, 2), zfill(seed, 5));
	if ((++seed) >= 65535) seed = 0;

	var url = 'http://wangguan.qianyifu.com:8881/gateway/pay.asp?';
	var sign = 'userid={0}&orderid={1}&bankid={2}&keyvalue={3}';
	sign = sign.format(
		'51152',
		cporderid,
		'weixin-wap',
		'h4WrYHnX9fEkK7C5h6MU5KgrMcl7GTWgEk60HeTL'
	);
	sign = crypto.md5(sign);
	var parameter = 'userid={0}&orderid={1}&money={2}&hrefurl={3}&url={4}&bankid={5}&sign={6}&ext={7}';
	parameter = parameter.format(
		'51152',
		cporderid,
		list[index].rmb,
		'http://2zee7orv0k0game.52hgou.com:9001/TradingResultsNotice/',
		'http://2zee7orv0k0game.52hgou.com:9001/TradingResultsNotice/',
		'weixin-wap',
		sign,
		userid
	);

	//将信息写入数据库
	db.init_order(cporderid, userid, list[index].rmb);
	http.send(res, 0, "ok", { url: url + parameter });
});


app.get('/TradingResultsNotice', function (req, res) {

	//验证参数合法性
	var data = req.query;
	// 字段名      是否可空  参数类型  说明 
	// returncode  否  int  为1 则代表成功,其余值为失败 
	// orderid  否  string  商户系统内生成的订单号码 
	// money  否  string  订单支付金额（元） 
	// sign  否  string  签名字符串 
	// ext  是  string  原样返回商户自定义字符串 

	var returncode = data.returncode;
	var orderid = data.orderid;
	var money = data.money;
	var sign = data.sign;
	var ext = data.ext;
	var appuserid = ext;

	// var returncode = '1';
	// var orderid = '34ecce3013b44ed488d989cf1801234f';
	// var money = '1.00';
	// var sign = '157593a4c3375b892ea64651fd4adaf0';
	// var ext = '286168';
	// var appuserid = ext;

	//sign=md5(returncode={returncode}&userid={userid}&orderid={orderid}&money={money}&keyvalue={keyvalue})
	var localSign = 'returncode={0}&userid={1}&orderid={2}&money={3}&keyvalue={4}';
	localSign = localSign.format(
		returncode,
		'51152',
		orderid,
		money,
		'h4WrYHnX9fEkK7C5h6MU5KgrMcl7GTWgEk60HeTL'
	);
	localSign = crypto.md5(localSign);
	if (localSign == sign) {
		//验证通过
		if (returncode == 1 || returncode == '1') {
			db.get_order(orderid, function (mData) {
				if (mData) {
					mData.money = parseFloat(mData.money);
					money = parseFloat(money);
					if (mData.money == money) {
						//给用户增加房卡
						var gems = 0;
						for (var i = 0; i < list.length; i++) {
							if (list[i].rmb == money) {
								gems = list[i].gems;
							}
						}
						db.add_user_gems(appuserid, gems);
						// 获得用户信息
						db.get_user_data_by_userid(appuserid, function (userinfo) {
							if (userinfo) {
								//获取代理信息
								dealerdb.get_bind_dealerid_by_userid(appuserid, function (data) {
									if (data) {
										// 获得代理信息 并添加日志
										dealerdb.getDealerByAccount(data.dealerid, function (data1) {
											if (data1) {
												//添加销售记录
												dealerdb.saveGemSellLogs(money, data1.pcode, data1.account, appuserid, userinfo.name, function () {
													// 获得上级代理
													if (data1.parent) {
														dealerdb.getDealerByAccount(data1.parent, function (data2) {
															if (data2) {
																// 添加积分
																dealerdb.addDealerScore(data2.account, money);
															}
														});
													};
												});
											}
										});
									}
								});
							}
						});
						//更新数据库
						db.update_order(orderid, 0, 0);
					}
				}
			});
		}
	}
	res.send('success');
});


///////////////////牌类游戏
app.get('/enter_pass', function (req, res) {
	var uid = req.query.uid;
	var pass = req.query.pass;
	db.enter_pass(uid, pass, function (ccode) {
		if (ccode == 0) {
			http.send(res, 0, "ok");
		}
		else if (ccode == 1) {
			http.send(res, 1, "you have enter pass yet");
		} else if (ccode == 2) {
			http.send(res, 2, "you have enter a wrong passcord");
		} else if (ccode == 3) {
			http.send(res, 3, "error");
		} else if (ccode == 4) {
			http.send(res, 4, "success");
		} else {
			http.send(res, 3, "error");
		}
	})
});

app.get('/get_player_info', function (req, res) {
	var uid = req.query.uid;
	db.get_user_data_by_userid(uid, function (ret) {
		if (ret == null) {
			http.send(res, 1, "no user data");
		}
		else if (ret.length > 0) {
			http.send(res, 0, "success", ret);
		}
	})
})
app.get('/enter_game', function (req, res) {
	var uid = req.query.uid;
	var gametype = req.query.gametype;
	http.send(res, 0, "success");
});
app.get('/enter_site', function (req, res) {
	var uid = req.query.uid;
	var gametype = req.query.gametype;
	var game_level = req.query.game_level;
	//首先判断用户是不是能进这个场,就是看手里金币是不是能满足场的最低需求
	db.get_user_by_userid(uid, function (userdata) {
		if (userdata) {

		} else {
			http.send(res, 1, "don't have this user");
		}
	})

	http.send(res, 0, "success");
});

exports.start = function ($config) {
	config = $config;
	app.listen(config.CLEINT_PORT);
	console.log("client service is listening on port " + config.CLEINT_PORT);
};



app.get('/get_reward', function (req, res) {
	var data = req.query;
	if (!check_account(req, res)) {
		return;
	}
	var account = data.account;

	db.get_user_rewardtimestamp(account, function (data) {
		if (data != null) {

			var timestamp = data.rewardtimestamp;
			if (timestamp == null || isToday(timestamp * 1000) == false) {
				var gem = 1; //每日领取的1

				db.get_user_data(account, function (data) {
					if (data == null) {
						http.send(res, -1, "system error");
						return;
					}
					var userId = data.userid;
					db.add_user_gems(userId, gem, function (suc) {
						//更新时间戳
						db.update_user_rewardtimestamp(userId, Date.now() / 1000);
						http.send(res, 0, "ok", { gem: gem });
					});
				});
			} else {
				http.send(res, 1, "get reward failed. one day once");
			}
		}
		else {
			http.send(res, 1, "get reward failed.");
		}
	});
});

app.get('/get_reward_state', function (req, res) {
	var data = req.query;
	if (!check_account(req, res)) {
		return;
	}
	var account = data.account;
	db.get_user_rewardtimestamp(account, function (data) {
		if (data != null) {

			var state = 0;
			var timestamp = data.rewardtimestamp;
			if (timestamp == null || isToday(timestamp * 1000) == false) {
				state = 1;
			}
			http.send(res, 0, "ok", { state: state });
		}
		else {
			http.send(res, 1, "get rewardtimestamp failed.");
		}
	});
});

app.get('/get_math_temp', function (req, res) {
	var data = req.query;
	db.get_match_template(function (data) {
		if (data != null) {

			http.send(res, 0, "ok", data);
		}
		else {
			http.send(res, 1, "get get_math_temp failed.");
		}
	});
});

// 游戏人数信息记录(假的随机值)
var game_number = {};
var game_number_oldTimes = 0;
// 获取游戏人数
app.get('/get_game_number', function (req, res) {
	var data = req.query;
	var curTimes = Date.now(); //当前毫秒数
	var isUpdate = false;
	if (curTimes - game_number_oldTimes > 10000) {
		isUpdate = true;
		game_number_oldTimes = curTimes;
	}

	var randomRange = function (n, m) {
		var random = Math.floor(Math.random() * (m - n + 1) + n);
		return random;
	}

	var ret = [];
	for (var i = 0; i < config.GAME_LIST.length; i++) {
		if (!game_number[config.GAME_LIST[i].TYPE]) {
			game_number[config.GAME_LIST[i].TYPE] = randomRange(5000, 20000);
		}
		if (isUpdate) {
			game_number[config.GAME_LIST[i].TYPE] = randomRange(5000, 20000);
		}
		ret.push({ gametype: config.GAME_LIST[i].TYPE, num: game_number[config.GAME_LIST[i].TYPE] });
	}
	http.send(res, 0, "ok", ret);
});




var exchangeInfo = {
	appKey: "49Rfu7NWkFgSn37zj9zchoMVgUkq",
	// secret: "6d9c436d62ebedd3f16afce3396c7a72",
	appSecret: "3e2ceEBu9kkhCT6C8L3icCceDhbL",
};

/**
* 签名函数，内部包含对hshTable进行排序后的一系列处理
* @param hshTable 哈希表
* return 
*/
function Sign(hshTable) {
	var key = "";
	if (hshTable.hasOwnProperty("sign")) {
		delete hshTable["sign"];
	}
	var akeys = [];
	for (var skey in hshTable) {
		if (skey != "sign") {
			akeys.push(skey);
		}
	}
	akeys.sort(); //调用了akeys的按字母顺序进行排序Sort,  
	//akeys.Reverse();
	for (var i = 0; i < akeys.length; i++) {
		key += hshTable[akeys[i]];
	}
	var sign = md5(key);//用函数对key进行MD5签名
	return sign.toLowerCase();
}

/**
 * 拼接Url参数
 * @param url 接口地址
 * @param hshTable 参数
 * return
 */
function AssembleUrl(url, hshTable) {
	if (url.indexOf("?") < 0) {
		url += "?";
	}

	for (var key in hshTable) {
		url += key.toString() + "=" + (hshTable[key].toString()) + "&";
	}
	return url;
}

/**
* 签名验证，放入参数hshTable和密钥
* @param appSecret
* @param hshTable 其中必须包含sign参数
* @return
*/
function SignVerify(appSecret, hshTable) {
	var sign = "";
	hshTable.appSecret = appSecret;
	if (hshTable.hasOwnProperty("sign")) {
		sign = hshTable["sign"].toString().toLowerCase();
	}
	if (sign == Sign(hshTable)) {
		return true;
	} else {
		return false;
	}
}

function getCreditAutoLoginRequest(userid, ticket, os) {
	var appInfo = exchangeInfo;
	if (appInfo == null) {
		console.log("get appinfo err!!!");
		return ""
	}
	var url = "http://www.duiba.com.cn/autoLogin/autologin?";
	var uid = userid;
	var credits = ticket;
	var appKey = appInfo.appKey;
	var appSecret = appInfo.appSecret;
	var timestamp = Date.now();

	var hshTable = {};
	hshTable.uid = userid;
	hshTable.credits = ticket;
	hshTable.appKey = appInfo.appKey;
	hshTable.appSecret = appInfo.appSecret;
	hshTable.timestamp = Date.now();

	var sign1 = Sign(hshTable);
	hshTable.sign = sign1;
	//此处删除appSecret，因为appSecret不能出现在url上
	delete hshTable["appSecret"];

	// [ 'appKey', 'credits', 'redirect', 'sign', 'timestamp', 'uid' ]
	// [ 'appKey', 'appSecret', 'credits', 'redirect', 'timestamp', 'uid' ]
	// var sign = md5(appKey + appSecret + credits + timestamp + uid);

	// var msg = "uid={0}&credits={1}&appKey={2}&sign={3}&timestamp={4}";
	// msg = msg.format(uid, credits, appKey, sign, timestamp);

	return AssembleUrl(url, hshTable);;//url + msg;
}

app.get('/duiba_autologin', function (req, res) {
	var data = req.query;
	if (!check_account(req, res)) {
		return;
	}
	var account = data.account;

	var userid = req.query.userid;
	var os = req.query.os;

	db.get_user_data(account, function (userdata) {
		if (userdata == null) {
			http.send(res, -1, "system error");
			return;
		}
		db.get_point(userdata.userid, function (data) {

			var point = 0;
			if (data != null) {
				point = data.point;
			}
			var url = getCreditAutoLoginRequest(userid, point, os);
			var ret = {
				duibaUrl: url,
			};
			http.send(res, 0, "ok", ret);
		});
	});
});

app.get('/duiba_duihuan', function (req, res) {
	console.log("duiba_duihuan  duiba_duihuan!!!!!!!!!!!!!!!!!!!!!!!!!!1");
	console.log(req.query);
	// var a = {
	// 	actualPrice: '0',
	// 	ip: '106.114.193.201',
	// 	sign: '23dbf77d8f19445c54fb8de0b49cb0ab',
	// 	description: '测试专用优惠券',
	// 	orderNum: '50718932275472C0649',
	// 	waitAudit: 'false',
	// 	type: 'coupon',
	// 	params: '',
	// 	uid: '28603',
	// 	credits: '1',
	// 	facePrice: '1',
	// 	appKey: '49Rfu7NWkFgSn37zj9zchoMVgUkq',
	// 	timestamp: '1511855159688'
	// };

	var ret = {
		status: 'ok',
	};

	function zfill(num, size) {
		var s = "000000000" + num;
		return s.substr(s.length - size);
	}

	function getbizId() {
		var today = new Date();
		var year = today.getFullYear();
		var month = today.getMonth() + 1;
		var day = today.getDate();
		var hour = today.getHours();
		var min = today.getMinutes();
		var sec = today.getSeconds();

		var d = "{0}{1}{2}{3}{4}{5}{6}";
		var bizId = d.format(year, zfill(month, 2), zfill(day, 2), zfill(hour, 2), zfill(min, 2), zfill(sec, 2), zfill(seed, 5));
		if ((++seed) >= 65535) seed = 0;
		return bizId;
	}

	var verify = SignVerify(exchangeInfo.appSecret, req.query);
	if (verify == false) {
		ret.status = 'fail';
	} else {

		var userid = req.query.uid;
		var cost = req.query.credits;
		var orderNum = req.query.orderNum; //对吧订单号

		ret.bizId = getbizId();
		//添加订单记录 
		db.init_order_duiba(ret.bizId, userid, orderNum);

		db.get_point(userid, function (data) {

			var point = 0;
			if (data != null) {
				point = data.point;
				if (cost > point) {
					ret.status = "fail";
					ret.errorMessage = "金币不足！";
					res.send(JSON.stringify(ret));
				} else {
					db.cost_point(userid, cost);
					point -= cost;
					ret.status = "ok";
					ret.credits = point;
					res.send(JSON.stringify(ret));
				}
			} else {
				ret.status = 'fail';
				ret.errorMessage = "查询金币失败！";
				res.send(JSON.stringify(ret));
			}
		});
	}

});


app.get('/duiba_result', function (req, res) {
	console.log("duiba_result  duiba_result@@@@@@@@@@@@@@@@@@@@@@@@@@2");
	console.log(req.query);

	var orderNum = req.query.orderNum; //对吧订单号
	var success = req.query.success;//订单状态
	var bizId = req.query.bizId;	//开发者订单

	db.update_order_duiba(orderNum, success);
	res.send('success');
});


app.get('/duiba_xuni', function (req, res) {
	console.log("duiba_xuni  duiba_xuni#############################");
	console.log(req.query);
	var errorMessage = '无效充值类型';
	var status = 'fail';
	var params = req.query.params;
	var userid = req.query.uid;
	var supplierBizId = req.query.developBizId;

	var flagArr = ["gems", "ticket"];
	var value = 0;
	var type = "";
	var flagArr = ["gems", "ticket"];
	for (var i = 0; i < flagArr.length; i++) {
		var flag = flagArr[i];
		var index = params.indexOf(flag);
		if (index != -1) {
			type = flag;
			value = parseInt(params.substr(index + flag.length, params.length));
			break;
		}
	}

	function callFunction() {
		var ret = {
			status: status, //success成功，fail失败，process处理中
			credits: 0, //用户当前最新积分
			supplierBizId: supplierBizId, //订单流水号，开发者返回给兑吧的凭据
			errorMessage: errorMessage, // status=fail返回的失败原因,成功可不填
		}

		db.get_point(userid, function (data) {
			if (data != null) {
				ret.credits = data.point;
			}
			res.send(JSON.stringify(ret));
		});
	}
	if (value > 0) {
		errorMessage = '';
		if (type == "gems") {
			db.add_user_gems(userid, value, function (suc) {
				status = 'success';
				callFunction();
			});

		} else if (type == "ticket") {
			db.add_ticket(userid, value, function (suc) {
				status = 'success';
				callFunction();
			})
		}
	} else {
		callFunction();
	}

});

app.get('/get_recharge_config', function (req, res) {
	dealerdb.get_recharge_config(function (ret) {
		if (ret) {
			var result = {
				data: ret,
				PAY_URL: config.PAY_URL,
			}
			http.send(res, 0, "ok", result);
		} else {
			http.send(res, 1, "获取信息失败")
		}
	})

});