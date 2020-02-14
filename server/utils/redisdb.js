// var Redis = require('ioredis');
// var sqlDB = require('db');
// var redis = null;
// var pipeline = null;

// var Datas = null;

// var cb = function () { };

// function isArray(o) {
//     return Object.prototype.toString.call(o) == '[object Array]';
// }

// function checkNullValue(parms) {
//     if (!isArray(parms)) return true;

//     parms.forEach(function (element) {
//         if (element == null || element == undefined || element == NaN) {
//             return true;
//         }
//     }, this);
//     return false;
// };

// /*
//  401030201 ==> 401代表游戏类型 03代表游戏等级为至尊级 02代表哪个房间。01桌号
//  */
// function initTablePokerDataArray () {
//     if(!Datas){
//         Datas = {};
//         for(var i = 0; i <20;i++){
//             var roomId = 400000000; //牛牛
//             if(i<5){
//                 //初级
//                 roomId +=i;
//             }else if(i<10){
//                 //中级
//                 roomId += 100 + i;
//             }else if(i<15){
//                 //高级
//                 roomId +=  200 +i;
//             }else {
//                 //至尊级
//                 roomId += 300 +i;
//             }
//             if(!Datas[roomId]){
//                 Datas[roomId] = {};
//                 Datas[roomId].roomId = roomId;
//             }
//             //桌子数据对象init
//             for(var  j = 0; j<40; j++){
//                 var tableId = toNumber(roomId) *100 +j;
//                 if(!Datas[roomId][tableId]){
//                     Datas[roomId][tableId] = {};
//                 }
//             }
//         }
//     }
// };

// exports.init = function (config) {
//     redis = new Redis({
//         port: config.port ? config.port : 6379,
//         host: config.host ? config.host : '127.0.0.1',
//         family: config.family ? config.family : 4,
//         password: config.password ? config.password : '',
//         db: config.db ? config.db : 0,
//     });

//     pipeline = redis.pipeline();
// };

// /**
//  * 基础测试
//  */
// exports.baseTest = function () {
//     redis.set('foo', 'bar');
//     redis.get('foo', function (err, result) {
//         console.log(result);
//     });

//     // Or using a promise if the last argument isn't a function
//     redis.get('foo').then(function (result) {
//         console.log(result);
//     });

//     // Arguments to commands are flattened, so the following are the same:
//     redis.sadd('set', 1, 3, 5, 7);
//     redis.sadd('set', [1, 3, 5, 7]);

//     // All arguments are passed directly to the redis server:
//     redis.set('key', 100, 'EX', 10);
// }

// /**
//  * 管道测试
//  */
// exports.pipelineTest = function () {
//     var pipeline = redis.pipeline();
//     pipeline.set('foo', 'bar');
//     pipeline.del('cc');
//     pipeline.exec(function (err, results) {
//         // `err` is always null, and `results` is an array of responses
//         // corresponding to the sequence of queued commands.
//         // Each response follows the format `[err, result]`.
//         console.log(err, results); // null [ [ null, 'OK' ], [ null, 0 ] ]
//     });

//     // You can even chain the commands:
//     redis.pipeline().set('foo', 'bar').del('cc').exec(function (err, results) {
//         console.log(err, results); // null [ [ null, 'OK' ], [ null, 0 ] ]
//     });

//     // `exec` also returns a Promise:
//     var promise = redis.pipeline().set('foo', 'bar').get('foo').exec();
//     promise.then(function (result) {
//         console.log(result); // [ [ null, 'OK' ], [ null, 'bar' ] ]
//     });
// }

/**
 * 设置桌子基础信息
 */
// exports.setTableBaseInfo = function (roomId, tableID, playerNum, allNum, callBack) {
//     callBack = typeof (callBack) == 'function' ? callBack : cb;

//     roomId = parseInt(roomId);
//     tableID = parseInt(tableID);
//     playerNum = parseInt(playerNum);
//     allNum = parseInt(allNum);

//     if (checkNullValue([roomId, tableID, playerNum, allNum])) {
//         console.log("redisdb=>setTableBaseInfo() checkNullValue=", roomId, tableID, playerNum, allNum);
//         return;
//     }

//     var data = JSON.stringify([playerNum, allNum]);
//     redis.hset(roomId, tableID, data);
// };

// //得到该房间内 所有桌子的信息

// exports.getTableBaseInfo = function(roomId, callBack){
//     callBack = typeof (callBack) == 'function' ? callBack : cb;
//     roomId = parseInt(roomId);
//     if(checkNullValue(roomId)){
//         console.log(" redisdb => getTableBaseInfo param null value roomId",roomId);
//         return;
//     }

//     redis.hgetall(roomId,function (err,result) {
//        if(err){
//            console.log(err);
//            callBack(null);
//        }else {
//            callBack(result);
//        }
//     });

// };

// /**
//  * 得到桌子信息
//  */
// exports.getTableInfo = function (roomId,tableId, callBack) {
//     callBack = typeof (callBack) == 'function' ? callBack : cb;


//     tableId = parseInt(tableId);
//     roomId  = parseInt(roomId);


//     if (checkNullValue([tableId,roomId])) {
//         console.log("redisdb=>getTableBaseInfo() checkNullValue=", tableId,roomId);
//         return;
//     }

//     redis.hget(roomId,tableId, function (err, result) {
//         if (err) {
//             console.log(err);
//             callBack(null);
//         }
//         else {
//             callBack(result);
//         }
//     });
// };


// exports.setUserInfo = function (roomId,tableId,userId,time,score,extStr,callBack) {

// };

// function update () {
//     //2分钟 刷新一次 SQL 中的数据，把redis 数据 update into



// }
// setInterval(update,2*60*1000);  //setInterval 可能会 阻塞



// exports.or = redis;
// exports.op = pipeline;
