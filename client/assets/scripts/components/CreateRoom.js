cc.Class({
    extends: cc.Component,

    properties: {
        // foo: {
        //    default: null,
        //    url: cc.Texture2D,  // optional, default is typeof default
        //    serializable: true, // optional, default is true
        //    visible: true,      // optional, default is true
        //    displayName: 'Foo', // optional
        //    readonly: false,    // optional, default is false
        // },
        // ...
        _leixingxuanze: null,
        _gamelist: null,
        _currentGame: null,
    },

    // use this for initialization
    onLoad: function () {

        this._gamelist = this.node.getChildByName('game_list');

        this._leixingxuanze = [];
        var t = this.node.getChildByName("leixingxuanze");
        for (var i = 0; i < t.childrenCount; ++i) {
            var n = t.children[i].getComponent("RadioButton");
            if (n != null) {
                this._leixingxuanze.push(n);
            }
        }
    },

    onBtnBack: function () {
        this.node.active = false;
    },

    onBtnOK: function () {
        var usedTypes = ['sjz', 'sjz'];
        var type = this.getType();
        if (usedTypes.indexOf(type) == -1) {
            return;
        }

        this.node.active = false;
        this.createRoom();
    },

    getType: function () {
        var type = 0;
        for (var i = 0; i < this._leixingxuanze.length; ++i) {
            if (this._leixingxuanze[i].checked) {
                type = i;
                break;
            }
        }
        if (type == 0) {
            return 'sjz';
        }
        else if (type == 1) {
            return 'sjz';
        }
        return 'sjz';
    },

    getSelectedOfRadioGroup(groupRoot) {

        var t = this._currentGame.getChildByName(groupRoot);

        var arr = [];
        for (var i = 0; i < t.children.length; ++i) {
            var n = t.children[i].getComponent("RadioButton");
            if (n != null) {
                arr.push(n);
            }
        }
        var selected = 0;
        for (var i = 0; i < arr.length; ++i) {
            if (arr[i].checked) {
                selected = i;
                break;
            }
        }
        return selected;
    },

    createRoom: function () {
        var self = this;
        var onCreate = function (ret) {
            if (ret.errcode !== 0) {
                cc.vv.wc.hide();
                //console.log(ret.errmsg);
                if (ret.errcode == 2222) {
                    cc.vv.alert.show("提示", "房卡不足，创建房间失败!");
                }
                else {
                    cc.vv.alert.show("提示", "创建房间失败,错误码:" + ret.errcode);
                }
            }
            else {
                cc.vv.gameNetMgr.connectGameServer(ret);
            }
        };

        var type = this.getType();
        var conf = null;
        if (type == 'sjz') {
            conf = this.constructSCMJConf();
        }
        else if (type == 'sjz') {
            conf = this.constructSCMJConf();
        }
        conf.type = type;

        var data = {
            account: cc.vv.userMgr.account,
            sign: cc.vv.userMgr.sign,
			gems: cc.vv.userMgr.gems,
            conf: JSON.stringify(conf)
        };
        console.log(data);
        cc.vv.wc.show("正在创建房间");
        cc.vv.http.sendRequest("/create_private_room", data, onCreate);
    },

    constructSCMJConf: function () {
        
        var wanfaxuanze = this._currentGame.getChildByName('wanfaxuanze');
        var feng = wanfaxuanze.children[0].getComponent('CheckBox').checked  == true ? 1 : 0;
        var qidui = wanfaxuanze.children[1].getComponent('CheckBox').checked  == true ? 1 : 0;
        var qingyise = wanfaxuanze.children[2].getComponent('CheckBox').checked  == true ? 1 : 0;
        var liuzhuang = wanfaxuanze.children[3].getComponent('CheckBox').checked  == true ? 1 : 0;

        

        var kouzuan = this.getSelectedOfRadioGroup('kouzuan');
        //var renshuxuanze = this.getSelectedOfRadioGroup('renshuxuanze');
        var renshuxuanze = 1;
        var jushuxuanze = this.getSelectedOfRadioGroup('xuanzejushu');

        

        
        var conf = {
            kouzuan:kouzuan,
            qidui:qidui,
            feng:feng,
            renshuxuanze:renshuxuanze,
            jushuxuanze:jushuxuanze,
            qingyise:qingyise,
            liuzhuang:liuzhuang,   
        };
        return conf;
    },


    // called every frame, uncomment this function to activate update callback
    update: function (dt) {

        var type = this.getType();

        if (this.lastType != type) {
            this.lastType = type;
            for (var i = 0; i < this._gamelist.childrenCount; ++i) {
                this._gamelist.children[i].active = false;
            }

            var game = this._gamelist.getChildByName(type);
            if (game) {
                game.active = true;
            }
            this._currentGame = game;
        }
    },
});