var crypto = require('../utils/crypto');
var express = require('express');
var db = require('../utils/db');
var http = require("../utils/http");
var room_service = require("./room_service");

var app = express();

function send(res, ret) {
	var str = JSON.stringify(ret);
	res.send(str)
}


exports.start = function (config) {
	app.listen(config.DEALDER_API_PORT, config.DEALDER_API_IP);
	console.log("dealer api is listening on " + config.DEALDER_API_IP + ":" + config.DEALDER_API_PORT);
};

//设置跨域访问
app.all('*', function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
	res.header("X-Powered-By", ' 3.2.1')
	res.header("Content-Type", "application/json;charset=utf-8");
	next();
});

app.get('/get_user_info', function (req, res) {
	var userid = req.query.userid;
	db.get_userid_by_mask(userid, function (maskData) {
		console.log(maskData);
		if (maskData && maskData.userid) {
			userid = maskData.userid;//转化userid
		}
		db.get_user_data_by_userid(userid, function (data) {
			if (data) {
				var ret = {
					userid: userid,
					name: data.name,
					gems: data.gems,
					headimg: data.headimg
				}
				http.send(res, 0, "ok", ret);
			}
			else {
				http.send(res, 1, "null");
			}
		});
	});
});

app.get('/add_user_gems', function (req, res) {
	var userid = req.query.userid;
	var gems = req.query.gems;
	db.get_userid_by_mask(userid, function (maskData) {
		console.log(maskData);
		if (maskData && maskData.userid) {
			userid = maskData.userid;//转化userid
		}
		db.add_user_gems(userid, gems, function (suc) {
			if (suc) {
				http.send(res, 0, "ok");
			}
			else {
				http.send(res, 1, "failed");
			}
		});
	});
});

app.get('/get_server_load', function (req, res) {
	var data = room_service.getServerLoad();
	http.send(res, 0, "ok", { data: data });
});

//代理商创建房间
app.get('/create_dealer_room', function (req, res) {
	var data = req.query;
	var dealer = data.dealer;
	var conf = data.conf;
	var type = data.type;

	console.log("create_dealer_room");
	console.log(data);

	//创建房间
	room_service.createDealerRoom(dealer, conf, type, function (err, roomId) {
		if (err == 0 && roomId != null) {
			// 创建成功
			console.log("createDealerRoom ok!!!!!");
			http.send(res, 0, "ok", { roomid: roomId });
		}
		else {
			// 创建失败
			console.log("createDealerRoom failed!!!!");
			console.log(err, roomId);
			http.send(res, err, "create failed.");
		}
	});


});