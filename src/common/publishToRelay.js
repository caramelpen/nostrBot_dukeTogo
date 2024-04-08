/**
 * publishToRelay.js
 * リレーにイベントを送信
 */

const { currUnixtime, updateLastReplyTime, userDisplayName } = require("./utils.js");

// リレーにイベントを送信
const publishToRelay = async (relay, ev, isAutoReply = false, originallyPubKey = "", replyingtoaPost = "") => {
    /* nostr-toolsのバージョンが1.17.0だとpub.onが対応しておらずエラーになる
    const pub = relay.publish(ev);

    pub.on("ok", () => {
        console.log("succeess!");
    });
    pub.on("failed", () => {
        console.error("failed to send event");
    });
    */
    try {
        
        let displayName = "";
        if(originallyPubKey.length > 0){
            displayName = await userDisplayName(relay, originallyPubKey);
        }

        await relay.publish(ev).then(() => {
            console.log("publishToRelay:success!" + "\n" + (replyingtoaPost.length > 0 ? "find:" + displayName + ":" + originallyPubKey + ":" + replyingtoaPost + "\n=> " :"") + ev.content);
            // autoReply からやってきた
            if(isAutoReply && replyingtoaPost.length > 0) {
                // 最終更新日時を保存
                updateLastReplyTime(originallyPubKey, currUnixtime());
            }
        }).catch((err) => {
            console.error("publishToRelay:failed to send event" + "\n" + ev.content + "-" + err);
        });

    } catch (err) {
        console.error("publishToRelay err:" + err);
    }
};




/**
 * module.exports
 */
module.exports = {
    publishToRelay
};
  