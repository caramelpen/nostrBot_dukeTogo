/**
 * 狙撃屋13bot(@dukuTogo)
 * autoReply.js
 * フィードを購読し、リプライ対象となるポストがないか調べ、存在するならリプライする
 */
require("websocket-polyfill");
const { relayInit, getPublicKey, finishEvent, nip19 } = require("nostr-tools");
const { currUnixtime, jsonOpen, isSafeToReply, random, probabilityDetermination } = require("./common/utils.js");
const { publishToRelay } = require("./common/publishToRelay.js");

const relayUrl = "wss://relay-jp.nostr.wirednet.jp";

let BOT_PRIVATE_KEY_HEX;
let pubkey;
let adminPubkey = "";

const autoReply = async (relay) => {
    // jsonの場所を割り出すために
    const jsonPath = require("path");

    // jsonファイルの場所の設定
    const autoReplyPath = jsonPath.join(__dirname, "../config/autoReply.json");

    // 反応語句の格納されたjsonを取得
    const autoReplyJson = jsonOpen(autoReplyPath);
    //console.log(Array.isArray(autoReplyJson));
    if(autoReplyJson === null){
        console.log("json file is not get");
        return;
    }

    // フィードを購読
    const sub = relay.sub(
                [{ kinds: [1] }]
                );
    sub.on("event", (ev) => {
        try {
            // フィードのポストの中にjsonで設定した値が存在するか
            const target = autoReplyJson.find(item => item.orgPost.some(post => ev.content.includes(post)));
            if (target) {
                // 存在しても自分のポストなら無視
                if(ev.pubkey === pubkey){
                    // なにもしない
                    return;
                } else {

                    // リプライする相手の公開鍵が管理者のものであるか、反応語句の前方に「ゴルゴ」が含まれるか、あるいは確率判定でOKならリプライする
                    let canPostit = false;
                    // リプライする相手の公開鍵が管理者のもの
                    if(ev.pubkey === adminPubkey) {
                        canPostit = true;
                    } else {
                        // 反応語句はjsonの何番目にいるか取得
                        const orgPostIdx = target.orgPost.findIndex(element => ev.content.includes(element));
                        if(orgPostIdx === -1) {
                            return;
                        }
                        // 反応語句はポストの何文字目にいるか取得
                        const chridx = ev.content.indexOf(target.orgPost[orgPostIdx]);
                        // 反応語句の前方を収める
                        const substr = ev.content.substring(0, chridx);
                        // 反応語句の前方に「ゴルゴ」が含まれる
                        if(substr.includes("ゴルゴ")) {
                            canPostit = true;
                        } else {
                            // 確率判定でOK
                            // target.probability は1～100で設定されている
                            if(probabilityDetermination(target.probability)) {
                                canPostit = true;
                            }
                        }
                    }

                    if(canPostit == true) {
                        // リプライしても安全なら、リプライイベントを組み立てて送信する
                        if (isSafeToReply(ev)) {
                            // jsonに設定されている対応する反応語句の数を利用してランダムで反応語句を決める
                            const randomIdx = random(0, target.replyPostChar.length - 1);
                            //console.log(target.replyPostChar[randomIdx]);
                            // リプライ
                            const replyPost = composeReply(target.replyPostChar[randomIdx], ev);
                            publishToRelay(relay, replyPost);
                        }
                    } else {
                        // なにもしない
                        return;
                    }
                  
                }
            } else {
                // なにもしない
                //console.log('Not found');
            }
        } catch (err){
            console.error(err);
        }
    });
}

// リプライイベントを組み立てる
const composeReply = (replyPostChar, targetEvent) => {
    const ev = {
        pubkey: pubkey
        ,kind: 1
        ,content: replyPostChar
        ,tags: [ 
            ["p",targetEvent.pubkey,""]
            ,["e",targetEvent.id,""] 
        ]
        ,created_at: currUnixtime()
    };

    // イベントID(ハッシュ値)計算・署名
    return finishEvent(ev, BOT_PRIVATE_KEY_HEX);
};


const main = async () => {

    // 秘密鍵
    require("dotenv").config();
    //console.log(require("dotenv").config());
    const nsec = process.env.dukuTogo_BOT_PRIVATE_KEY;
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
  
    adminPubkey = process.env.admin_HEX_PUBKEY;

    // リレー
    const relay = relayInit(relayUrl);
    relay.on("error", () => {
        relay.close();
        console.error("autoReply:failed to connect");
        return;
    });
    await relay.connect(relay);
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