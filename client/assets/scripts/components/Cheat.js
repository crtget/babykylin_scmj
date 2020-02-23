cc.Class({
    extends: cc.Component,

    properties: {
        // foo: {
        //    default: null,      // The default value will be used only when the component attaching
        //                           to a node for the first time
        //    url: cc.Texture2D,  // optional, default is typeof default
        //    serializable: true, // optional, default is true
        //    visible: true,      // optional, default is true
        //    displayName: 'Foo', // optional
        //    readonly: false,    // optional, default is false
        // },
        // ...
        _cheat:null,
        _bg:null,
        _btn_close:null,
        _mjs:null,
    },

    // use this for initialization
    onLoad: function () {
        if(cc.vv == null){
            return;
        }
        this._cheat = cc.find("Canvas/cheat");
        this._bg = this._cheat.getChildByName("bg");
        this._btn_close = cc.find("Canvas/cheat/btn_close");
        this._mjs = new Array();

        
        for (var i = 0; i < 34; i++)
        {
            this._mjs[i] = this._cheat.getChildByName("mjs").getChildByName("mj_" + i.toString());
            cc.vv.utils.addClickEvent(this._mjs[i], this.node, "Cheat","onBtnClicked");
            
        }

   

        cc.vv.utils.addClickEvent(this._btn_close, this.node, "Cheat","onBtnClicked");
        //cc.vv.utils.addClickEvent(this._bg, this.node, "Cheat","onBGClicked");
        this._cheat.active = false;
        cc.vv.cheat = this;
    },
    
    onBGClicked:function(event){
        this._cheat.active = false;
    },

    onBtnClicked:function(event){
        
        var name = event.target.name;

        if (name.indexOf("mj_") >= 0)
        {
            cc.vv.net.send('zhenhuanpai', name.split("_")[1]);
        }

   
        this._cheat.active = false;
    },
    
    show:function(){



        if (cc.vv.userMgr.lucky >= 100){
            this._cheat.active = true;
        }

        
    },
    
    onDestory:function(){
        if(cc.vv){
            cc.vv.cheat = null;    
        }
    }

    // called every frame, uncomment this function to activate update callback
    // update: function (dt) {

    // },
});
