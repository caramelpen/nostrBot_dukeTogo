/**
 * 狙撃屋13bot(@dukeTogo)
 * autoReply.js
 * フィードを購読し、リプライ対象となるポストがないか調べ、存在するならリプライ等の動作をする
 */
require("websocket-polyfill");
const { relayInit, getPublicKey, finishEvent, nip19 } = require("nostr-tools");
const { currUnixtime, jsonOpen, isSafeToReply, random, probabilityDetermination } = require("./common/utils.js");
const { publishToRelay } = require("./common/publishToRelay.js");

let relayUrl = "";
let BOT_PRIVATE_KEY_HEX = "";
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
    sub.on("event", async (ev) => {
        try {
            // フィードのポストの中にjsonで設定した値が存在するなら真
            const target = autoReplyJson.find(item => item.orgPost.some(post => ev.content.includes(post)));
            // フィードのポストがjsonの nativeWords プロパティそのものなら真
            const isNativeWords = autoReactionJson.nativeWords.length > 0 && autoReactionJson.nativeWords.some(name => name === ev.content) ? true : false;
            // フィードのポストがjsonの nativeWords プロパティそのものではなくて、 nativeWords を含んでいるなら真
            const isIncludeWord = !isNativeWords && autoReactionJson.nativeWords.some(element => (ev.content).includes(element)) ? true : false; 
            // 投稿者が管理者なら真
            const isAdminPubkey = ev.pubkey === adminPubkey ? true : false;

            let isChkMyFollower = false;
            // 作動区分
            let postKb = 0;
            // 反応語句を発見
            if(target) {

                // 投稿者が管理者
                if(isAdminPubkey) {
                    postKb = 1;     // リプライ
                // 投稿者が管理者以外
                } else {
                    // 公開キー ev.Pubkey のフォローの中に自分の公開キー pubkey がいるなら真
                    isChkMyFollower = await chkMyFollower(relay, ev.pubkey);
                    if(isChkMyFollower) {
                        // 反応語句はjsonの何番目にいるか取得
                        const orgPostIdx = target.orgPost.findIndex(element => ev.content.includes(element));
                        // 反応語句は存在するはずだが、もし何らかの理由で見つからなかったらなにもしない
                        if(orgPostIdx === -1) {
                            return;
                        }
                        // 反応語句はポストの何文字目にいるか取得
                        const chridx = ev.content.indexOf(target.orgPost[orgPostIdx]);
                        // 反応語句の前方を収める
                        const fowardSubstr = ev.content.substring(0, chridx);
                        // 反応語句の前方に配列で設定した nativeWords が含まれる
                        if(autoReactionJson.nativeWords.length > 0 && autoReactionJson.nativeWords.some(word => fowardSubstr.includes(word))) {
                            postKb = 1;     // リプライ
                        } else {
                            // 確率判定でOKだった
                            // target.probability は0～100で設定されている
                            if(probabilityDetermination(target.probability)) {
                                postKb = 1;     // リプライ
                            } else {
                                // 確率で外れたら倍の確率でやってみる
                                if(probabilityDetermination(target.probability * 2)) {
                                    // リアクション
                                    postKb = 5;
                                }
                            }
                        }
                    }
                }

            // 反応語句未発見
            } else {
                // 投稿者が管理者
                if(isAdminPubkey) {
                    // フィードのポストがjsonの nativeWords プロパティそのものではないが、ポスト内のどこかに nativeWords を含んでいる
                    if(isIncludeWord) {
                        postKb = 2;     // リプライ(全リプライ語句からのランダムリプライ)
                    // フィードのポストがjsonの nativeWords プロパティそのもの
                    } else if(isNativeWords) {
                        postKb = 3;     // リアクションとリアクション絵文字でのリプライ
                    }
                // 投稿者が管理者以外
                } else {
                    // フィードのポストがjsonの nativeWords プロパティそのもので、かつ自分をフォローしている人なら
                    if(isNativeWords) {
                        isChkMyFollower = await chkMyFollower(relay, ev.pubkey);
                        if(isChkMyFollower) {
                            postKb = 3;     // リアクションとリアクション絵文字でのリプライ
                        }
                    }
                }

            }

            // 作動対象だ
            if(postKb > 0) {
                // リプライやリアクションしても安全なら、リプライイベントやリアクションイベントを組み立てて送信する
                if (isSafeToReply(ev)) {
                    let replyPostorreactionPost;
                    let randomReactionIdx;
                    if(postKb === 1) {
                        // jsonに設定されている対応するリプライ語句の数を利用してランダムでリプライ語句を決める
                        const randomIdx = random(0, target.replyPostChar.length - 1);
                        // リプライ
                        replyPostorreactionPost = composeReply(target.replyPostChar[randomIdx], ev);

                    } else if(postKb === 2) {
                        // 反応語句配列の数の範囲からランダム値を取得し、それを配列要素とする
                        const replyChrPresetIdx = random(0, autoReplyJson.length - 1);
                        // 配列要素を決めたら、その配列に設定されているリプライ語句の設定配列の範囲からさらにランダム値を取得
                        const replyChrIdx = random(0, autoReplyJson[replyChrPresetIdx].replyPostChar.length - 1);
                        // リプライ語句決定
                        const replyChr = autoReplyJson[replyChrPresetIdx].replyPostChar[replyChrIdx];
                        // リプライ
                        replyPostorreactionPost = composeReply(replyChr, ev);

                    } else if(postKb === 3) {
                        // jsonに設定されているリアクション絵文字の数を利用してランダムで反応語句を決める
                        randomReactionIdx = random(0, autoReactionJson.contentReaction.length - 1);
                        // randomReactionIdx 番目のカスタム絵文字URLが設定されているならリアクション
                        if(autoReactionJson.reactionImgURL[randomReactionIdx].length > 0) {
                            postKb = 4;
                            // リアクション
                            replyPostorreactionPost = composeReaction(ev, autoReactionJson, randomReactionIdx);
                        // カスタム絵文字URLが未設定ならそれはカスタム絵文字ではないので、リアクションせず、既存絵文字でリプライする
                        } else {
                            // リプライ
                            replyPostorreactionPost = composeReply(autoReactionJson.contentReaction[randomReactionIdx], ev);
                        }

                    } else if(postKb === 5) {
                        //100回まわってカスタム絵文字URLが設定されている要素をランダム取得出来たらリアクション（100に意味はない　なんとなく）
                        for (let i = 0; i < 100; i++) {
                            randomReactionIdx = random(0, autoReactionJson.contentReaction.length - 1);
                            // randomReactionIdx 番目のカスタム絵文字URLが設定されているならリアクション
                            if(autoReactionJson.reactionImgURL[randomReactionIdx].length > 0) {
                                // リアクション
                                replyPostorreactionPost = composeReaction(ev, autoReactionJson, randomReactionIdx);
                                break;
                            }
                        }
                        // なにもしない
                        return;
                    }

                    publishToRelay(relay, replyPostorreactionPost);
                    // リアクションとリアクション絵文字でのリプライを行う動作区分で、かつカスタム絵文字URLが設定されているならリアクション絵文字でリプライも行う
                    if(postKb === 4) {
                        // リプライ
                        replyPostorreactionPost = composeReplyEmoji(ev, autoReactionJson, randomReactionIdx);
                        publishToRelay(relay, replyPostorreactionPost);
                    }
                } else {
                    // なにもしない
                    return;
                }
            }
        } catch (err){
            console.error(err);
        }
    });
}


// 投稿者の公開キー evPubkey のフォローの中に自分の公開キー pubkey がいるなら真
const chkMyFollower = (relay, evPubkey) => {
    return new Promise((resolve, reject) => {
        // フィードを購読
        const sub = relay.sub(
            [
                { "kinds": [3], "authors": [evPubkey] }
            ]
        );
        try {
            sub.on("event",  (ev) => {
                const hasMatch = ev.tags.some(tag => tag[1] === pubkey);    // "p","公開キー" という構成なので[1]
                if (hasMatch) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            });
        } catch {
            reject(false);
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
    pubkey = getPublicKey(BOT_PRIVATE_KEY_HEX);               // 秘密鍵から公開鍵の取得
    adminPubkey = process.env.admin_HEX_PUBKEY;               // bot管理者の公開鍵の取得
    relayUrl = process.env.RELAY_URL;                         // リレーURL


    // リレー
    const relay = await relayInit(relayUrl);
    relay.on("error", () => {
        relay.close();
        console.error("autoReply:failed to connect");
        return;
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