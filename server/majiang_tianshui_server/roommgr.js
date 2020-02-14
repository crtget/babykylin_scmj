var db = require('../utils/db');

var rooms = {};
//20分钟未开始自动解散
var ROOM_IDLE_ENDTIME_TIME = 1200;
var idleRooms = {};
var creatingRooms = {};

var userLocation = {};
var totalRooms = 0;
var deleteRoom = [];
var DI_FEN = [1, 2, 5, 10];
var QUAN = [1, 2, 3, 4];
var MAX_FAN = [3, 4, 5];

var JU_SHU = [4, 8, 16];
var JU_SHU_COST = [2, 3, 6];
var JU_SHU_COST_AA = [1, 1, 2]; //AA开房，房卡消耗数量
var REN_SHU = [3, 4];
var JINBI_SHU = [20, 50, 100];

function generateRoomId() {
	var roomId = "";
	for (var i = 0; i < 6; ++i) {
		roomId += Math.floor(Math.random() * 10);
	}
	return roomId;
}
exports.addDeleteRoom = function (roomId) {
	deleteRoom.push(roomId);
}
exports.delDeleteRoom = function (roomId) {
	var i = deleteRoom.indexOf(roomId);
	deleteRoom.push(i);
}
function constructRoomFromDb(dbdata) {
	var roomInfo = {
		uuid: dbdata.uuid,
		id: dbdata.id,
		gametype: dbdata.type,
		numOfGames: dbdata.num_of_turns,
		numOfSaveGames: dbdata.numOfSaveGames,
		createTime: dbdata.create_time,
		idleEndTime: dbdata.idle_end_time,
		nextButton: dbdata.next_button,
		seats: new Array(dbdata.base_info.renshuxuanze),
		conf: JSON.parse(dbdata.base_info),
		dealer: dbdata.dealer,
		clubid: dbdata.clubid,
	};

	roomInfo.gameMgr = require("./gamemgr");
	var roomId = roomInfo.id;

	for (var i = 0; i < roomInfo.conf.renshuxuanze; ++i) {
		var s = roomInfo.seats[i] = {};
		s.userId = dbdata["user_id" + i];
		s.score = dbdata["user_score" + i];
		s.name = dbdata["user_name" + i];
		s.ready = false;
		s.seatIndex = i;
		s.zimoNum = 0;
		s.numHu = 0;
		s.minggangNum = 0;
		s.angangNum = 0;
		s.fangpaoNum = 0;
		s.lat = 0;
		s.lng = 0;

		if (s.userId > 0) {
			userLocation[s.userId] = {
				roomId: roomId,
				seatIndex: i
			};
		}
	}
	if (!rooms[roomId]) totalRooms++;
	rooms[roomId] = roomInfo;

	//未开始
	if (roomInfo.numOfGames == 0) {
		console.log("restart check idle ro0m endtion:" + roomInfo.id + " idleEndTime:" + roomInfo.idleEndTime);
		exports.addIdleRoom(roomInfo.id, roomInfo.idleEndTime);
	}

	return roomInfo;
}



exports.createRoom = function (creator, roomConf, gems, ip, port, gametype, dealer, callback) {

	roomConf.dengtuibaozhuang = 0;
	roomConf.baoting = 0;
	


	if (

		roomConf.jushuxuanze == null//局数选择
		|| roomConf.feng == null //0不带风 1带风
		|| roomConf.qidui == null //七小对
		|| roomConf.qingyise == null //清一色
		|| roomConf.renshuxuanze == null //人数选择
		|| roomConf.liuzhuang == null	// 1流局庄坐庄 0 流局下家坐庄	
		|| roomConf.kouzuan == null		//扣钻选择	 0 房主扣钻 1 每人扣钻
		|| roomConf.dengtuibaozhuang == null //1蹬腿算包庄(听牌失败)  0 蹬腿不算包庄(听牌成功)
		|| roomConf.baoting == null //是否需要报听  1报听后打出一张废牌系统自动出牌不可换牌  0不用报听可随意换牌
	) {
		callback(1, null);
		return;
	}

	roomConf.jushuxuanze = parseInt(roomConf.jushuxuanze);
	roomConf.feng = parseInt(roomConf.feng);
	roomConf.qidui = parseInt(roomConf.qidui);
	roomConf.qingyise = parseInt(roomConf.qingyise);
	roomConf.renshuxuanze = parseInt(roomConf.renshuxuanze);
	roomConf.liuzhuang = parseInt(roomConf.liuzhuang);
	roomConf.kouzuan = parseInt(roomConf.kouzuan);
	roomConf.dengtuibaozhuang = parseInt(roomConf.dengtuibaozhuang);
	roomConf.baoting = parseInt(roomConf.baoting);

	var renshucount = REN_SHU[roomConf.renshuxuanze];

	var cost = 0;
	if (roomConf.kouzuan == 0) {
		//房主扣房卡
		cost = JU_SHU_COST[roomConf.jushuxuanze];
		if (cost > gems) {
			callback(2222, null);
			return;
		}
	}
	else if (roomConf.kouzuan == 1) {
		//AA扣房卡
		cost = JU_SHU_COST_AA[roomConf.jushuxuanze];
		if (cost > gems) {
			callback(2222, null);
			return;
		}
	}
	else {
		callback(1, null);
	}

	var score_num = 0;

	// roomConf.gold = 0;

	if (roomConf.gold != null) {
		score_num = JINBI_SHU[roomConf.gold];
	}

	var fnCreate = function () {
		var roomId = generateRoomId();
		if (rooms[roomId] != null || creatingRooms[roomId] != null) {
			fnCreate();
		}
		else {
			creatingRooms[roomId] = true;
			db.is_room_exist(roomId, function (ret) {

				if (ret) {
					delete creatingRooms[roomId];
					fnCreate();
				}
				else {
					var createTime = Math.ceil(Date.now() / 1000);
					var roomInfo = {
						uuid: "",
						id: roomId,
						gametype: gametype,//大游戏类型，如衡水麻将，牛牛，十三水
						dealer: dealer,
						numOfGames: 0,
						numOfSaveGames: 0,
						createTime: createTime,
						idleEndTime: createTime + ROOM_IDLE_ENDTIME_TIME,//300000
						nextButton: 0,
						seats: [],
						conf: {
							gametype: gametype,
							type: roomConf.type,
							difen: DI_FEN[roomConf.difen],
							cost: cost,
							baseScore: 1,
							feng: roomConf.feng,
							qidui: roomConf.qidui,
							qingyise: roomConf.qingyise,
							liuzhuang: roomConf.liuzhuang,
							dengtuibaozhuang: roomConf.dengtuibaozhuang,
							baoting: roomConf.baoting,
							maxFan: 8,//MAX_FAN[roomConf.zuidafanshu],
							renshuxuanze: renshucount,
							kouzuan: parseInt(roomConf.kouzuan),
							creator: creator,
							zhuang: -1,
							isZhuangHu: false,
							maxGames: JU_SHU[roomConf.jushuxuanze],
							realNumOfGames: 0,
							gold: roomConf.gold,
							isGameOver: false,
						}
					};

					roomInfo.gameMgr = require("./gamemgr");
					console.log(roomInfo.conf);

					for (var i = 0; i < roomInfo.conf.renshuxuanze; ++i) {
						roomInfo.seats.push({
							userId: 0,
							score: score_num,
							name: "",
							lucky: 0,
							ready: false,
							seatIndex: i,
							numHu: 0,
							maxScore: 0,
							minggangNum: 0,
							angangNum: 0,
							fangpaoNum: 0,
							zimoNum: 0,
							lat: 0,
							lng: 0
						});
					}


					//写入数据库
					var conf = roomInfo.conf;
					db.create_room(roomInfo.id, roomInfo.conf, ip, port, createTime, gametype, dealer, function (uuid) {
						delete creatingRooms[roomId];
						if (uuid != null) {
							roomInfo.uuid = uuid;
							console.log(uuid);
							rooms[roomId] = roomInfo;

							//等待时长 时间到了未开始解散房间
							var idleTime = roomInfo.createTime + ROOM_IDLE_ENDTIME_TIME;//300000;
							roomInfo.idleEndTime = idleTime;
							exports.addIdleRoom(roomId, idleTime);

							totalRooms++;
							callback(0, roomId);
						}
						else {
							callback(3, null);
						}
					});
				}
			});
		}
	}

	fnCreate();
};

exports.createClubRoom = function (creator, roomConf, gems, dealergems, ip, port, gametype, dealer, clubId, callback) {
	if (

		roomConf.jushuxuanze == null//局数选择
		|| roomConf.feng == null //0不带风 1带风
		|| roomConf.qidui == null
		|| roomConf.qingyise == null
		|| roomConf.renshuxuanze == null
		|| roomConf.liuzhuang == null	// 1流局庄坐庄 0 流局下家坐庄
		|| roomConf.kouzuan == null		//扣钻选择	 0 房主扣钻 1 每人扣钻
		|| roomConf.dengtuibaozhuang == null //1蹬腿算包庄(听牌失败)  0 蹬腿不算包庄(听牌成功)
		|| roomConf.baoting == null //是否需要报听  1报听后打出一张废牌系统自动出牌不可换牌  0不用报听可随意换牌
	) {
		callback(1, null);
		return;
	}

	roomConf.jushuxuanze = parseInt(roomConf.jushuxuanze);
	roomConf.feng = parseInt(roomConf.feng);
	roomConf.qidui = parseInt(roomConf.qidui);
	roomConf.qingyise = parseInt(roomConf.qingyise);
	roomConf.renshuxuanze = parseInt(roomConf.renshuxuanze);
	roomConf.liuzhuang = parseInt(roomConf.liuzhuang);
	roomConf.kouzuan = parseInt(roomConf.kouzuan);
	roomConf.dengtuibaozhuang = parseInt(roomConf.dengtuibaozhuang);
	roomConf.baoting = parseInt(roomConf.baoting);

	var renshucount = REN_SHU[roomConf.renshuxuanze];

	var cost = 0;
	if (roomConf.kouzuan == 0) {
		//房主扣房卡
		cost = JU_SHU_COST[roomConf.jushuxuanze];
		if (cost > dealergems) {
			callback(2222, null);
			return;
		}
	}
	else if (roomConf.kouzuan == 1) {
		//AA扣房卡
		cost = JU_SHU_COST_AA[roomConf.jushuxuanze];
		if (cost > gems) {
			callback(2222, null);
			return;
		}
	}
	else {
		callback(1, null);
	}

	var fnCreate = function () {
		var roomId = generateRoomId();
		if (rooms[roomId] != null || creatingRooms[roomId] != null) {
			fnCreate();
		}
		else {
			creatingRooms[roomId] = true;
			db.is_room_exist(roomId, function (ret) {

				if (ret) {
					delete creatingRooms[roomId];
					fnCreate();
				}
				else {
					var createTime = Math.ceil(Date.now() / 1000);
					var roomInfo = {
						uuid: "",
						id: roomId,
						gametype: gametype,//大游戏类型，如衡水麻将，牛牛，十三水
						dealer: dealer,
						numOfGames: 0,
						numOfSaveGames: 0,
						createTime: createTime,
						idleEndTime: createTime + ROOM_IDLE_ENDTIME_TIME,//300000
						nextButton: 0,
						seats: [],
						conf: {
							gametype: gametype,
							type: roomConf.type,
							difen: DI_FEN[roomConf.difen],
							cost: cost,
							baseScore: 1,
							feng: roomConf.feng,
							qidui: roomConf.qidui,
							qingyise: roomConf.qingyise,
							liuzhuang: roomConf.liuzhuang,
							dengtuibaozhuang: roomConf.dengtuibaozhuang,
							baoting: roomConf.baoting,
							maxFan: 8,//MAX_FAN[roomConf.zuidafanshu],
							renshuxuanze: renshucount,
							kouzuan: parseInt(roomConf.kouzuan),
							creator: creator,
							zhuang: -1,
							isZhuangHu: false,
							maxGames: JU_SHU[roomConf.jushuxuanze],
							realNumOfGames: 0,
						},
						clubid: clubId,
					};

					roomInfo.gameMgr = require("./gamemgr");
					console.log(roomInfo.conf);

					for (var i = 0; i < roomInfo.conf.renshuxuanze; ++i) {
						roomInfo.seats.push({
							userId: 0,
							score: 0,
							name: "",
							lucky: 0,
							ready: false,
							seatIndex: i,
							numHu: 0,
							maxScore: 0,
							minggangNum: 0,
							angangNum: 0,
							fangpaoNum: 0,
							zimoNum: 0,
							lat: 0,
							lng: 0
						});
					}


					//写入数据库
					var conf = roomInfo.conf;
					db.create_club_room(roomInfo.id, roomInfo.conf, ip, port, createTime, gametype, dealer, clubId, function (uuid) {
						delete creatingRooms[roomId];
						if (uuid != null) {
							roomInfo.uuid = uuid;
							console.log(uuid);
							rooms[roomId] = roomInfo;

							//等待时长 时间到了未开始解散房间
							var idleTime = roomInfo.createTime + ROOM_IDLE_ENDTIME_TIME;//300000;
							roomInfo.idleEndTime = idleTime;
							exports.addIdleRoom(roomId, idleTime);

							totalRooms++;
							callback(0, roomId);
						}
						else {
							callback(3, null);
						}
					});
				}
			});
		}
	}

	fnCreate();
};

exports.destroy = function (roomId) {
	var roomInfo = rooms[roomId];
	if (roomInfo == null) {
		return;
	}

	for (var i = 0; i < roomInfo.conf.renshuxuanze; ++i) {
		var userId = roomInfo.seats[i].userId;
		if (userId > 0) {
			delete userLocation[userId];
			db.set_room_id_of_user(userId, null);
		}
	}

	exports.delIdleRoom(roomId);
	delete rooms[roomId];
	totalRooms--;
	db.delete_room(roomId);
}

exports.getTotalRooms = function () {
	return totalRooms;
}

exports.getRoom = function (roomId) {
	return rooms[roomId];
};

exports.isCreator = function (roomId, userId) {
	var roomInfo = rooms[roomId];
	if (roomInfo == null) {
		return false;
	}
	return roomInfo.conf.creator == userId;
};

exports.isAllReady = function (roomId) {

	var room = rooms[roomId];
	if (room == null) {
		return 1;
	}

	var readynum = 0;
	for (var i = 0; i < room.seats.length; ++i) {
		var s = room.seats[i];
		if (s.userId > 0) {
			if (s.ready == false) {
				return false;
			}
			readynum++;
		}
	}
	if (readynum == room.conf.renshuxuanze) {
		return true;
	}
	return false;

}

exports.enterRoom = function (roomId, userId, userName, gems, lucky, callback) {

	var fnTakeSeat = function (room) {
		if (exports.getUserRoom(userId) == roomId) {
			//已存在
			return 0;
		}

		var roomInfo = room;
		if (roomInfo.conf.kouzuan == 1) {  //每人支付
			if (roomInfo.conf.cost > gems) {
				//房卡不足
				return 3;
			}
		}

		for (var i = 0; i < roomInfo.conf.renshuxuanze; ++i) {
			var seat = room.seats[i];
			if (seat.userId <= 0) {
				seat.userId = userId;
				seat.name = userName;
				seat.lucky = lucky ? lucky : 0;
				userLocation[userId] = {
					roomId: roomId,
					seatIndex: i
				};
				db.update_seat_info(roomId, i, seat.userId, "", seat.name);
				//正常
				return 0;
			}
		}
		//房间已满
		return 1;
	}
	var room = rooms[roomId];
	if (room && deleteRoom.indexOf(roomId) < 0) {
		var ret = fnTakeSeat(room);
		callback(ret);
	}
	else {
		db.get_room_data(roomId, function (dbdata) {
			if (dbdata == null) {
				//找不到房间
				callback(2);
			}
			else {
				//construct room.
				room = constructRoomFromDb(dbdata);
				//
				var ret = fnTakeSeat(room);
				callback(ret);
			}
		});
	}
};

exports.setReady = function (userId, value) {
	var roomId = exports.getUserRoom(userId);
	if (roomId == null) {
		return;
	}

	var room = exports.getRoom(roomId);
	if (room == null) {
		return;
	}

	var seatIndex = exports.getUserSeat(userId);
	if (seatIndex == null) {
		return;
	}

	var s = room.seats[seatIndex];
	s.ready = value;

	if (room.conf.creator == userId && room.conf.zhuang == -1) {
		room.conf.zhuang = seatIndex;
	}
}

exports.isReady = function (userId) {
	var roomId = exports.getUserRoom(userId);
	if (roomId == null) {
		return;
	}

	var room = exports.getRoom(roomId);
	if (room == null) {
		return;
	}

	var seatIndex = exports.getUserSeat(userId);
	if (seatIndex == null) {
		return;
	}

	var s = room.seats[seatIndex];
	return s.ready;
}


exports.getUserRoom = function (userId) {
	var location = userLocation[userId];
	if (location != null) {
		return location.roomId;
	}
	return null;
};

exports.getUserSeat = function (userId) {
	var location = userLocation[userId];
	//console.log(userLocation[userId]);
	if (location != null) {
		return location.seatIndex;
	}
	return null;
};

exports.getUserLocations = function () {
	return userLocation;
};

exports.exitRoom = function (userId) {
	var location = userLocation[userId];
	if (location == null)
		return;

	var roomId = location.roomId;
	var seatIndex = location.seatIndex;
	var room = rooms[roomId];
	delete userLocation[userId];
	if (room == null || seatIndex == null) {
		return;
	}

	var seat = room.seats[seatIndex];
	seat.userId = 0;
	seat.name = "";
	seat.ready = false;
	seat.lucky = 0;

	var numOfPlayers = 0;
	for (var i = 0; i < room.seats.length; ++i) {
		if (room.seats[i].userId > 0) {
			numOfPlayers++;
		}
	}

	db.set_room_id_of_user(userId, null);

	// if (numOfPlayers == 0) {
	// 	exports.destroy(roomId);
	// }
	if (numOfPlayers == 0) {
		exports.destroy(roomId);
	}
	else {
		db.update_seat_info(roomId, seatIndex, 0, "", "");
	}
};


exports.addIdleRoom = function (roomId, idleTime) {
	idleRooms[roomId] = true;
	if (idleTime) {
		db.update_idle_endtime(roomId, idleTime);
	}
};

exports.delIdleRoom = function (roomId) {
	if (idleRooms[roomId] == null) {
		return;
	}
	if (roomId) {
		db.update_idle_endtime(roomId, 0);
	}
	delete idleRooms[roomId];
};

exports.getIdleRooms = function () {
	return idleRooms;
};


exports.setPosition = function (userId, lat, lng) {
	var roomId = exports.getUserRoom(userId);
	if (roomId == null) {
		return;
	}

	var room = exports.getRoom(roomId);
	if (room == null) {
		return;
	}

	var seatIndex = exports.getUserSeat(userId);
	if (seatIndex == null) {
		return;
	}

	var s = room.seats[seatIndex];
	s.lat = lat;
	s.lng = lng;
};
exports.getAllPosition = function (userId) {
	var roomId = exports.getUserRoom(userId);
	if (roomId == null) {
		return;
	}

	var roomInfo = exports.getRoom(roomId);
	if (roomInfo == null) {
		return;
	}
	var arr = [];
	for (var i = 0; i < roomInfo.seats.length; ++i) {
		var seatData = roomInfo.seats[i];
		if (seatData.userId > 0) {
			arr.push({ seatIndex: i, userId: seatData.userId, lat: seatData.lat, lng: seatData.lng, ishow: true });
		}
	}
	return arr;
};
