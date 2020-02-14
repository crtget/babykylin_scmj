var client_service = require("./client_service");
var room_service = require("./room_service");

var configs = require(process.argv[2]);
var config = configs.hall_server();

var db = require('../utils/db');
db.init(configs.mysql());
setTimeout(function () {
    //清理过期的游戏历史记录
    db.clear_games_archive();
}, 5000);


var dealerdb = require('../utils/dealerdb');
dealerdb.init(configs.dealerMysql());

// var redisdb = require('../utils/redisdb');
// redisdb.init(configs.redis());

client_service.start(config);
room_service.start(config);

var dapi = require('./dealer_api');
dapi.start(config);

process.on('uncaughtException', function (err) {
    console.log('uncaughtException Start:');
    console.log(err);
    console.log('uncaughtException End!');
});