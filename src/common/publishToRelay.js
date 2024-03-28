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
    let displayName = "";
    if(originallyPubKey.length > 0){
        console.log("into userDisplayName");
        displayName = await userDisplayName(relay, originallyPubKey);
        console.log("get userDisplayName:" + displayName);
    }
    // relay.publish(ev).then(() => {
    //     console.log("publishToRelay:success!" + ":" + (replyingtoaPost.length > 0 ? "find:" + displayName + "_" + originallyPubKey + ":" + replyingtoaPost + "\n=> " :"") + ev.content);
    //     // autoReply からやってきた
    //     if(isAutoReply && replyingtoaPost.length > 0) {
    //         // 最終更新日時を保存
    //         updateLastReplyTime(originallyPubKey, currUnixtime());
    //     }
    // }).catch((err) => {
    //                 console.error("publishToRelay:failed to send event." + ev.content + "-" + err);
    //             })

    try {
        //await relay.publish(ev);
        relay.publish(ev);
        console.log("publishToRelay:success!" + ":" + (replyingtoaPost.length > 0 ? "find:" + displayName + "_" + originallyPubKey + ":" + replyingtoaPost + "\n=> " :"") + ev.content);
        // autoReply からやってきた
        if (isAutoReply && replyingtoaPost.length > 0) {
            // 最終更新日時を保存
            updateLastReplyTime(originallyPubKey, currUnixtime());
        }
    } catch (err) {
        console.error("publishToRelay:failed to send event." + ev.content + "-" + err);
    }







                
};




/**
 * module.exports
 */
module.exports = {
    publishToRelay
};
  