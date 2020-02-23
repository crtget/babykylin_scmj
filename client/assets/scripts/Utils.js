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
    },

    addClickEvent:function(node,target,component,handler){
        console.log(component + ":" + handler);
        var eventHandler = new cc.Component.EventHandler();
        eventHandler.target = target;
        eventHandler.component = component;
        eventHandler.handler = handler;

        var clickEvents = node.getComponent(cc.Button).clickEvents;
        clickEvents.push(eventHandler);
    },
    
    addSlideEvent:function(node,target,component,handler){
        var eventHandler = new cc.Component.EventHandler();
        eventHandler.target = target;
        eventHandler.component = component;
        eventHandler.handler = handler;

        var slideEvents = node.getComponent(cc.Slider).slideEvents;
        slideEvents.push(eventHandler);
    },

    addHotKey: function(node) {
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, node);
        //cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP, this.onKeyUp, node);
    },

    onDestroy:function() {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        //cc.systemEvent.off(cc.SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
    },


    onKeyDown: function (event) {


        if (event.keyCode == cc.macro.KEY.back)
        {
            cc.vv.alert.show('提示','确定要退出游戏吗？',function(){
                cc.game.end();
            },true);
        }

    },



    setFitSreenMode:function(){
        var node = cc.find('Canvas');
        var size = cc.view.getFrameSize();
        var w = size.width;
        var h = size.height;
    
        var cvs = node.getComponent(cc.Canvas);
        var dw = cvs.designResolution.width;
        var dh = cvs.designResolution.height;
        //如果更宽 则让高显示满
        if((w / h)  > (dw / dh)){
            cvs.fitHeight = true;
            cvs.fitWidth = false;
        }
        else{
            //如果更高，则让宽显示满
            cvs.fitHeight = false;
            cvs.fitWidth = true;
        }
    }

    // called every frame, uncomment this function to activate update callback
    // update: function (dt) {

    // },
});
