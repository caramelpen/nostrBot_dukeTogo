/**
 * 狙撃屋13bot(@dukeTogo)
 * autoReply.js
 * フィードを購読し、リプライ対象となるポストがないか調べ、存在するならリプライ等の動作をする
 */
//const cron = require("node-cron");
require("websocket-polyfill");
const { relayInit } = require("nostr-tools");
const { jsonSetandOpen } = require("./common/utils.js");
const { BOT_PRIVATE_KEY_HEX, pubkey, adminPubkey, RELAY_URL } = require("./common/env.js");
const { initial, functionalPosting, exchangeRate, normalAutoReply } = require("./replyFunction.js");


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
            // 有効とするのは自分の投稿以外でかつtagが空のもの
            if(pubkey !== undefined && ev.pubkey !== pubkey && ev.tags.length <= 0) {
                const jsonCommonPath = "../" + jsonPathDef;    // configの場所はここからみれば../config/だが、util関数の場所から見れば../../config/となる
                // jsonの場所の割り出しと設定
                const autoReactionJson = await jsonSetandOpen(jsonCommonPath + "autoReaction.json");    
            
                if(autoReactionJson === null) {
                    console.log("json file is not get");
                    return;
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
const main = async () => {

    // リレー
    const relay = relayInit(RELAY_URL);
    relay.on("error", () => {
        relay.close();
        console.error("autoReply:failed to connect");
    });
    
    await relay.connect();
    console.log("autoReply:connected to relay");

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

// cron.schedule('*/5 * * * *', () => {
//     main();
// });

