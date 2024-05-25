/**
 * 狙撃屋13bot(@dukeTogo)
 * autoReply.js
 * フィードを購読し、リプライ対象となるポストがないか調べ、存在するならリプライ等の動作をする
 */
const cron = require("node-cron");
require("websocket-polyfill");
const { relayInit } = require("nostr-tools");
const { jsonSetandOpen } = require("./common/utils.js");
const { BOT_PRIVATE_KEY_HEX, pubkey, adminPubkey, RELAY_URL } = require("./common/env.js");
const { initial, functionalPosting, exchangeRate, normalAutoReply } = require("./replyFunction.js");

let relay;
let connect = false;

// envファイルのかたまり
const keys = {
    BOT_PRIVATE_KEY_HEX: BOT_PRIVATE_KEY_HEX
    , pubKey: pubkey
    , adminPubkey: adminPubkey
};
const envKeys = Object.freeze(keys);    // 変更不可のかたまりにしてしまう

// 作動区分
const postCategory = 0;
// 参照渡しできるようにオブジェクト化する
const postInfo = {
    postCategory: postCategory
}

// replyFunction へ各キーを代入する
initial(envKeys);

// ディスパッチのオブジェクト
const funcObj = {
    functionalPosting   // 機能ポスト
    ,exchangeRate       // 為替ポスト
    ,normalAutoReply    // 通常リプライ
}

const jsonPathDef = "../config/";

// ディスパッチの設定値
const funcConfig = {
    funcName: ["functionalPosting", "exchangeRate", "normalAutoReply"]                  // useJsonFile の記述順と対応させる
    ,useJsonFile: ["functionalPosting.json", "exchangeRate.json", "autoReply.json"]     // funcName の記述順と対応させる
    ,operationCategory: [1, 1, 1]                                                       // 1ならポストできたら次へ進めない（useJsonFileやuncName の記述順と対応させる）
}

const autoReply = async (relay) => {
    // フィードを購読
    const sub = relay.sub(
        [
            { kinds: [1] }
        ]
    );

    sub.on("event", async (ev) => {
        try {

            // キャッシュのクリア
            delete require.cache[require.resolve("./replyFunction.js")];

            // 有効とするのは自分の投稿以外でかつtagが空のもの
            if(pubkey !== undefined && ev.pubkey !== pubkey && ev.tags.length <= 0) {
                const jsonCommonPath = "../" + jsonPathDef;    // configの場所はここからみれば../config/だが、util関数の場所から見れば../../config/となる
                // jsonの場所の割り出しと設定
                const autoReactionJson = await jsonSetandOpen(jsonCommonPath + "autoReaction.json");
                
                if(autoReactionJson === null) {
                    console.log("json file is not get");
                    return;
                }

                // 管理者の投稿
                if(ev.pubkey === adminPubkey) {
                    let emergencyemergencyStopWords = false;
                    const surveillanceConfig = await jsonSetandOpen(jsonCommonPath + "surveillance.json");
                    // フィードのポスト先頭がjsonの nativeWords プロパティを含んでいるなら真
                    const includeNativeWords = autoReactionJson.nativeWords.some(word => ev.content.startsWith(word));
                    if(includeNativeWords) {
                        // 停止処理文言を見つけたら真
                        if (surveillanceConfig.emergencyStopWords.some(word => ev.content.includes(word))) {    // この検索だと投稿のどこかに発見したということになるが、上位の判定で先頭が json の nativeWords かどうかを判定しているのでこれで問題ない
                            emergencyemergencyStopWords = true;
                        }
                    }

                    // 停止命令ポストならなにもしない（停止処理が処理する）
                    if(emergencyemergencyStopWords) {
                        return;
                    }
                }

                for(let i = 0; i <= funcConfig.funcName.length - 1; i++) {
                    postInfo.postCategory = 0;
                    let funcJson = await jsonSetandOpen(jsonCommonPath + funcConfig.useJsonFile[i]); // configの場所はここからみれば../config/だが、util関数の場所から見れば../../config/となる
                    if(funcJson === null) {
                        console.log("json file is not get");
                        return;
                    }
                    // 処理の実行はディスパッチで行い、最適化をはかる
                    await funcObj[funcConfig.funcName[i]](relay, ev, funcJson, autoReactionJson, postInfo);
                    // ポストできていて、次へ進めない区分なら
                    if(postInfo.postCategory >= 1 && funcConfig.operationCategory[i] === 1) {
                        break;
                    }
                }
            }
        } catch (err) {
            throw err;
        }
    });
}


/****************
 * メイン
 ***************/
const main = async (sw = 0) => {
    connect = false;
    
    // リレー
    //const relay = relayInit(RELAY_URL);
    relay = relayInit(RELAY_URL);
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
        autoReply(relay);

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
    main(1);
});

