var crypto = require('../utils/crypto');
var db = require('../utils/db');

var tokenMgr = require('./tokenmgr');
var clubMgr = require('./clubmgr');
var userMgr = require('./usermgr');
var io = null;
exports.start = function (config, mgr) {
	io = require('socket.io')(config.CLIENT_PORT);

	io.sockets.on('connection', function (socket) {
		//登录服务器
		socket.on('login', function (data) {
			data = JSON.parse(data);
			if (socket.userid != null) {
				//已经登陆过的就忽略
				return;
			}
			var userid = data.userid;
			var account = data.account;
			var sign = data.sign;

			//检查参数合法性
			if (userid == null || account == null || sign == null) {
				socket.emit('login_result', { errcode: 1, errmsg: "invalid parameters" });
				return;
			}

			//检查参数是否被篡改
			var md5 = crypto.md5(userid.toString() + account.toString());
			if (md5 != sign) {
				socket.emit('login_result', { errcode: 2, errmsg: "login failed. invalid sign!" });
				return;
			}

			//获取玩家俱乐部列表
			var clubid_list = clubMgr.getUserClubList(userid);
			//获取IP
			var ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;

			//先删除之前的
			var old_socket = userMgr.get(userid);
			if (old_socket) {
				old_socket.userid = null;
				userMgr.del(userid);
			}

			userMgr.bind(userid, socket);
			socket.userid = userid;

			//通知前端
			var ret = {
				errcode: 0,
				errmsg: "ok",
				data: {
					clubid_list: clubid_list,
				}
			};
			socket.emit('login_result', ret);

			//玩家基础信息
			var userData = {

			}
			//通知俱乐部里的其他玩家
			for (var i = 0; i < clubid_list.length; i++) {
				userMgr.broacastInClub('new_user_comes_push', userData, clubid_list[i]);
			}

		});

		//创建俱乐部
		socket.on('create_club', function (data) {
			data = JSON.parse(data);
			if (socket.userid != null) {
				//已经登陆过的就忽略
				return;
			}
			var userid = data.userid;
			var account = data.account;
			var sign = data.sign;

			var ticktid = data.ticktid; //创建俱乐部的票号

			//检查参数合法性
			if (userid == null || account == null || sign == null) {
				socket.emit('create_club', { errcode: 1, errmsg: "invalid parameters" });
				return;
			}

			//检查参数是否被篡改
			var md5 = crypto.md5(userid.toString() + account.toString());
			if (md5 != sign) {
				socket.emit('create_club', { errcode: 2, errmsg: "create failed. invalid sign!" });
				return;
			}

			//
			db.get_user_data_by_userid(userid, function (userData) {
				if (userData) {
					clubMgr.create_club(userid, userData.name, userData.sex, ticktid, function (clubid) {
						if (clubid) {
							var ret = {
								errcode: 0,
								errmsg: "ok",
								data: {
									clubid: clubid,
								}
							};
							socket.emit('create_club', ret);
						}
						else {
							socket.emit('create_club', { errcode: 4, errmsg: "create fail" });
						}
					});
				}
				else {
					socket.emit('create_club', { errcode: 3, errmsg: "can not find the userinfo" });
				}

			});
		});

		//申请加入
		socket.on('join_club', function (data) {
			data = JSON.parse(data);
			if (socket.userid != null) {
				//已经登陆过的就忽略
				return;
			}
			var userid = data.userid;
			var account = data.account;
			var sign = data.sign;

			var ticktid = data.ticktid; //创建俱乐部的票号

			//检查参数合法性
			if (userid == null || account == null || sign == null) {
				socket.emit('join_club', { errcode: 1, errmsg: "invalid parameters" });
				return;
			}

			//检查参数是否被篡改
			var md5 = crypto.md5(userid.toString() + account.toString());
			if (md5 != sign) {
				socket.emit('join_club', { errcode: 2, errmsg: "login failed. invalid sign!" });
				return;
			}

			//
			db.get_user_data_by_userid(userid, function (userData) {
				if (userData) {
					clubMgr.join_club(userid, userData.name, userData.sex);
					var ret = {
						errcode: 0,
						errmsg: "ok",
					};
					socket.emit('join_club', ret);
				}
				else {
					socket.emit('join_club', { errcode: 3, errmsg: "can not find the userinfo" });
				}
			});

		});

		//会长处理申请加入申请
		socket.on('join_club', function (data) {
			data = JSON.parse(data);
			if (socket.userid != null) {
				//已经登陆过的就忽略
				return;
			}
			var userid = data.userid;
			var account = data.account;
			var sign = data.sign;

			var ticktid = data.ticktid; //创建俱乐部的票号

			//检查参数合法性
			if (userid == null || account == null || sign == null) {
				socket.emit('join_club', { errcode: 1, errmsg: "invalid parameters" });
				return;
			}

			//检查参数是否被篡改
			var md5 = crypto.md5(userid.toString() + account.toString());
			if (md5 != sign) {
				socket.emit('join_club', { errcode: 2, errmsg: "login failed. invalid sign!" });
				return;
			}

			//
			db.get_user_data_by_userid(userid, function (userData) {
				if (userData) {
					clubMgr.join_club(userid, userData.name, userData.sex);
					var ret = {
						errcode: 0,
						errmsg: "ok",
					};
					socket.emit('join_club', ret);
				}
				else {
					socket.emit('join_club', { errcode: 3, errmsg: "can not find the userinfo" });
				}
			});

		});


		//聊天
		socket.on('chat', function (data) {
			if (socket.userid == null) {
				return;
			}
			var chatContent = data;
			userMgr.broacastInRoom('chat_push', { sender: socket.userid, content: chatContent }, socket.userid, true);
		});

		//快速聊天
		socket.on('quick_chat', function (data) {
			if (socket.userid == null) {
				return;
			}
			var chatId = data;
			userMgr.broacastInRoom('quick_chat_push', { sender: socket.userid, content: chatId }, socket.userid, true);
		});

		//语音聊天
		socket.on('voice_msg', function (data) {
			if (socket.userid == null) {
				return;
			}
			userMgr.broacastInRoom('voice_msg_push', { sender: socket.userid, content: data }, socket.userid, true);
		});

		//表情
		socket.on('emoji', function (data) {
			if (socket.userid == null) {
				return;
			}
			var phizId = data;
			userMgr.broacastInRoom('emoji_push', { sender: socket.userid, content: phizId }, socket.userid, true);
		});

		//语音使用SDK不出现在这里

		//退出房间
		socket.on('exit', function (data) {
			var userid = socket.userid;
			if (userid == null) {
				return;
			}

			var roomId = clubMgr.getUserRoom(userid);
			if (roomId == null) {
				return;
			}

			//如果游戏已经开始，则不可以
			if (socket.gameMgr.hasBegan(roomId)) {
				return;
			}

			//如果是房主，则只能走解散房间
			if (clubMgr.isCreator(userid)) {
				return;
			}

			//通知其它玩家，有人退出了房间
			userMgr.broacastInRoom('exit_notify_push', userid, userid, false);

			clubMgr.exitRoom(userid);
			userMgr.del(userid);

			socket.emit('exit_result');
			socket.disconnect();
		});

		//断开链接
		socket.on('disconnect', function (data) {
			var userid = socket.userid;
			if (!userid) {
				return;
			}
			var data = {
				userid: userid,
				online: false
			};

			//通知房间内其它玩家
			userMgr.broacastInRoom('user_state_push', data, userid, true);

			//清除玩家的在线信息
			userMgr.del(userid);
			socket.userid = null;
			delete socket;
		});

		socket.on('game_ping', function (data) {
			var userid = socket.userid;
			if (!userid) {
				return;
			}
			//console.log('game_ping');
			socket.emit('game_pong');
		});

	});

	console.log("game server is listening on " + config.CLIENT_PORT);
};