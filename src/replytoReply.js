/**
 * 狙撃屋13bot(@dukeTogo)
 * replytoReply.js
 * 受けたリプライに対してjsonに設定された語句でランダムでリプライする
 */
require("websocket-polyfill");
const { relayInit } = require("nostr-tools");
const { jsonSetandOpen } = require("./common/utils.js");
const { BOT_PRIVATE_KEY_HEX, pubkey, RELAY_URL, adminPubkey } = require("./common/env.js");
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


// ディスパッチの設定値
const funcConfig = {
    funcName: ["functionalPosting", "exchangeRate", "normalAutoReply"]                  // useJsonFile の記述順と対応させる
    ,useJsonFile: ["functionalPosting.json", "exchangeRate.json", "autoReply.json"]     // funcName の記述順と対応させる
    ,operationCategory: [1, 1, 1]                                                       // 1ならポストできたら次へ進めない（useJsonFileやuncName の記述順と対応させる）
}


const replytoReply = async (relay)=>{

    // このBotの公開鍵へのリプライを絞り込むフィルタを設定して、イベントを購読する
    const sub = relay.sub(
        [
            { 
                "kinds": [1] 
                , "#p": [pubkey]
            }
        ]
    );

    sub.on("event", async (ev) => {
        try {

            //有効とするのは自分以外の投稿と、(一応明示)リプライなのでtagに値があるもののみ
            if(pubkey !== undefined && ev.pubkey !== pubkey && ev.tags.length > 0) {

                // jsonの場所の割り出しとリプライ語句入りjsonファイルの場所の設定（自動リプライ時に使用しているjsonの反応語句をそのまま利用する）
                const jsonCommonPath = "../../config/";    // configの場所はここからみれば../config/だが、util関数の場所から見れば../../config/となる
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
                    await funcObj[funcConfig.funcName[i]](relay, ev, funcJson, autoReactionJson, postInfo, true);
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
        console.error("replytoReply:failed to connect");
        relay.close();
        return;
    });

    await relay.connect();
    console.log("replytoReply:connected to relay");        

    try {
        /*
            受けたリプライに対してjsonに設定された語句でランダムでリプライする
        */
        replytoReply(relay);

    } catch(err) {
        console.error(err);

    }
}


main();