/**
 * 狙撃屋13bot(@dukeTogo)
 * eachPostingFunctions.js
 * autoReply や replytoReply では共通のポスト仕様が適用されるためここで1本化する
 */
require("websocket-polyfill");
const axios = require("axios");
const { finishEvent } = require("nostr-tools");
const { currUnixtime, isSafeToReply, random, probabilityDetermination, retrievePostsInPeriod } = require("./common/utils.js");
const { publishToRelay } = require("./common/publishToRelay.js");

let BOT_PRIVATE_KEY_HEX = "";
let pubKey = "";
let adminPubkey = "";

const initial = (envKeys) => {
    BOT_PRIVATE_KEY_HEX = envKeys.BOT_PRIVATE_KEY_HEX;
    pubKey = envKeys.pubKey;
    adminPubkey = envKeys.adminPubkey;
}


let replyChr = "";

// 機能投稿
const functionalPosting = async (relay, ev, functionalPostingJson, autoReactionJson, postInfoObj, isFromReplytoReply = false) => {

    try {
        // フィードのポストの中にjsonで設定した値が存在するなら真
        const target = functionalPostingJson.find(item => item.orgPost.some(post => ev.content.includes(post)));
        // フィードのポストがjsonの nativeWords プロパティそのものなら真
        const isNativeWords = autoReactionJson.nativeWords.length > 0 && autoReactionJson.nativeWords.some(name => name === ev.content) ? true : false;
        // フィードのポストがjsonの nativeWords プロパティそのものではなくて、 nativeWords を含んでいるなら真
        //const isIncludeWord = !isNativeWords && autoReactionJson.nativeWords.some(element => (ev.content).includes(element)) ? true : false;
        const isIncludeWord = !isFromReplytoReply ? (!isNativeWords && autoReactionJson.nativeWords.some(element => (ev.content).includes(element)) ? true : false) : true;

        // 投稿者が管理者なら真
        const isAdminPubkey = ev.pubkey === adminPubkey ? true : false;
        // 公開キー ev.Pubkey のフォローの中に自分の公開キー pubkey がいるなら真
        let isChkMyFollower = false;
        // 作動区分
        postInfoObj.postCategory = 0;

        replyChr = "";
        // 反応語句が存在し、フィードのポストがjsonの nativeWords プロパティそのものではなくて、 nativeWords を含んでいる
        if(target && isIncludeWord) {

            // 投稿者が管理者
            if(isAdminPubkey) {
                // 自分のフォロアと同じ扱い
                isChkMyFollower = true;
            // 投稿者が管理者以外
            } else {
                // 公開キー ev.Pubkey のフォローの中に自分の公開キー pubkey がいるなら真
                //isChkMyFollower = await chkMyFollower(relay, ev.pubkey);
                isChkMyFollower = isFromReplytoReply ? true : await chkMyFollower(relay, ev.pubkey);
            }
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
                    // リプライ語句をためる
                    replyChr = "";
                    for(let i = 0; i <= target.replyPostChar.length - 1; i++) {
                        replyChr += target.replyPostChar[i];
                    }
                    postInfoObj.postCategory = 1;
                }

                // 作動対象だ
                if(postInfoObj.postCategory > 0) {
                    // リプライやリアクションしても安全なら、リプライイベントやリアクションイベントを組み立てて送信する
                    if (isSafeToReply(ev) && retrievePostsInPeriod(relay, pubKey)) {
                        // リプライ
                        //const replyPostEv = composeReply(replyChr, ev);
                        const replyPostEv = !isFromReplytoReply ? composeReply(replyChr, ev) : composeReplytoReply(replyChr, ev);

                        publishToRelay(relay, replyPostEv, (isFromReplytoReply ? false : true), ev.pubkey, ev.content);
                    }
                }
            }
        }

    } catch (err) {
        throw err;
    }

}

// 為替
const exchangeRate = async (relay, ev, exchangeRate, autoReactionJson, postInfoObj, isFromReplytoReply = false) => {
    try {
        // フィードのポストの中にjsonで設定した値が存在するなら真
        const priorityTarget = exchangeRate.find(item => item.orgPost.some(post => ev.content.includes(post)));
        // フィードのポストがjsonの nativeWords プロパティそのものなら真
        const isNativeWords = autoReactionJson.nativeWords.length > 0 && autoReactionJson.nativeWords.some(name => name === ev.content) ? true : false;
        // フィードのポストがjsonの nativeWords プロパティそのものではなくて、 nativeWords を含んでいるなら真
        //const isIncludeWord = !isNativeWords && autoReactionJson.nativeWords.some(element => (ev.content).includes(element)) ? true : false;
        const isIncludeWord = !isFromReplytoReply ? (!isNativeWords && autoReactionJson.nativeWords.some(element => (ev.content).includes(element)) ? true : false) : true;

        // 投稿者が管理者なら真
        const isAdminPubkey = ev.pubkey === adminPubkey ? true : false;
        // 公開キー ev.Pubkey のフォローの中に自分の公開キー pubkey がいるなら真
        let isChkMyFollower = false;
        // 作動区分
        postInfoObj.postCategory = 0;

        replyChr = "";

        // 通貨反応語句が存在し、フィードのポストがjsonの nativeWords プロパティそのものではなくて、 nativeWords を含んでいる（APIキーが取得できていて当然）
        if(priorityTarget && isIncludeWord) {
            let arrayRet = [];

            // 投稿者が管理者
            if(isAdminPubkey) {
                // 自分のフォロアと同じ扱い
                isChkMyFollower = true;
            // 投稿者が管理者以外
            } else {
                // 公開キー ev.Pubkey のフォローの中に自分の公開キー pubkey がいるなら真
                //isChkMyFollower = await chkMyFollower(relay, ev.pubkey);
                isChkMyFollower = isFromReplytoReply ? true : await chkMyFollower(relay, ev.pubkey);
            }
            if(isChkMyFollower) {

                // 反応語句はjsonの何番目にいるか取得
                const orgPostIdx = priorityTarget.orgPost.findIndex(element => ev.content.includes(element));
                // 反応語句は存在するはずだが、もし何らかの理由で見つからなかったらなにもしない
                if(orgPostIdx === -1) {
                    return;
                }

                // 反応語句はポストの何文字目にいるか取得
                const chridx = ev.content.indexOf(priorityTarget.orgPost[orgPostIdx]);
                // 反応語句の前方を収める
                const fowardSubstr = ev.content.substring(0, chridx);
                // 反応語句の前方に配列で設定した nativeWords が含まれる
                if(autoReactionJson.nativeWords.length > 0 && autoReactionJson.nativeWords.some(word => fowardSubstr.includes(word))) {
                    arrayRet = [];
                    // 通貨レート
                    if(priorityTarget.sw === 1) {
                        // 正規表現パターンを構築
                        const pattern = new RegExp(`(.{0,3})${priorityTarget.orgPost}(.{0,3})`);

                        // 文字列を検索し、一致した部分を取得
                        const match = ev.content.match(pattern);

                        if (match) {
                            const preceding = match[1]; // 前の3文字
                            const following = match[2]; // 後ろの3文字
                            arrayRet = await getAvailableCurrencies(preceding, following, priorityTarget.sw);
                            if(arrayRet.length <= 0) {
                                replyChr = priorityTarget.nonGet[0];
                                postInfoObj.postCategory = 1;    // 通貨単位は無効であることをポストするので有効とする
                            } else {
                                replyChr = "1 " + preceding + " は " + parseFloat(arrayRet[0]).toLocaleString() + " " + following + " " + priorityTarget.replyPostChar[0];
                            }
                        }
                    // 通貨一覧
                    } else {
                        arrayRet = await getAvailableCurrencies("", "", priorityTarget.sw);
                        replyChr = "";
                        let j = 1;
                        for (let i = 0; i < arrayRet.length; i++) {
                            replyChr += (replyChr.length > 0 ? "," : "") + arrayRet[i];
                            if(j === 10) { // 10個ごとに改行
                                j = 0;
                                replyChr += (i < arrayRet.length - 1? "\n": "");
                            }
                            j++;
                        }
                    }

                    if(arrayRet.length > 0) {
                        postInfoObj.postCategory = 1;
                    }                    
                }
            }
        }

        // 作動対象だ
        if(postInfoObj.postCategory > 0) {
            // リプライしても安全なら、リプライイベントやリアクションイベントを組み立てて送信する
            if (isSafeToReply(ev) && retrievePostsInPeriod(relay, pubKey)) {
                // リプライ
                //const replyPostorreactionPostEv = composeReply(replyChr, ev);
                const replyPostorreactionPostEv = !isFromReplytoReply ? composeReply(replyChr, ev) : composeReplytoReply(replyChr, ev);

                publishToRelay(relay, replyPostorreactionPostEv, (isFromReplytoReply ? false : true), ev.pubkey, ev.content);
            }
        }



    } catch(err) {
        throw err;
    }

}

// 通常反応リプライ
const normalAutoReply = async (relay, ev, autoReplyJson, autoReactionJson, postInfoObj, isFromReplytoReply = false) => {
    try {
        // フィードのポストの中にjsonで設定した値が存在するなら真
        const target = autoReplyJson.find(item => item.orgPost.some(post => ev.content.includes(post)));
        // フィードのポストがjsonの nativeWords プロパティそのものなら真
        const isNativeWords = autoReactionJson.nativeWords.length > 0 && autoReactionJson.nativeWords.some(name => name === ev.content) ? true : false;
        // フィードのポストがjsonの nativeWords プロパティそのものではなくて、 nativeWords を含んでいるなら真（isFromReplytoReply 経由ならいつでも真）
        //const isIncludeWord = !isNativeWords && autoReactionJson.nativeWords.some(element => (ev.content).includes(element)) ? true : false; 
        const isIncludeWord = !isFromReplytoReply ? (!isNativeWords && autoReactionJson.nativeWords.some(element => (ev.content).includes(element)) ? true : false) : true; 

        // 投稿者が管理者なら真
        const isAdminPubkey = ev.pubkey === adminPubkey ? true : false;
        // 公開キー ev.Pubkey のフォローの中に自分の公開キー pubkey がいるなら真
        let isChkMyFollower = false;
        // 作動区分
        postInfoObj.postCategory = 0;
        
        // 反応語句を発見
        if(target) {

            // 投稿者が管理者
            if(isAdminPubkey) {
                postInfoObj.postCategory = 1;     // リプライ
            // 投稿者が管理者以外
            } else {
                // 公開キー ev.Pubkey のフォローの中に自分の公開キー pubkey がいるなら真
                //isChkMyFollower = await chkMyFollower(relay, ev.pubkey);
                isChkMyFollower = isFromReplytoReply ? true : await chkMyFollower(relay, ev.pubkey);

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
                        postInfoObj.postCategory = 1;     // リプライ
                    } else {
                        if(isFromReplytoReply) {
                            postInfoObj.postCategory = 1;     // リプライ
                        } else {
                            // 確率判定でOKだった
                            // target.probability は0～100で設定されている
                            if(probabilityDetermination(target.probability)) {
                                postInfoObj.postCategory = 1;     // リプライ
                            } else {
                                // 確率で外れたら倍の確率でやってみる
                                if(probabilityDetermination(target.probability * 2)) {
                                    // リアクション
                                    postInfoObj.postCategory = 5;
                                } else {
                                    // ログに確率で外れたことを書いておく
                                    console.log("out of probability determination:" + target.orgPost);
                                }
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
                    postInfoObj.postCategory = 2;     // リプライ(全リプライ語句からのランダムリプライ)
                // フィードのポストがjsonの nativeWords プロパティそのもの
                } else if(isNativeWords) {
                    postInfoObj.postCategory = 3;     // リアクションとリアクション絵文字でのリプライ
                }
            // 投稿者が管理者以外
            } else {
                // フィードのポストがjsonの nativeWords プロパティそのもので、かつ自分をフォローしている人なら
                if(isNativeWords) {
                    //isChkMyFollower = await chkMyFollower(relay, ev.pubkey);
                    isChkMyFollower = isFromReplytoReply ? true : await chkMyFollower(relay, ev.pubkey);

                    if(isChkMyFollower) {
                        postInfoObj.postCategory = 3;     // リアクションとリアクション絵文字でのリプライ
                    }
                }
            }

        }

        // 作動対象だ
        if(postInfoObj.postCategory > 0) {
            replyChr = "";

            // リプライやリアクションしても安全なら、リプライイベントやリアクションイベントを組み立てて送信する
            if (isSafeToReply(ev) && retrievePostsInPeriod(relay, pubKey)) {
                let replyPostorreactionPostEv;
                let randomReactionIdx;
                if(postInfoObj.postCategory === 1) {
                    // jsonに設定されている対応するリプライ語句の数を利用してランダムでリプライ語句を決める
                    const randomIdx = random(0, target.replyPostChar.length - 1);
                    // リプライ
                    //replyPostorreactionPostEv = composeReply(target.replyPostChar[randomIdx], ev);
                    replyPostorreactionPostEv = !isFromReplytoReply ? composeReply(target.replyPostChar[randomIdx], ev) : composeReplytoReply(target.replyPostChar[randomIdx], ev);

                } else if(postInfoObj.postCategory === 2) {
                    // 反応語句配列の数の範囲からランダム値を取得し、それを配列要素とする
                    const replyChrPresetIdx = random(0, autoReplyJson.length - 1);
                    // 配列要素を決めたら、その配列に設定されているリプライ語句の設定配列の範囲からさらにランダム値を取得
                    const replyChrIdx = random(0, autoReplyJson[replyChrPresetIdx].replyPostChar.length - 1);
                    // リプライ語句決定
                    replyChr = autoReplyJson[replyChrPresetIdx].replyPostChar[replyChrIdx];
                    // リプライ
                    //replyPostorreactionPostEv = composeReply(replyChr, ev);
                    replyPostorreactionPostEv = !isFromReplytoReply ? composeReply(replyChr, ev) : composeReplytoReply(replyChr, ev);

                } else if(postInfoObj.postCategory === 3) {
                    // jsonに設定されているリアクション絵文字の数を利用してランダムで反応語句を決める
                    randomReactionIdx = random(0, autoReactionJson.contentReaction.length - 1);
                    // randomReactionIdx 番目のカスタム絵文字URLが設定されているならリアクション
                    if(autoReactionJson.reactionImgURL[randomReactionIdx].length > 0) {
                        postInfoObj.postCategory = 4;
                        // リアクション
                        replyPostorreactionPostEv = composeReaction(ev, autoReactionJson, randomReactionIdx);
                    // カスタム絵文字URLが未設定ならそれはカスタム絵文字ではないので、リアクションせず、既存絵文字でリプライする
                    } else {
                        // リプライ
                        //replyPostorreactionPostEv = composeReply(autoReactionJson.contentReaction[randomReactionIdx], ev);
                        replyPostorreactionPostEv = !isFromReplytoReply ? composeReply(autoReactionJson.contentReaction[randomReactionIdx], ev) : composeReplytoReply(autoReactionJson.contentReaction[randomReactionIdx], ev);

                    }

                } else if(postInfoObj.postCategory === 5) {
                    //100回まわってカスタム絵文字URLが設定されている要素をランダム取得出来たらリアクション（100に意味はない　なんとなく）
                    for (let i = 0; i < 100; i++) {
                        randomReactionIdx = random(0, autoReactionJson.contentReaction.length - 1);
                        // randomReactionIdx 番目のカスタム絵文字URLが設定されているならリアクション
                        if(autoReactionJson.reactionImgURL[randomReactionIdx].length > 0) {
                            // リアクション
                            replyPostorreactionPostEv = composeReaction(ev, autoReactionJson, randomReactionIdx);
                            break;
                        }
                    }
                    // なにもしない
                    return;
                }

                publishToRelay(relay, replyPostorreactionPostEv, (isFromReplytoReply ? false : true), ev.pubkey, ev.content);
                // リアクションとリアクション絵文字でのリプライを行う動作区分で、かつカスタム絵文字URLが設定されているならリアクション絵文字でリプライも行う
                if(postInfoObj.postCategory === 4) {
                    // リプライ
                    replyPostorreactionPostEv = composeReplyEmoji(ev, autoReactionJson, randomReactionIdx);
                    publishToRelay(relay, replyPostorreactionPostEv, (isFromReplytoReply ? false : true), ev.pubkey, ev.content);
                }
            }
        }

    } catch(err) {
        throw err;
    }
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
                const hasMatch = ev.tags.some(tag => tag[1] === pubKey);    // "p","公開キー" という構成なので[1]
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




// 利用可能な通貨の一覧を取得する関数
const  getAvailableCurrencies = async (baseCurrency, targetCurrency, funcSw ) => {
    let currencyList = [];
    let arrayRet = [];

    // 為替レート
    if(funcSw === 1) {
        if(baseCurrency.length <= 0 || targetCurrency.length <= 0) {
            // なにもしない
            return arrayRet;
        }
    }

    try {

        const API_URL_Asset = "https://api.kraken.com/0/public/AssetPairs";
        const responseAsset = await axios.get(API_URL_Asset);
        const dataAsset = responseAsset.data;
        const assetPairs = dataAsset.result;
        const baseCurrencies = Object.values(assetPairs).map(pairData => pairData.wsname);
        // 通貨リストを収める
        currencyList = [];
        for (let i = 0; i <= baseCurrencies.length - 1; i++) {
            let wkcu = [];
            // 「/」を分割
            wkcu = baseCurrencies[i].split("/");
            // push() メソッドを使用して値を追加
            currencyList.push(wkcu[0]);
            currencyList.push(wkcu[1]);
        }
        // 重複を除去
        const uniquecurrencyList = [...new Set(currencyList)];
        const API_URL = "https://api.kraken.com/0/public/Ticker";
        const pair = baseCurrency + targetCurrency;

        // 為替レート
        if(funcSw === 1) {
            const response = await axios.get(`${API_URL}?pair=${pair}`);
            const data = response.data;
            if (data.error && data.error.length) {
                // 取得できない場合はなにもしない
            } else {
                const pairInfo = data.result[Object.keys(data.result)[0]]; // レスポンス内の最初のペアを取得
                const lastTrade = pairInfo.c[0]; // 最終取引価格
                arrayRet.push(lastTrade);
            }
            return arrayRet;

        } else {
            // 通貨リストをそのまま返す
            return uniquecurrencyList;
        }

    } catch (err) {
        console.error("getAvailableCurrencies:", err);
        throw err;
    }
}


// リプライイベントを組み立てる
const composeReply = (replyPostChar, targetEvent) => {
    const ev = {
        pubkey: pubKey
        ,kind: 1
        ,content: replyPostChar
        ,tags: [ 
            ["p", targetEvent.pubkey, ""]
            ,["e", targetEvent.id, ""] 
        ]
        ,created_at: currUnixtime()
    };

    // イベントID(ハッシュ値)計算・署名
    return finishEvent(ev, BOT_PRIVATE_KEY_HEX);
};
// 絵文字リプライイベントを組み立てる
const composeReplyEmoji = (targetEvent,autoReactionJson,randomReactionIdx) => {
    const ev = {
        pubkey: pubKey
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



// テキスト投稿イベント(リプライ)を組み立てる
const composeReplytoReply = (content, targetEvent) => {
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



/**
 * module.exports
 */
module.exports = {
    initial
    ,functionalPosting   // 機能ポスト
    ,exchangeRate       // 為替ポスト
    ,normalAutoReply    // 通常リプライ
};
  