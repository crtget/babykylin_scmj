var http_service = require("./http_service");
var socket_service = require("./socket_service");

//从配置文件获取服务器信息
var configs = require(process.argv[2]);
var config = configs.get_game_serverinfo_by_gametype(configs.GAME_TYPE_LIST.tianshui);

var db = require('../utils/db');
db.init(configs.mysql());

var dealerdb = require('../utils/dealerdb');
dealerdb.init(configs.dealerMysql());

//开启HTTP服务
http_service.start(config);

//开启外网SOCKET服务
socket_service.start(config);

process.on('uncaughtException', function (err) {
    console.log('uncaughtException Start:');
    console.log(err);
    console.log('uncaughtException End!');
});