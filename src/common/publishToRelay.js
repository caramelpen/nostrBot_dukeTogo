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
        
        let findChar = "";
        let displayName = "";
        if(originallyPubKey.length > 0){
            displayName = await userDisplayName(relay, originallyPubKey);
            findChar = findChar + "find:" + displayName + "( " + originallyPubKey + " )";
        }
        if(replyingtoaPost.length > 0 ) {
            findChar = findChar + " original messege:" + replyingtoaPost;
        }
        findChar = findChar + (findChar.length > 0 ? "\n=> ":"");

        await relay.publish(ev).then(() => {
            console.log("publishToRelay:success!" + "\n" + findChar + ev.content);
            // autoReply 系統からやってきた
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
  