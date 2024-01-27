/**
 * 狙撃屋13bot(@dukeTogo)
 * autoReply.js
 * フィードを購読し、リプライ対象となるポストがないか調べ、存在するならリプライする
 */
require("websocket-polyfill");
const { relayInit, getPublicKey, finishEvent, nip19 } = require("nostr-tools");
const { currUnixtime, jsonOpen, isSafeToReply, random, probabilityDetermination } = require("./common/utils.js");
const { publishToRelay } = require("./common/publishToRelay.js");

const relayUrl = "wss://relay-jp.nostr.wirednet.jp";

let BOT_PRIVATE_KEY_HEX;
let pubkey = "";
let adminPubkey = "";
let nativeWords = "";
let contentReaction = "";
let contentReactionImgURL = "";

const autoReply = async (relay) => {
    // jsonの場所を割り出すために
    const jsonPath = require("path");

    // jsonファイルの場所の設定
    const autoReplyPath = jsonPath.join(__dirname, "../config/autoReply.json");

    // 反応語句の格納されたjsonを取得
    const autoReplyJson = jsonOpen(autoReplyPath);
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
            // フィードのポストが nativeWords そのままか
            const isNativeWords = ((nativeWords.length > 0 && ev.content === nativeWords) ? true : false);
            // フィードのポストの中にjsonで設定した値が存在するか、フィードのポストが nativeWords そのままか
            if (target || isNativeWords) {
                // 存在しても自分のポストなら無視
                if(ev.pubkey === pubkey){
                    // なにもしない
                    return;
                } else {
                    // 誰かのポストが nativeWords そのものならリアクションする
                    // リプライする相手の公開鍵が管理者のものであるか、反応語句の前方に nativeWords が含まれるか、あるいは確率判定でOKならリプライする
                    let canPostit = false;
                    let postKb = 0;
                    // 誰かのポストが nativeWords そのもの
                    if(isNativeWords)　{
                        canPostit = true;
                        postKb = 1;
                    } else {                    
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
                            // 反応語句の前方に nativeWords が含まれる
                            if(nativeWords.length > 0 && substr.includes(nativeWords)) {
                                canPostit = true;
                            } else {
                                // 確率判定でOKだった
                                // target.probability は1～100で設定されている
                                if(probabilityDetermination(target.probability)) {
                                    canPostit = true;
                                }
                            }
                        }
                    }

                    if(canPostit == true) {
                        // リプライやリアクションしても安全なら、リプライイベントやリアクションイベントを組み立てて送信する
                        if (isSafeToReply(ev)) {
                            let replyPostorreactionPost;
                            if(postKb == 0) {
                                // jsonに設定されている対応する反応語句の数を利用してランダムで反応語句を決める
                                const randomIdx = random(0, target.replyPostChar.length - 1);
                                // リプライ
                                replyPostorreactionPost = composeReply(target.replyPostChar[randomIdx], ev);
                            } else {
                                // リアクション
                                replyPostorreactionPost = composeReaction(ev);
                            }
                            publishToRelay(relay, replyPostorreactionPost);
                            if(postKb == 1) {
                                // リプライ
                                replyPostorreactionPost = composeReply(":" + contentReaction + ":", ev);
                                publishToRelay(relay, replyPostorreactionPost);
                            }
                        }
                    } else {
                        // なにもしない
                        return;
                    }
                  
                }
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

// リアクションイベントを組み立てる
const composeReaction = (targetEvent) => {
    const ev = {
        kind: 7
        ,content: ":" + contentReaction + ":"
        ,tags: [ 
            ["p",targetEvent.pubkey,""]
            ,["e",targetEvent.id,""] 
            ,["emoji", contentReaction, contentReactionImgURL]
        ]
        ,created_at: currUnixtime(),
    };
    
    // イベントID(ハッシュ値)計算・署名
    return finishEvent(ev, BOT_PRIVATE_KEY_HEX);
}


const main = async () => {

    // 秘密鍵
    require("dotenv").config();
    const nsec = process.env.dukeTogo_BOT_PRIVATE_KEY;
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
    pubkey = getPublicKey(BOT_PRIVATE_KEY_HEX);                     // 秘密鍵から公開鍵の取得
    adminPubkey = process.env.admin_HEX_PUBKEY;                     // bot管理者の公開鍵の取得
    nativeWords = process.env.native_words;                         // 固有語句（botの名称などを設定し、単独で反応する語句とする）
    contentReaction = process.env.content_reaction;                 // 固有語句に反応するリアクションタグ
    contentReactionImgURL = process.env.content_reaction_imgURL;    // 固有語句に反応するリアクションタグのURL

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