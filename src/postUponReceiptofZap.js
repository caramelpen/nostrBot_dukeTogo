/**
 * 狙撃屋13bot(@dukeTogo)
 * postUponReceiptofZap.js
 * 受けたzapに対してjsonに設定された語句でランダムで投稿する
 */
require("websocket-polyfill");
const { relayInit } = require("nostr-tools");
const { jsonSetandOpen, currUnixtime } = require("./common/utils.js");
const { BOT_PRIVATE_KEY_HEX, pubkey, RELAY_URL, adminPubkey, RELAY_URL_ZAP, ZAPPER_PUBKEYS } = require("./common/env.js");
const { initial, postUponReceiptofZap } = require("./replyFunction.js");

// envファイルのかたまり
const keys = {
    BOT_PRIVATE_KEY_HEX: BOT_PRIVATE_KEY_HEX
    , pubKey: pubkey
    , adminPubkey: adminPubkey
    , RELAY_URL_ZAP: RELAY_URL_ZAP
    , ZAPPER_PUBKEYS: ZAPPER_PUBKEYS
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
    postUponReceiptofZap   // zap 反応ポスト
}


// ディスパッチの設定値
const funcConfig = {
    funcName: ["postUponReceiptofZap"]                   // useJsonFile の記述順と対応させる
    ,useJsonFile: ["postUponReceiptofZap.json"]          // funcName の記述順と対応させる
    ,operationCategory: [1]                              // 1ならポストできたら次へ進めない（useJsonFileやuncName の記述順と対応させる）
}


const zaptoReaction = async (relay, zapRelay) => {
    
    // このBotの公開鍵へのzapを絞り込むフィルタを設定して、イベントを購読する
    const sub = zapRelay.sub(
        [
            { 
                "kinds": [9735] 
                , "authors": envKeys.ZAPPER_PUBKEYS // 配列なので、[]で囲まない
                , "#p": [envKeys.pubKey]
                , "since": currUnixtime()
            }
        ]
    );

    sub.on("event", async (ev) => {
        try {

            //有効とするのは(自分で自分にzapはないが一応)他者からのzapと、(一応明示)リプライなのでtagに値があるもののみ
            if(envKeys.pubKey !== undefined && ev.pubkey !== envKeys.pubKey && ev.tags.length > 0) {
                // jsonの場所の割り出しとリプライ語句入りjsonファイルの場所の設定（自動リプライ時に使用しているjsonの反応語句をそのまま利用する）
                const jsonCommonPath = "../../config/";    // configの場所はここからみれば../config/だが、util関数の場所から見れば../../config/となる

                for(let i = 0; i <= funcConfig.funcName.length - 1; i++) {
                    postInfo.postCategory = 0;
                    let funcJson = await jsonSetandOpen(jsonCommonPath + funcConfig.useJsonFile[i]); // configの場所はここからみれば../config/だが、util関数の場所から見れば../../config/となる
                    if(funcJson === null) {
                        console.log("json file is not get");
                        return;
                    }
                    // 処理の実行はディスパッチで行い、最適化をはかる
                    await funcObj[funcConfig.funcName[i]](relay, ev, funcJson, postInfo);
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
        console.error("zaptoReply:failed to connect");
        return;
    });
    await relay.connect();
    console.log("zaptoReply:connected to relay");

    const zapRelay = relayInit(RELAY_URL_ZAP);
    zapRelay.on("error", () => {
        zapRelay.close();
        console.error("zaptoZapReply:failed to connect");
        return;
    });
    await zapRelay.connect();
    console.log("zaptoReply:connected to zapRelay");



    try {
        /*
            受けたリプライに対してjsonに設定された語句でランダムでリプライする
        */
        zaptoReaction(relay, zapRelay);

    } catch(err) {
        console.error(err);
    }
}


main();