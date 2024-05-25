/**
 * 狙撃屋13bot(@dukeTogo)
 * manualShutdown.js
 * botの手動停止プログラム
 */
const cron = require("node-cron");
require("websocket-polyfill");
const { relayInit } = require("nostr-tools");
const { jsonSetandOpen, isSafeToReply } = require("./common/utils.js");
const { BOT_PRIVATE_KEY_HEX, pubkey, adminPubkey, RELAY_URL } = require("./common/env.js");
const { emergency } = require("./emergency.js");

let relay;
let connect = false;
let stopped = false;

// envファイルのかたまり
const keys = {
    BOT_PRIVATE_KEY_HEX: BOT_PRIVATE_KEY_HEX
    , pubKey: pubkey
    , adminPubkey: adminPubkey
    , RELAY_URL: RELAY_URL
};
const envKeys = Object.freeze(keys);    // 変更不可のかたまりにしてしまう

const manualShutdown = async (relay) => {

    // フィードを購読
    const sub = relay.sub(
        [
            { kinds: [1] }
        ]
    );

    if(!stopped) {
        sub.on("event", async (ev) => {
            const jsonCommonPath = "../../config/";    // configの場所はここからみれば../config/だが、util関数の場所から見れば../../config/となる
            const jsonFineName = "surveillance.json";
            const config = await jsonSetandOpen(jsonCommonPath + jsonFineName);
            // 有効とするのは自分の投稿か、管理者の投稿
            if(envKeys.pubKey !== undefined && (ev.pubkey === envKeys.pubKey || ev.pubkey === envKeys.adminPubkey) && ev.tags.length <= 0) {
                let emergencyemergencyStopWords = false;
                // 自分の投稿
                if(ev.pubkey === envKeys.pubKey){
                    // json の設定値そのものを投稿したなら真
                    emergencyemergencyStopWords = config.emergencyStopWords.length > 0 && config.emergencyStopWords.some(name => name === ev.content) ? true : false;
                // 管理者の投稿
                } else if(ev.pubkey === envKeys.adminPubkey) {
                    
                    // jsonの場所の割り出しと設定
                    const autoReactionJson = await jsonSetandOpen(jsonCommonPath + "autoReaction.json");
                    // フィードのポスト先頭がjsonの nativeWords プロパティを含んでいるなら真
                    const includeNativeWords = autoReactionJson.nativeWords.some(word => ev.content.startsWith(word));
                    if(includeNativeWords) {
                        if (config.emergencyStopWords.some(word => ev.content.includes(word))) {
                            emergencyemergencyStopWords = true;
                        }
                    }
                }
                if(emergencyemergencyStopWords) {
                    if (isSafeToReply(ev)) {
                        // 緊急停止の実行
                        await emergency(relay, envKeys.pubKey);
                        stopped = true;
                    }
                }

            }
        });
    }
}



/****************
 * メイン
 ***************/
const main = async (sw = 0) => {
    connect = false;
    
    // リレー
    relay = relayInit(envKeys.RELAY_URL);
    relay.on("error", () => {
        relay.close();
        console.error("autoReply:failed to connect");
    });
    
    await relay.connect();
    connect = true;
    if(sw === 0) {
        console.log("autoReply:connected to relay");
    }

    try {
        /*
        フィードを購読し、リプライ対象となるポストがないか調べ、存在するならリプライする
        */
        manualShutdown(relay);

    } catch(err) {
        console.error(err);
    }
}

main();

cron.schedule('*/20 * * * *', () => {
    if(connect) {
        relay.close();
        connect = false;
    }
    if(!stopped) {
        main(1);
    }
});