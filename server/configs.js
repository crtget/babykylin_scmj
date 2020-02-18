//var HALL_IP = "gameip.wanyuenet.cn";
var HALL_IP = "certer.vicp.net";
var HALL_CLIENT_PORT = 9901;
var HALL_ROOM_PORT = 9902;

var ACCOUNT_PRI_KEY = "C4A09632FEACBAA8DC74C1A7457C3D922AE8C4CD";
var ROOM_PRI_KEY = "83C0DF2E912ED50C7D798A64805ED6EC";

var LOCAL_IP = 'localhost';

//H5支付URL 后面需要拼接参数才可正确使用
var PAY_URL = "http://www.hbpaijiu.com/app/clientpay.php";

var GAME_TYPE_LIST = {
	//房卡麻将类游戏
	tianshui: 1, //天水麻将  (石家庄麻将)
	sichuan: 2, //四川麻将
	handan: 3, //邯郸麻将    (推倒胡)
	tangshan: 4, //唐山麻将
	baoding: 5, //保定麻将
	zhangjiakou: 6, //张家口
	quyang: 7, //曲阳
	wuji: 8,//无极麻将

	//房卡纸牌游戏
	niuniu: 10000, //5人通比牛牛
	zjh: 10001, //炸金花
	land: 10002, //斗地主

	paijiu: 19000, //房卡小牌九
	paijiu_da: 19001, //房卡大牌九

	//比赛
	match_tianshui: 20000, //天水麻将比赛

	//更多游戏

	//金币场
	gold_sichuan_1: 40001, //四川麻将金币新手场
	gold_sichuan_2: 40002, //四川麻将金币中级场
	gold_sichuan_3: 40003, //四川麻将金币高级场
	gold_sichuan_4: 40004, //四川麻将金币精英场
	gold_sichuan_5: 40005, //四川麻将金币大师场
	// gold_sichuan_6: 40006, //四川麻将金币雀神场

	// gold_erren_1: 40101, //二人麻将金币新手场
	// gold_erren_2: 40102, //二人麻将金币中级场
	// gold_erren_3: 40103, //二人麻将金币高级场
	// gold_erren_4: 40104, //二人麻将金币精英场
	// gold_erren_5: 40105, //二人麻将金币大师场
	// gold_erren_6: 40106, //二人麻将金币雀神场
};
exports.GAME_TYPE_LIST = GAME_TYPE_LIST;

//激活的游戏列表
var ACTIVE_GAME_LIST = [
	//房卡麻将 
	GAME_TYPE_LIST.tianshui,
	GAME_TYPE_LIST.handan,
	//GAME_TYPE_LIST.tangshan,
	GAME_TYPE_LIST.baoding,
	//GAME_TYPE_LIST.zhangjiakou,
	GAME_TYPE_LIST.quyang,
	GAME_TYPE_LIST.wuji,

	//房卡扑克
	GAME_TYPE_LIST.niuniu,
	GAME_TYPE_LIST.zjh,
	GAME_TYPE_LIST.land,

	//房卡天九
	GAME_TYPE_LIST.paijiu,
	GAME_TYPE_LIST.paijiu_da,

	//房卡麻将比赛
	GAME_TYPE_LIST.match_tianshui,

	//金币场
	// GAME_TYPE_LIST.gold_sichuan_1,
	// GAME_TYPE_LIST.gold_sichuan_2,
	// GAME_TYPE_LIST.gold_sichuan_3,
	// GAME_TYPE_LIST.gold_sichuan_4,
	// GAME_TYPE_LIST.gold_sichuan_5,
]

//激活的俱乐部游戏列表
var ACTIVE_CLUB_GAME_LIST = [
	//房卡麻将 
	GAME_TYPE_LIST.tianshui,
	GAME_TYPE_LIST.handan,
	//GAME_TYPE_LIST.tangshan,
	GAME_TYPE_LIST.baoding,
	//GAME_TYPE_LIST.zhangjiakou,
	GAME_TYPE_LIST.wuji,
	GAME_TYPE_LIST.quyang,
	//房卡扑克
	GAME_TYPE_LIST.zjh,
	GAME_TYPE_LIST.niuniu,
	GAME_TYPE_LIST.land,

	//房卡天九
	GAME_TYPE_LIST.paijiu,
	GAME_TYPE_LIST.paijiu_da,
]

exports.mysql = function () {
	return {
		HOST: '127.0.0.1',
		USER: 'root',
		PSWD: '1307761750',
		DB: 'mj',
		PORT: 3306,
	}
};

exports.dealerMysql = function () {
	return {
		HOST: '127.0.0.1',
		USER: 'root',
		PSWD: '1307761750',
		DB: 'dealer',
		PORT: 3306,
	}
};

//账号服配置
exports.account_server = function () {
	return {
		CLIENT_PORT: 9900,
		HALL_IP: HALL_IP,
		HALL_CLIENT_PORT: HALL_CLIENT_PORT,
		ACCOUNT_PRI_KEY: ACCOUNT_PRI_KEY,
		VERSION: '2020021401',
		APP_WEB: 'http://47.104.164.104/jump',
		PAY_URL: PAY_URL,
		GAME_LIST: exports.game_list(),
		CLUB_GAME_LIST: exports.club_game_list(),
	};
};

//大厅服配置
exports.hall_server = function () {
	return {
		HALL_IP: HALL_IP,
		CLEINT_PORT: HALL_CLIENT_PORT,
		FOR_ROOM_IP: LOCAL_IP,
		ROOM_PORT: HALL_ROOM_PORT,
		ACCOUNT_PRI_KEY: ACCOUNT_PRI_KEY,
		ROOM_PRI_KEY: ROOM_PRI_KEY,

		DEALDER_API_IP: LOCAL_IP,
		DEALDER_API_PORT: 12581,

		CheckUserActive: true,//是否检测玩家已通过后台验证
		GAME_LIST: exports.game_list(),
		CLUB_GAME_LIST: exports.club_game_list(),
		PAY_URL: PAY_URL,
	};
};

var all_game = null;
var GAME_HTTP_PORT = 9000; //HTTP监听
var GAME_SOCKETIO_PORT = 10000; //socketio监听
//获取游戏信息
var get_game_serverinfo_by_gametype = function (gametype) {
	if (!all_game) {
		all_game = {};
		//进行初始化
		for (var i in GAME_TYPE_LIST) {
			var _gametype = GAME_TYPE_LIST[i];
			console.log("_gametype =========== ",_gametype);
			all_game[_gametype] = {
				SERVER_ID: _gametype.toString(),
				TYPE: _gametype,

				//暴露给大厅服的HTTP端口号
				HTTP_PORT: GAME_HTTP_PORT++,
				//HTTP TICK的间隔时间，用于向大厅服汇报情况
				HTTP_TICK_TIME: 5000,
				//大厅服IP
				HALL_IP: LOCAL_IP,
				FOR_HALL_IP: LOCAL_IP,
				//大厅服端口
				HALL_PORT: HALL_ROOM_PORT,
				//与大厅服协商好的通信加密KEY
				ROOM_PRI_KEY: ROOM_PRI_KEY,

				//暴露给客户端的接口
				CLIENT_IP: HALL_IP,
				CLIENT_PORT: GAME_SOCKETIO_PORT++,
			}
		}
	}

	return all_game[gametype];
}
exports.get_game_serverinfo_by_gametype = get_game_serverinfo_by_gametype;

//开启服务器列表
var _game_list = null;
exports.game_list = function () {
	if (!_game_list) {
		_game_list = [];
		for (var i = 0; i < ACTIVE_GAME_LIST.length; i++) {
			_game_list.push(get_game_serverinfo_by_gametype(ACTIVE_GAME_LIST[i]));
		}
	}
	return _game_list;
};


//开启的俱乐部服务器列表
var _club_game_list = null;
exports.club_game_list = function () {
	if (!_club_game_list) {
		_club_game_list = [];
		for (var i = 0; i < ACTIVE_CLUB_GAME_LIST.length; i++) {
			_club_game_list.push(get_game_serverinfo_by_gametype(ACTIVE_CLUB_GAME_LIST[i]));
		}
	}
	return _club_game_list;
};
