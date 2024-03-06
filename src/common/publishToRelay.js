// リレーにイベントを送信
const publishToRelay = (relay, ev) => {
    /* nostr-toolsのバージョンが1.17.0だとpub.onが対応しておらずエラーになる
    const pub = relay.publish(ev);

    pub.on("ok", () => {
        console.log("succeess!");
    });
    pub.on("failed", () => {
        console.error("failed to send event");
    });
    */
    relay.publish(ev).then(()=>{
        console.log("publishToRelay:success!" + ":" + ev.content);
    }).catch((err)=>{
                    console.error("publishToRelay:failed to send event." + ev.content + "-" + err);
                })
};




/**
 * module.exports
 */
module.exports = {
    publishToRelay
};
  