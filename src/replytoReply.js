/**
 * 狙撃屋13bot(@dukeTogo)
 * replytoReply.js
 * 受けたリプライに対してjsonに設定された語句でランダムでリプライする
 */
require("websocket-polyfill");
const { relayInit, getPublicKey, finishEvent, nip19 } = require("nostr-tools");
const { currUnixtime, random, jsonSetandOpen, isSafeToReply, retrievePostsInPeriod } = require("./common/utils.js");
const { publishToRelay } = require("./common/publishToRelay.js");

let relayUrl = "";
let BOT_PRIVATE_KEY_HEX = "";
let pubkey = "";

const replytoReply = async (relay)=>{

    // jsonの場所の割り出しとリプライ語句入りjsonファイルの場所の設定（自動リプライ時に使用しているjsonの反応語句をそのまま利用する）
    const commonPath = "../../config/"  // configの場所はここからみれば../config/だが、util関数の場所から見れば../../config/となる
    const functionalPostingJson = await jsonSetandOpen(commonPath + "functionalPosting.json");
    const replyChrJson = await jsonSetandOpen(commonPath + "autoReply.json");
    if(replyChrJson === null){
        console.error("replytoReply:json file is not get");
        return false;
    }

    // このBotの公開鍵へのリプライを絞り込むフィルタを設定して、イベントを購読する
    const sub = relay.sub(
        [
            { 
                "kinds": [1] 
                , "#p":[pubkey]
            }
        ]
    );

    sub.on("event", (ev) => {
        try {

            //(一応明示)有効とするのはリプライなのでtagに値があるもののみ
            //if(ev.tags.length > 0) {
            //有効とするのは自分以外の投稿と、(一応明示)リプライなのでtagに値があるもののみ
            if(ev.pubkey !== pubkey && ev.tags.length > 0) {

                // リプライしても安全なら、リプライイベントを組み立てて送信する
                if (isSafeToReply(ev) && retrievePostsInPeriod(relay, pubkey)) {
                    // 作動区分
                    let postKb = 0;
                    let jsonTarget = functionalPostingJson !== null? functionalPostingJson: replyChrJson; // 機能ポストを優先させる
                    let isfunctionalPostingJson = true;

                    let target = null;
                    for(let i = 1; i <= 2; i++) {
                        // フィードのポストの中にjsonで設定した値が存在するなら真
                        target = jsonTarget.find(item => item.orgPost.some(post => ev.content.includes(post)));
                        if(!target) {
                            jsonTarget = replyChrJson;
                            isfunctionalPostingJson = false;
                        } else {
                            break;
                        }
                    }
                    // 反応語句を見つけたならそれに対応するリプライ語句を使ってリプライを返す
                    if(target) {

                        // 反応語句はjsonの何番目にいるか取得
                        const orgPostIdx = target.orgPost.findIndex(element => ev.content.includes(element));
                        // 反応語句は存在するはずだが、もし何らかの理由で見つからなかったら
                        if(orgPostIdx === -1) {
                            postKb = 1; // 全リプライ語句からのランダムリプライ
                            if(isfunctionalPostingJson == true) {
                                postKb = 0; // ありえないと思うが、起こったら何も行わない
                            }
                        } else {
                            postKb = 2; //反応語句に対応するリプライ語句を使ってリプライを返す
                        }

                    } else {
                        postKb = 1; // 全リプライ語句からのランダムリプライ
                    }

                    // 作動対象だ
                    if(postKb > 0) {
                        let replyChr = "";
                        if(postKb === 1){
                            // 反応語句配列の数の範囲からランダム値を取得し、それを配列要素とする
                            const replyChrPresetIdx = random(0, jsonTarget.length - 1);
                            // 配列要素を決めたら、その配列に設定されている反応語句の設定配列の範囲からさらにランダム値を取得
                            const replyChrIdx = random(0, jsonTarget[replyChrPresetIdx].replyPostChar.length - 1);
                            // リプライ語句決定
                            replyChr = jsonTarget[replyChrPresetIdx].replyPostChar[replyChrIdx];
                        } else {
                            if(postKb === 2) {
                                // 機能ポスト
                                if(isfunctionalPostingJson == true) {
                                    for(let i = 0; i <= target.replyPostChar.length - 1; i++) {
                                        replyChr += target.replyPostChar[i];
                                    }
                                } else {

                                    // jsonに設定されている対応するリプライの数を利用してランダムでリプライ語句を決める
                                    const randomIdx = random(0, target.replyPostChar.length - 1);
                                    // リプライ語句決定
                                    replyChr = target.replyPostChar[randomIdx];
                                }
                            }
                        }
                        if(replyChr.length > 0) {   //念のため
                            // リプライ
                            const replyPostEv = composeReplyPost(replyChr, ev);
                            publishToRelay(relay, replyPostEv, ev.pubkey, ev.content);
                        }
                    }
                }

            }
        } catch (err) {
            throw err;
        }
    });

}



// テキスト投稿イベント(リプライ)を組み立てる
const composeReplyPost = (content, targetEvent) => {
    const ev = {
        kind: 1,
        content,
        tags: [ 
        ["p",targetEvent.pubkey,""],
        ["e",targetEvent.id,""] 
        ],
        created_at: currUnixtime(),
    };

    // イベントID(ハッシュ値)計算・署名
    return finishEvent(ev, BOT_PRIVATE_KEY_HEX);
};









/****************
 * メイン
 ***************/
const main = async () => {

    // 秘密鍵
    require("dotenv").config();
    const nsec = process.env.BOT_PRIVATE_KEY;
    if (nsec === undefined) {
        console.error("nsec is not found");
        return;
    }
    const dr = nip19.decode(nsec);
    if (dr.type !== "nsec") {
        console.error("NOSTR PRIVATE KEY is not nsec");
        return;
    }
    BOT_PRIVATE_KEY_HEX = dr.data;
    pubkey = getPublicKey(BOT_PRIVATE_KEY_HEX); // 秘密鍵から公開鍵の取得

    // リレー
    relayUrl = process.env.RELAY_URL;    // リレーURL
    const relay = await relayInit(relayUrl);
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