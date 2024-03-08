const { currUnixtime, updateLastReplyTime } = require("./utils.js");

// リレーにイベントを送信
const publishToRelay = (relay, ev, pubKey, replyingtoaPost = "") => {
    /* nostr-toolsのバージョンが1.17.0だとpub.onが対応しておらずエラーになる
    const pub = relay.publish(ev);

    pub.on("ok", () => {
        console.log("succeess!");
    });
    pub.on("failed", () => {
        console.error("failed to send event");
    });
    */
    relay.publish(ev).then(() => {
        console.log("publishToRelay:success!" + ":" + replyingtoaPost + (replyingtoaPost.length > 0, "\n ⇒ ") + ev.content);
        updateLastReplyTime(pubKey, currUnixtime());
    }).catch((err) => {
                    console.error("publishToRelay:failed to send event." + ev.content + "-" + err);
                })
};




/**
 * module.exports
 */
module.exports = {
    publishToRelay
};
  