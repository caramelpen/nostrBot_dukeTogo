const { currUnixtime, updateLastReplyTime } = require("./utils.js");

// リレーにイベントを送信
const publishToRelay = (relay, ev, originallyPubKey, replyingtoaPost = "") => {
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
        console.log("publishToRelay:success!" + ":" + (replyingtoaPost.length > 0 ? "find:" + originallyPubKey + ":" + replyingtoaPost + "\n ⇒ " :"") + ev.content);
        // 最終更新日時を保存
        updateLastReplyTime(originallyPubKey, currUnixtime());
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
  