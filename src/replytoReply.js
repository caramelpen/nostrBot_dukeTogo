/**
 * 狙撃屋13bot(@dukeTogo)
 * replytoReply.js
 * 受けたリプライに対してjsonに設定された語句でランダムでリプライする
 */
require("websocket-polyfill");
const { relayInit } = require("nostr-tools");
const { jsonSetandOpen, getMyLastReplyEventId } = require("./common/utils.js");
const { BOT_PRIVATE_KEY_HEX, pubkey, RELAY_URL, adminPubkey } = require("./common/env.js");
const { initial, functionalPosting, exchangeRate, normalAutoReply } = require("./replyFunction.js");

let writeLog = false;

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

/*
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
*/
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


    // すでに処理済みのイベントIDを保持する
    // 同じイベントが再度来た場合は、無限に同じ処理を走らせないため
    const seenEventIds = new Set();

    // 同じ相手の連続返信を抑えるためのタイムスタンプを保持する
    // pubkey 単位で短時間に何度も反応しないようにする
    const lastReplyAtByPubkey = new Map();

    sub.on("event", async (ev) => {
        try {

            // 自分自身のイベントは無視する
            // これがないと、自分の投稿をまた拾って自分自身へ返信ループが発生する
            if (ev.pubkey === pubkey) return;

            // pubkey 未設定時は安全側で処理を止める
            // これで未初期化状態での誤動作を防ぐ
            if (pubkey === undefined) return;

            // 同じイベントIDを二重処理しない
            if (seenEventIds.has(ev.id)) return;
            seenEventIds.add(ev.id);            

            // 同じ pubkey に対する短時間連続反応を抑止する
            // 連投 bot や無限返信ループの入口を少しでも防ぐ
            const now = Math.floor(Date.now() / 1000);
            const last = lastReplyAtByPubkey.get(ev.pubkey) || 0;
            if (now - last < 10) return;

            // 自分の直前の返信に対する返信を無視する
            // 「自分が返したイベントに対して、また自分が返す」ループを防ぐ
            const parentReply = ev.tags.some(tag =>
                Array.isArray(tag) && tag[0] === "e" && tag[1] === getMyLastReplyEventId()
            );
            if (parentReply) return;

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
        relay.close();
        console.error("replytoReply:failed to connect");
        return;
    });

    await relay.connect();
    if(!writeLog) {
        console.log("replytoReply:connected to relay");
        writeLog = true;
    }

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