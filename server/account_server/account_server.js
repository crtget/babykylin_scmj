var crypto = require('../utils/crypto');
var express = require('express');
var db = require('../utils/db');
var http = require("../utils/http");

var app = express();
var hallAddr = "";

function send(res, ret) {
	var str = JSON.stringify(ret);
	res.send(str)
}

var config = null;

exports.start = function (cfg) {
	config = cfg;
	hallAddr = config.HALL_IP + ":" + config.HALL_CLIENT_PORT;
	app.listen(config.CLIENT_PORT);
	console.log("account server is listening on " + config.CLIENT_PORT);
}





//设置跨域访问
app.all('*', function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
	res.header("X-Powered-By", ' 3.2.1')
	res.header("Content-Type", "application/json;charset=utf-8");
	next();
});

app.get('/register', function (req, res) {
	var account = req.query.account;
	var password = req.query.password;

	var fnFailed = function () {
		send(res, { errcode: 1, errmsg: "account has been used." });
	};

	var fnSucceed = function () {
		send(res, { errcode: 0, errmsg: "ok" });
	};

	db.is_user_exist(account, function (exist) {
		if (exist) {
			db.create_account(account, password, function (ret) {
				if (ret) {
					fnSucceed();
				}
				else {
					fnFailed();
				}
			});
		}
		else {
			fnFailed();
			console.log("account has been used.");
		}
	});
});

app.get('/get_version', function (req, res) {
	var ret = {
		version: config.VERSION,
	}

	send(res, ret);
});

app.get('/get_serverinfo', function (req, res) {
	var ret = {
		version: config.VERSION,
		hall: hallAddr,
		appweb: config.APP_WEB,
		pay_url: config.PAY_URL,
		gameList: config.GAME_LIST,
		clubGameList: config.CLUB_GAME_LIST,
	}
	send(res, ret);
});

app.get('/guest', function (req, res) {
	var account = "guest_" + req.query.account;
	var sign = crypto.md5(account + req.ip + config.ACCOUNT_PRI_KEY);
	var ret = {
		errcode: 0,
		errmsg: "ok",
		account: account,
		halladdr: hallAddr,
		sign: sign
	}
	
	send(res, ret);
});

app.get('/auth', function (req, res) {
	var account = req.query.account;
	var password = req.query.password;

	db.get_account_info(account, password, function (info) {
		if (info == null) {
			send(res, { errcode: 1, errmsg: "invalid account" });
			return;
		}

		var account = "vivi_" + req.query.account;
		var sign = get_md5(account + req.ip + config.ACCOUNT_PRI_KEY);
		var ret = {
			errcode: 0,
			errmsg: "ok",
			account: account,
			sign: sign
		}
		send(res, ret);
	});
});

var appInfo = {
	Android: {
		appid: "wx7e53bd15ad5c7171",
		secret: "1ae133e809103885b943d5082135d36b",
	},
	iOS: {
		appid: "wx7e53bd15ad5c7171",
		secret: "1ae133e809103885b943d5082135d36b",
	}
};

function get_access_token(code, os, callback) {
	var info = appInfo[os];
	if (info == null) {
		callback(false, null);
	}
	var data = {
		appid: info.appid,
		secret: info.secret,
		code: code,
		grant_type: "authorization_code"
	};

	http.get2("https://api.weixin.qq.com/sns/oauth2/access_token", data, callback, true);
}

function get_state_info(access_token, openid, callback) {
	var data = {
		access_token: access_token,
		openid: openid
	};

	http.get2("https://api.weixin.qq.com/sns/userinfo", data, callback, true);
}

function create_user(account, name, sex, headimgurl, callback) {
	var coins = 1000;
	var gems = 6;
	db.is_user_exist(account, function (ret) {
		if (!ret) {
			db.create_user(account, name, coins, gems, sex, headimgurl, function (ret) {
				callback();
			});
		}
		else {
			db.update_user_info(account, name, headimgurl, sex, function (ret) {
				callback();
			});
		}
	});
};
app.get('/wechat_auth', function (req, res) {
	var code = req.query.code;
	var os = req.query.os;

	if (os == null || os == "") {
		os = "unknow";
	}
	if (code == null || code == "" || os == null || os == "") {
		return;
	}
	console.log("code=", code, "    os=", os);
	get_access_token(code, os, function (suc, data) {
		if (suc) {
			var access_token = data.access_token;
			var openid = data.openid;
			var unionid = data.unionid;
			console.log("data");
			console.log(data);
			get_state_info(access_token, unionid, function (suc2, data2) {
				if (suc2) {
					var openid = data2.openid;
					var unionid = data2.unionid;
					var nickname = data2.nickname;
					var sex = data2.sex;
					var headimgurl = data2.headimgurl;
					var account = "wx_" + unionid;
					console.log("data2");
					console.log(data2);
					create_user(account, nickname, sex, headimgurl, function () {
						var sign = crypto.md5(account + req.ip + config.ACCOUNT_PRI_KEY);
						var ret = {
							errcode: 0,
							errmsg: "ok",
							account: account,
							halladdr: hallAddr,
							sign: sign
						};
						send(res, ret);
					});
				}
			});
		}
		else {
			send(res, { errcode: -1, errmsg: "unkown err." });
		}
	});
});

app.get('/base_info', function (req, res) {
	var userid = req.query.userid;
	db.get_user_base_info(userid, function (data) {
		var ret = {
			errcode: 0,
			errmsg: "ok",
			name: data.name,
			sex: data.sex,
			headimgurl: data.headimg
		};
		send(res, ret);
	});
});

app.get('/get_cardlibrary_list', function (req, res) {
	var data = req.query;
	db.get_all_card_library(function (infos) {
		var library = [];
        for (var i = 0; i < infos.length; i++) {
            var info = infos[i];

            library.push({
                id: info.id,
                gametype: info.gametype,
                level: info.level,
                config: info.config,
                content: info.content,
                notes: info.notes,
            })
        }
		
		var ret = {
			errcode: 0,
			errmsg: "ok",
			library:library,
		};
		send(res, ret);
    });
});

app.get('/add_cardlibrary', function (req, res) {
	var data = req.query;
	var gametype = data.gametype;
	var level = data.level;
	var config = data.config;
	var content = data.content;
	var notes = data.notes;
	db.insert_card_library(gametype, level, config, content, notes,function (ret) {
		
		var obj = {
			errcode: 0,
			errmsg: "ok",
		};
		if (ret == false) {
			obj.errcode = 1;
			obj.errmsg = "save failed";
		}
		send(res, obj);
    });
});


app.get('/del_cardlibrary', function (req, res) {
	var data = req.query;
	var id = data.id;
	
	db.del_card_library(id, function (ret) {
		
		var obj = {
			errcode: 0,
			errmsg: "ok",
		};
		if (ret == false) {
			obj.errcode = 1;
			obj.errmsg = "del failed";
		}else{
			obj.id = id;
		}
		send(res, obj);
    });
});