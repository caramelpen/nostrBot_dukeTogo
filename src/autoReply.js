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

const autoReply = async (relay) => {
    // jsonの場所を割り出すために
    const jsonPath = require("path");

    // jsonファイルの場所の設定
    const autoReactionPath = jsonPath.join(__dirname, "../config/autoReaction.json");
    const autoReplyPath = jsonPath.join(__dirname, "../config/autoReply.json");
    
    // 反応語句の格納されたjsonを取得
    const autoReactionJson = jsonOpen(autoReactionPath);
    const autoReplyJson = jsonOpen(autoReplyPath);
    if(autoReactionJson === null || autoReplyJson === null){
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
            // フィードのポストが json の nativeWords プロパティそのものなら真
            const isNativeWords = ((autoReactionJson.nativeWords.length > 0 && ev.content === autoReactionJson.nativeWords) ? true : false);
            // フィードのポストが json の nativeWords プロパティそのものではないが、 nativeWords を含んでいるなら真
            const isIncludeWord = (  isNativeWords == false && (ev.content).includes(autoReactionJson.nativeWords) ? true : false);            

            // フィードのポストの中にjsonで設定した値が存在するか
            // フィードのポストが json の nativeWords プロパティそのものか
            // フィードのポストが json の nativeWords プロパティそのものではないが、 nativeWords を含んでいる
            if ( target || isNativeWords || isIncludeWord ) {
                // 自分のポストなら無視
                if(ev.pubkey === pubkey){
                    // なにもしない
                    return;
                } else {
                    // ①誰かのポストが nativeWords そのものならリアクションと、そのリアクション絵文字でリプライする
                    // ②誰かのポストが反応語句を含んでおり、その誰かが管理者のものであるか、反応語句の前方に nativeWords が含まれるか、反応語句の前方に nativeWords が含まれなくても確率判定でOKならリプライする
                    // ③反応語句はなくても管理者のポストに nativeWords が含まれているならリプライする
                    let canPostit = false;
                    let postKb = 0; // 誰かのポストが json の nativeWords プロパティそのもの区分
                    // 誰かのポストが json の nativeWords プロパティそのもの
                    if(isNativeWords)　{
                        canPostit = true;
                        postKb = 1;
                    } else {
                        // 反応語句発見
                        if(target) {
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
                                if(autoReactionJson.nativeWords.length > 0 && substr.includes(autoReactionJson.nativeWords)) {
                                    canPostit = true;
                                } else {
                                    // 確率判定でOKだった
                                    // target.probability は1～100で設定されている
                                    if(probabilityDetermination(target.probability)) {
                                        canPostit = true;
                                    }
                                }
                            }
                        // 反応語句はなくても管理者のポストに nativeWords が含まれているなら
                        } else if(isIncludeWord && ev.pubkey === adminPubkey) {
                            canPostit = true;
                            postKb = 2;
                        }
                    }

                    if(canPostit == true) {
                        // リプライやリアクションしても安全なら、リプライイベントやリアクションイベントを組み立てて送信する
                        if (isSafeToReply(ev)) {
                            let replyPostorreactionPost;
                            let randomReactionIdx;
                            if(postKb == 0) {
                                // jsonに設定されている対応する反応語句の数を利用してランダムで反応語句を決める
                                const randomIdx = random(0, target.replyPostChar.length - 1);
                                // リプライ
                                replyPostorreactionPost = composeReply(target.replyPostChar[randomIdx], ev);
                            } else if(postKb == 1) {
                                // jsonに設定されているリアクション絵文字の数を利用してランダムで反応語句を決める
                                randomReactionIdx = random(0, autoReactionJson.contentReaction.length - 1);
                                // randomReactionIdx 番目のカスタム絵文字URLが未設定ならそれはカスタム絵文字ではないので、リアクションせず、既存絵文字でリプライする
                                if(autoReactionJson.reactionImgURL.length > 0) {
                                    // リアクション
                                    replyPostorreactionPost = composeReaction(ev,autoReactionJson,randomReactionIdx);
                                } else {
                                    // リプライ
                                    replyPostorreactionPost = composeReply(autoReactionJson.contentReaction[randomReactionIdx], ev);
                                }
                            } else if(postKb == 2) {
                                // 反応語句配列の数の範囲からランダム値を取得し、それを配列要素とする
                                const replyChrPresetIdx = random(0, autoReplyJson.length - 1);
                                // 配列要素を決めたら、その配列に設定されている反応語句の設定配列の範囲からさらにランダム値を取得
                                const replyChrIdx = random(0, autoReplyJson[replyChrPresetIdx].replyPostChar.length - 1);
                                // リプライ語句決定
                                const replyChr = autoReplyJson[replyChrPresetIdx].replyPostChar[replyChrIdx];
                                // リプライ
                                replyPostorreactionPost = composeReply(replyChr, ev);
                            }
                            publishToRelay(relay, replyPostorreactionPost);
                            // 誰かのポストが nativeWords そのもの区分で、かつ カスタム絵文字URLが設定されているならリアクション絵文字でリプライも行う
                            if(postKb == 1 && autoReactionJson.reactionImgURL.length > 0 ) {
                                // リプライ
                                replyPostorreactionPost = composeReplyEmoji(ev,autoReactionJson,randomReactionIdx);
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
// 絵文字リプライイベントを組み立てる
const composeReplyEmoji = (targetEvent,autoReactionJson,randomReactionIdx) => {
    const ev = {
        pubkey: pubkey
        ,kind: 1
        ,content: ":" + autoReactionJson.contentReaction[randomReactionIdx] + ":"
        ,tags: [ 
            ["p",targetEvent.pubkey,""]
            ,["e",targetEvent.id,""] 
            ,["emoji", autoReactionJson.contentReaction[randomReactionIdx], autoReactionJson.reactionImgURL[randomReactionIdx]]
        ]
        ,created_at: currUnixtime()
    };

    // イベントID(ハッシュ値)計算・署名
    return finishEvent(ev, BOT_PRIVATE_KEY_HEX);
};


// リアクションイベントを組み立てる
const composeReaction = (targetEvent,autoReactionJson,randomReactionIdx) => {
    const ev = {
        kind: 7
        ,content: ":" + autoReactionJson.contentReaction[randomReactionIdx] + ":"
        ,tags: [ 
            ["p",targetEvent.pubkey,""]
            ,["e",targetEvent.id,""] 
            ,["emoji", autoReactionJson.contentReaction[randomReactionIdx], autoReactionJson.reactionImgURL[randomReactionIdx]]
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