var crypto = require("../utils/crypto");

var tokens = {};
var users = {};

exports.createToken = function(userid,lifeTime){
	var token = users[userid];
	if(token != null){
		this.delToken(token);
	}

	var time = Date.now();
	token = crypto.md5(userid + "!@#$%^&" + time);
	tokens[token] = {
		userid: userid,
		time: time,
		lifeTime: lifeTime
	};
	users[userid] = token;
	return token;
};

exports.getToken = function(userid){
	return users[userid];
};

exports.getUserID = function(token){
	return tokens[token].userid;
};

exports.isTokenValid = function(token){
	var info = tokens[token];
	if(info == null){
		return false;
	}
	if(info.time + info.lifetime < Date.now()){
		return false;
	}
	return true;
};

exports.delToken = function(token){
	var info = tokens[token];
	if(info != null){
		tokens[token] = null;
		users[info.userid] = null;
	}
};