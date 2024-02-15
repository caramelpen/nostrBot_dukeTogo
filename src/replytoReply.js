/**
 * 狙撃屋13bot(@dukeTogo)
 * replytoReply.js
 * 受けたリプライに対してjsonに設定された語句でランダムでリプライする
 */
require("websocket-polyfill");
const { relayInit, getPublicKey, finishEvent, nip19 } = require("nostr-tools");
const { currUnixtime, random, jsonOpen, isSafeToReply } = require("./common/utils.js");
const { publishToRelay } = require("./common/publishToRelay.js");

let relayUrl = "";
let BOT_PRIVATE_KEY_HEX = "";
let pubkey = "";

const replytoReply = async (relay)=>{

    // jsonの場所を割り出すために
    const jsonPath = require("path");

    // リプライ語句入りjsonファイルの場所の設定（自動リプライ時に使用しているjsonの反応語句をそのまま利用する）
    const replyChrJsonPath = jsonPath.join(__dirname, "../config/autoReply.json");
    // 反応語句の格納されたjsonを取得
    const replyChrJson = jsonOpen(replyChrJsonPath);

    // このBotの公開鍵へのリプライを絞り込むフィルタを設定して、イベントを購読する
    const sub = relay.sub(
        [
            { "kinds": [1] 
            ,"#p":[pubkey]
            }
        ]
    );

    sub.on("event", (ev) => {
        try {

            // (一応明示)リプライなので有効とするのはtagに値があるもののみ
            if(ev.tags.length > 0) {

                // リプライしても安全なら、リプライイベントを組み立てて送信する
                if (isSafeToReply(ev)) {
                    // 作動区分
                    let postKb = 0;
                    // フィードのポストの中にjsonで設定した値が存在するなら真
                    const target = replyChrJson.find(item => item.orgPost.some(post => ev.content.includes(post)));
                    // 反応語句を見つけたならそれに対応するリプライ語句を使ってリプライを返す
                    if(target) {

                        // 反応語句はjsonの何番目にいるか取得
                        const orgPostIdx = target.orgPost.findIndex(element => ev.content.includes(element));
                        // 反応語句は存在するはずだが、もし何らかの理由で見つからなかったら
                        if(orgPostIdx === -1) {
                            postKb = 1; // 全リプライ語句からのランダムリプライ
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
                            const replyChrPresetIdx = random(0, replyChrJson.length - 1);
                            // 配列要素を決めたら、その配列に設定されている反応語句の設定配列の範囲からさらにランダム値を取得
                            const replyChrIdx = random(0, replyChrJson[replyChrPresetIdx].replyPostChar.length - 1);
                            // リプライ語句決定
                            replyChr = replyChrJson[replyChrPresetIdx].replyPostChar[replyChrIdx];
                        } else {
                            if(postKb === 2) {
                                // jsonに設定されている対応するリプライの数を利用してランダムでリプライ語句を決める
                                const randomIdx = random(0, target.replyPostChar.length - 1);
                                // リプライ語句決定
                                replyChr = target.replyPostChar[randomIdx];
                            }
                        }
                        if(replyChr.length > 0) {   //念のため
                            // リプライ
                            const replyPost = composeReplyPost(replyChr, ev);
                            publishToRelay(relay, replyPost);
                            return;
                        }
                    } else {
                        return;
                    }
                }

            }
        } catch (err) {
            console.error(err);
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