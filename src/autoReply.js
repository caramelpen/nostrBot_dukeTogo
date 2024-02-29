/**
 * 狙撃屋13bot(@dukeTogo)
 * autoReply.js
 * フィードを購読し、リプライ対象となるポストがないか調べ、存在するならリプライ等の動作をする
 */
require("websocket-polyfill");
const axios = require("axios");
const { relayInit, getPublicKey, finishEvent, nip19 } = require("nostr-tools");
const { currUnixtime, jsonOpen, jsonSetandOpen, isSafeToReply, random, probabilityDetermination } = require("./common/utils.js");
const { publishToRelay } = require("./common/publishToRelay.js");

let relayUrl = "";
let BOT_PRIVATE_KEY_HEX = "";
let pubkey = "";
let adminPubkey = "";
let apiKey = "";
// 作動区分
let postCategory = 0;
let replyChr = "";


// 機能投稿
const functionalPosting = async (relay, ev, functionalPostingJson, autoReactionJson) => {
    try {
        // フィードのポストの中にjsonで設定した値が存在するなら真
        const target = functionalPostingJson.find(item => item.orgPost.some(post => ev.content.includes(post)));
        // フィードのポストがjsonの nativeWords プロパティそのものなら真
        const isNativeWords = autoReactionJson.nativeWords.length > 0 && autoReactionJson.nativeWords.some(name => name === ev.content) ? true : false;
        // フィードのポストがjsonの nativeWords プロパティそのものではなくて、 nativeWords を含んでいるなら真
        const isIncludeWord = !isNativeWords && autoReactionJson.nativeWords.some(element => (ev.content).includes(element)) ? true : false; 
        // 投稿者が管理者なら真
        const isAdminPubkey = ev.pubkey === adminPubkey ? true : false;
        // 公開キー ev.Pubkey のフォローの中に自分の公開キー pubkey がいるなら真
        let isChkMyFollower = false;
        // 作動区分
        postCategory = 0;

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
                isChkMyFollower = await chkMyFollower(relay, ev.pubkey);
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
                    postCategory = 1;
                }

                // 作動対象だ
                if(postCategory > 0) {
                    // リプライやリアクションしても安全なら、リプライイベントやリアクションイベントを組み立てて送信する
                    if (isSafeToReply(ev)) {
                        // リプライ
                        const replyPost = composeReply(replyChr, ev);
                        publishToRelay(relay, replyPost);
                    }
                }
            }
        }

    } catch (err) {
        throw err;
    }

}

// 為替
const exchangeRate = async (relay, ev, exchangeRate, autoReactionJson) => {
    try {
        // フィードのポストの中にjsonで設定した値が存在するなら真
        const priorityTarget = exchangeRate.find(item => item.orgPost.some(post => ev.content.includes(post)));
        // フィードのポストがjsonの nativeWords プロパティそのものなら真
        const isNativeWords = autoReactionJson.nativeWords.length > 0 && autoReactionJson.nativeWords.some(name => name === ev.content) ? true : false;
        // フィードのポストがjsonの nativeWords プロパティそのものではなくて、 nativeWords を含んでいるなら真
        const isIncludeWord = !isNativeWords && autoReactionJson.nativeWords.some(element => (ev.content).includes(element)) ? true : false; 
        // 投稿者が管理者なら真
        const isAdminPubkey = ev.pubkey === adminPubkey ? true : false;
        // 公開キー ev.Pubkey のフォローの中に自分の公開キー pubkey がいるなら真
        let isChkMyFollower = false;
        // 作動区分
        postCategory = 0;

        replyChr = "";

        // 通貨反応語句が存在し、フィードのポストがjsonの nativeWords プロパティそのものではなくて、 nativeWords を含んでいる（APIキーが取得できていて当然）
        if(apiKey.length > 0 && priorityTarget && isIncludeWord) {
            let arrayRet = [];

            // 投稿者が管理者
            if(isAdminPubkey) {
                // 自分のフォロアと同じ扱い
                isChkMyFollower = true;
            // 投稿者が管理者以外
            } else {
                // 公開キー ev.Pubkey のフォローの中に自分の公開キー pubkey がいるなら真
                isChkMyFollower = await chkMyFollower(relay, ev.pubkey);
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
                                postCategory = 1;    // 通貨単位は無効であることをポストするので有効とする
                            } else {
                                replyChr = "1 " + preceding + " は " + arrayRet[0] + " " + following + " " + priorityTarget.replyPostChar[0];
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
                        postCategory = 1;
                    }                    
                }
            }
        }
        // 作動対象だ
        if(postCategory > 0) {
            // リプライやリアクションしても安全なら、リプライイベントやリアクションイベントを組み立てて送信する
            if (isSafeToReply(ev)) {
                // リプライ
                const replyPostorreactionPost = composeReply(replyChr, ev);
                publishToRelay(relay, replyPostorreactionPost);
            }
        }



    } catch(err) {
        throw err;
    }

}

// 通常反応リプライ
const normalAutoReply = async (relay, ev, autoReplyJson, autoReactionJson) => {
    try {
        // フィードのポストの中にjsonで設定した値が存在するなら真
        const target = autoReplyJson.find(item => item.orgPost.some(post => ev.content.includes(post)));
        // フィードのポストがjsonの nativeWords プロパティそのものなら真
        const isNativeWords = autoReactionJson.nativeWords.length > 0 && autoReactionJson.nativeWords.some(name => name === ev.content) ? true : false;
        // フィードのポストがjsonの nativeWords プロパティそのものではなくて、 nativeWords を含んでいるなら真
        const isIncludeWord = !isNativeWords && autoReactionJson.nativeWords.some(element => (ev.content).includes(element)) ? true : false; 
        // 投稿者が管理者なら真
        const isAdminPubkey = ev.pubkey === adminPubkey ? true : false;
        // 公開キー ev.Pubkey のフォローの中に自分の公開キー pubkey がいるなら真
        let isChkMyFollower = false;
        // 作動区分
        postCategory = 0;
        
        // 反応語句を発見
        if(target) {

            // 投稿者が管理者
            if(isAdminPubkey) {
                postCategory = 1;     // リプライ
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
                        postCategory = 1;     // リプライ
                    } else {
                        // 確率判定でOKだった
                        // target.probability は0～100で設定されている
                        if(probabilityDetermination(target.probability)) {
                            postCategory = 1;     // リプライ
                        } else {
                            // 確率で外れたら倍の確率でやってみる
                            if(probabilityDetermination(target.probability * 2)) {
                                // リアクション
                                postCategory = 5;
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
                    postCategory = 2;     // リプライ(全リプライ語句からのランダムリプライ)
                // フィードのポストがjsonの nativeWords プロパティそのもの
                } else if(isNativeWords) {
                    postCategory = 3;     // リアクションとリアクション絵文字でのリプライ
                }
            // 投稿者が管理者以外
            } else {
                // フィードのポストがjsonの nativeWords プロパティそのもので、かつ自分をフォローしている人なら
                if(isNativeWords) {
                    isChkMyFollower = await chkMyFollower(relay, ev.pubkey);
                    if(isChkMyFollower) {
                        postCategory = 3;     // リアクションとリアクション絵文字でのリプライ
                    }
                }
            }

        }

        // 作動対象だ
        if(postCategory > 0) {
            replyChr = "";

            // リプライやリアクションしても安全なら、リプライイベントやリアクションイベントを組み立てて送信する
            if (isSafeToReply(ev)) {
                let replyPostorreactionPost;
                let randomReactionIdx;
                if(postCategory === 1) {
                    // jsonに設定されている対応するリプライ語句の数を利用してランダムでリプライ語句を決める
                    const randomIdx = random(0, target.replyPostChar.length - 1);
                    // リプライ
                    replyPostorreactionPost = composeReply(target.replyPostChar[randomIdx], ev);

                } else if(postCategory === 2) {
                    // 反応語句配列の数の範囲からランダム値を取得し、それを配列要素とする
                    const replyChrPresetIdx = random(0, autoReplyJson.length - 1);
                    // 配列要素を決めたら、その配列に設定されているリプライ語句の設定配列の範囲からさらにランダム値を取得
                    const replyChrIdx = random(0, autoReplyJson[replyChrPresetIdx].replyPostChar.length - 1);
                    // リプライ語句決定
                    replyChr = autoReplyJson[replyChrPresetIdx].replyPostChar[replyChrIdx];
                    // リプライ
                    replyPostorreactionPost = composeReply(replyChr, ev);

                } else if(postCategory === 3) {
                    // jsonに設定されているリアクション絵文字の数を利用してランダムで反応語句を決める
                    randomReactionIdx = random(0, autoReactionJson.contentReaction.length - 1);
                    // randomReactionIdx 番目のカスタム絵文字URLが設定されているならリアクション
                    if(autoReactionJson.reactionImgURL[randomReactionIdx].length > 0) {
                        postCategory = 4;
                        // リアクション
                        replyPostorreactionPost = composeReaction(ev, autoReactionJson, randomReactionIdx);
                    // カスタム絵文字URLが未設定ならそれはカスタム絵文字ではないので、リアクションせず、既存絵文字でリプライする
                    } else {
                        // リプライ
                        replyPostorreactionPost = composeReply(autoReactionJson.contentReaction[randomReactionIdx], ev);
                    }

                } else if(postCategory === 5) {
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
                if(postCategory === 4) {
                    // リプライ
                    replyPostorreactionPost = composeReplyEmoji(ev, autoReactionJson, randomReactionIdx);
                    publishToRelay(relay, replyPostorreactionPost);
                }
            // } else {
            //     // なにもしない
            //     return;
            }
        }

    } catch(err) {
        throw err;
    }
}


// ディスパッチのオブジェクト
const funcObj = {
    functionalPosting
    ,exchangeRate
    ,normalAutoReply
}

// ディスパッチの設定値
const funcConfig = {
    funcName: ["functionalPosting", "exchangeRate", "normalAutoReply"]                       // useJsonFile の記述順と対応させる
    ,useJsonFile: ["functionalPosting.json", "exchangeRate.json", "autoReply.json"]          // funcName の記述順と対応させる
    ,operationCategory: [0, 1, 1]                                                           // 1ならポストできたら次へ進めない（useJsonFileやuncName の記述順と対応させる）
}

const autoReply = async (relay) => {
    // フィードを購読
    const sub = relay.sub(
        [
            { kinds: [1] }
        ]
    );
    sub.on("event", async (ev) => {
        try {
            // 有効とするのはtagが空のもののみ
            if(ev.tags.length <= 0) {

                const jsonCommonPath = "../../config/";    // configの場所はここからみれば../config/だが、util関数の場所から見れば../../config/となる
                // jsonの場所を割り出しと設定
                const autoReactionJson = await jsonSetandOpen(jsonCommonPath + "autoReaction.json");    
            
                if(autoReactionJson === null) {
                    console.log("json file is not get");
                    return;
                }

                for(let i = 0; i <= funcConfig.funcName.length - 1; i++) {
                    postCategory = 0;
                    let funcJson = await jsonSetandOpen(jsonCommonPath + funcConfig.useJsonFile[i]); // configの場所はここからみれば../config/だが、util関数の場所から見れば../../config/となる
                    if(funcJson === null) {
                        console.log("json file is not get");
                        return;
                    }
                    // 処理の実行はディスパッチで行い、スリム化をはかる
                    await funcObj[funcConfig.funcName[i]](relay, ev, funcJson, autoReactionJson);
                    // ポストできていて、次へ進めない区分なら
                    if(postCategory >= 1 && funcConfig.operationCategory[i] === 1) {
                        break;
                    }
                }
            }
        } catch (err) {
            throw err;
        }
    });
}

// const _old_autoReply = async (relay) => {
//     // jsonの場所を割り出すために
//     const jsonPath = require("path");

//     // jsonファイルの場所の設定
//     const autoReactionPath = jsonPath.join(__dirname, "../config/autoReaction.json");
//     const autoReplyPath = jsonPath.join(__dirname, "../config/autoReply.json");
//     const exchangeRatePath = jsonPath.join(__dirname, "../config/exchangeRate.json");

    
//     // 反応語句の格納されたjsonを取得
//     const autoReactionJson = jsonOpen(autoReactionPath);
//     const autoReplyJson = jsonOpen(autoReplyPath);
//     const exchangeRateJson = jsonOpen(exchangeRatePath);    
//     if(autoReactionJson === null || autoReplyJson === null || exchangeRateJson === null){
//         console.log("json file is not get");
//         return;
//     }

//     // フィードを購読
//     const sub = relay.sub(
//             [
//                 { kinds: [1] 
//                 }
//             ]
//                 );
//     sub.on("event", async (ev) => {
//         try {

//             // 有効とするのはtagが空のもののみ
//             if(ev.tags.length <= 0) {

//                 // フィードのポストの中にjsonで設定した値が存在するなら真
//                 const priorityTarget = exchangeRateJson.find(item => item.orgPost.some(post => ev.content.includes(post)));
//                 const target = autoReplyJson.find(item => item.orgPost.some(post => ev.content.includes(post)));
//                 // フィードのポストがjsonの nativeWords プロパティそのものなら真
//                 const isNativeWords = autoReactionJson.nativeWords.length > 0 && autoReactionJson.nativeWords.some(name => name === ev.content) ? true : false;
//                 // フィードのポストがjsonの nativeWords プロパティそのものではなくて、 nativeWords を含んでいるなら真
//                 const isIncludeWord = !isNativeWords && autoReactionJson.nativeWords.some(element => (ev.content).includes(element)) ? true : false; 
//                 // 投稿者が管理者なら真
//                 const isAdminPubkey = ev.pubkey === adminPubkey ? true : false;
//                 // 公開キー ev.Pubkey のフォローの中に自分の公開キー pubkey がいるなら真
//                 let isChkMyFollower = false;
//                 // 作動区分
//                 let postKb = 0;
                
//                 let replyChr = "";

//                 // 通貨反応語句を優先反応語句とし、フィードのポストがjsonの nativeWords プロパティそのものではなくて、 nativeWords を含んでいる（APIキーが取得できていて当然）
//                 if(apiKey.length > 0 && priorityTarget && isIncludeWord) {
//                     let arrayRet = [];

//                     // 投稿者が管理者
//                     if(isAdminPubkey) {
//                         isChkMyFollower = true;
//                     // 投稿者が管理者以外
//                     } else {
//                         // 公開キー ev.Pubkey のフォローの中に自分の公開キー pubkey がいるなら真
//                         isChkMyFollower = await chkMyFollower(relay, ev.pubkey);
//                     }
//                     if(isChkMyFollower) {

//                         // 反応語句はjsonの何番目にいるか取得
//                         const orgPostIdx = priorityTarget.orgPost.findIndex(element => ev.content.includes(element));
//                         // 反応語句は存在するはずだが、もし何らかの理由で見つからなかったらなにもしない
//                         if(orgPostIdx === -1) {
//                             return;
//                         }


//                         // 反応語句はポストの何文字目にいるか取得
//                         const chridx = ev.content.indexOf(priorityTarget.orgPost[orgPostIdx]);
//                         // 反応語句の前方を収める
//                         const fowardSubstr = ev.content.substring(0, chridx);
//                         // 反応語句の前方に配列で設定した nativeWords が含まれる
//                         if(autoReactionJson.nativeWords.length > 0 && autoReactionJson.nativeWords.some(word => fowardSubstr.includes(word))) {
//                             arrayRet = [];
//                             // 通貨レート
//                             if(priorityTarget.sw === 1) {
//                                 // 正規表現パターンを構築
//                                 const pattern = new RegExp(`(.{0,3})${priorityTarget.orgPost}(.{0,3})`);

//                                 // 文字列を検索し、一致した部分を取得
//                                 const match = ev.content.match(pattern);

//                                 if (match) {
//                                     const preceding = match[1]; // 前の3文字
//                                     const following = match[2]; // 後ろの3文字
//                                     arrayRet = await getAvailableCurrencies(preceding, following, priorityTarget.sw);
//                                     if(arrayRet.length <= 0) {
//                                         replyChr = priorityTarget.nonGet[0];
//                                         postKb = 50;    // 通貨単位は無効であることをポストするので有効とする
//                                     } else {
//                                         replyChr = "1 " + preceding + " は " + arrayRet[0] + " " + following + " " + priorityTarget.replyPostChar[0];
//                                     }
//                                 }
//                             // 通貨一覧
//                             } else {
//                                 arrayRet = await getAvailableCurrencies("", "", priorityTarget.sw);
//                                 replyChr = "";
//                                 let j = 1;
//                                 for (let i = 0; i < arrayRet.length; i++) {
//                                     replyChr += (replyChr.length > 0 ? "," : "") + arrayRet[i];
//                                     if(j === 10) { // 10個ごとに改行
//                                         j = 0;
//                                         replyChr += (i < arrayRet.length - 1? "\n": "");
//                                     }
//                                     j++;
//                                 }
//                             }

//                             if(arrayRet.length > 0){
//                                 postKb = 50;
//                             }
//                         }
//                     }
//                 } else {
                    
//                     // 反応語句を発見
//                     if(target) {

//                         // 投稿者が管理者
//                         if(isAdminPubkey) {
//                             postKb = 1;     // リプライ
//                         // 投稿者が管理者以外
//                         } else {
//                             // 公開キー ev.Pubkey のフォローの中に自分の公開キー pubkey がいるなら真
//                             isChkMyFollower = await chkMyFollower(relay, ev.pubkey);
//                             if(isChkMyFollower) {
//                                 // 反応語句はjsonの何番目にいるか取得
//                                 const orgPostIdx = target.orgPost.findIndex(element => ev.content.includes(element));
//                                 // 反応語句は存在するはずだが、もし何らかの理由で見つからなかったらなにもしない
//                                 if(orgPostIdx === -1) {
//                                     return;
//                                 }
//                                 // 反応語句はポストの何文字目にいるか取得
//                                 const chridx = ev.content.indexOf(target.orgPost[orgPostIdx]);
//                                 // 反応語句の前方を収める
//                                 const fowardSubstr = ev.content.substring(0, chridx);
//                                 // 反応語句の前方に配列で設定した nativeWords が含まれる
//                                 if(autoReactionJson.nativeWords.length > 0 && autoReactionJson.nativeWords.some(word => fowardSubstr.includes(word))) {
//                                     postKb = 1;     // リプライ
//                                 } else {
//                                     // 確率判定でOKだった
//                                     // target.probability は0～100で設定されている
//                                     if(probabilityDetermination(target.probability)) {
//                                         postKb = 1;     // リプライ
//                                     } else {
//                                         // 確率で外れたら倍の確率でやってみる
//                                         if(probabilityDetermination(target.probability * 2)) {
//                                             // リアクション
//                                             postKb = 5;
//                                         }
//                                     }
//                                 }
//                             }
//                         }

//                     // 反応語句未発見
//                     } else {
//                         // 投稿者が管理者
//                         if(isAdminPubkey) {
//                             // フィードのポストがjsonの nativeWords プロパティそのものではないが、ポスト内のどこかに nativeWords を含んでいる
//                             if(isIncludeWord) {
//                                 postKb = 2;     // リプライ(全リプライ語句からのランダムリプライ)
//                             // フィードのポストがjsonの nativeWords プロパティそのもの
//                             } else if(isNativeWords) {
//                                 postKb = 3;     // リアクションとリアクション絵文字でのリプライ
//                             }
//                         // 投稿者が管理者以外
//                         } else {
//                             // フィードのポストがjsonの nativeWords プロパティそのもので、かつ自分をフォローしている人なら
//                             if(isNativeWords) {
//                                 isChkMyFollower = await chkMyFollower(relay, ev.pubkey);
//                                 if(isChkMyFollower) {
//                                     postKb = 3;     // リアクションとリアクション絵文字でのリプライ
//                                 }
//                             }
//                         }

//                     }
//                 }
//                 // 作動対象だ
//                 if(postKb > 0) {
//                     // リプライやリアクションしても安全なら、リプライイベントやリアクションイベントを組み立てて送信する
//                     if (isSafeToReply(ev)) {
//                         let replyPostorreactionPost;
//                         let randomReactionIdx;
//                         if(postKb === 1) {
//                             // jsonに設定されている対応するリプライ語句の数を利用してランダムでリプライ語句を決める
//                             const randomIdx = random(0, target.replyPostChar.length - 1);
//                             // リプライ
//                             replyPostorreactionPost = composeReply(target.replyPostChar[randomIdx], ev);

//                         } else if(postKb === 2) {
//                             // 反応語句配列の数の範囲からランダム値を取得し、それを配列要素とする
//                             const replyChrPresetIdx = random(0, autoReplyJson.length - 1);
//                             // 配列要素を決めたら、その配列に設定されているリプライ語句の設定配列の範囲からさらにランダム値を取得
//                             const replyChrIdx = random(0, autoReplyJson[replyChrPresetIdx].replyPostChar.length - 1);
//                             // リプライ語句決定
//                             replyChr = autoReplyJson[replyChrPresetIdx].replyPostChar[replyChrIdx];
//                             // リプライ
//                             replyPostorreactionPost = composeReply(replyChr, ev);

//                         } else if(postKb === 3) {
//                             // jsonに設定されているリアクション絵文字の数を利用してランダムで反応語句を決める
//                             randomReactionIdx = random(0, autoReactionJson.contentReaction.length - 1);
//                             // randomReactionIdx 番目のカスタム絵文字URLが設定されているならリアクション
//                             if(autoReactionJson.reactionImgURL[randomReactionIdx].length > 0) {
//                                 postKb = 4;
//                                 // リアクション
//                                 replyPostorreactionPost = composeReaction(ev, autoReactionJson, randomReactionIdx);
//                             // カスタム絵文字URLが未設定ならそれはカスタム絵文字ではないので、リアクションせず、既存絵文字でリプライする
//                             } else {
//                                 // リプライ
//                                 replyPostorreactionPost = composeReply(autoReactionJson.contentReaction[randomReactionIdx], ev);
//                             }

//                         } else if(postKb === 5) {
//                             //100回まわってカスタム絵文字URLが設定されている要素をランダム取得出来たらリアクション（100に意味はない　なんとなく）
//                             for (let i = 0; i < 100; i++) {
//                                 randomReactionIdx = random(0, autoReactionJson.contentReaction.length - 1);
//                                 // randomReactionIdx 番目のカスタム絵文字URLが設定されているならリアクション
//                                 if(autoReactionJson.reactionImgURL[randomReactionIdx].length > 0) {
//                                     // リアクション
//                                     replyPostorreactionPost = composeReaction(ev, autoReactionJson, randomReactionIdx);
//                                     break;
//                                 }
//                             }
//                             // なにもしない
//                             return;


//                         } else if(postKb === 50) {
//                             // リプライ
//                             replyPostorreactionPost = composeReply(replyChr, ev);

//                         }

//                         publishToRelay(relay, replyPostorreactionPost);
//                         // リアクションとリアクション絵文字でのリプライを行う動作区分で、かつカスタム絵文字URLが設定されているならリアクション絵文字でリプライも行う
//                         if(postKb === 4) {
//                             // リプライ
//                             replyPostorreactionPost = composeReplyEmoji(ev, autoReactionJson, randomReactionIdx);
//                             publishToRelay(relay, replyPostorreactionPost);
//                         }
//                     } else {
//                         // なにもしない
//                         return;
//                     }
//                 }
//             }
//         } catch (err){
//             console.error(err);
//             throw err;
//         }
//     });
// }


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

    // Open Exchange Rates のエンドポイント
    const API_URL_LATEST = "https://openexchangerates.org/api/latest.json";

    try {

        const allCurrencies = await axios.get(API_URL_LATEST, {
            headers: {"Authorization": `Token ${apiKey}`}
        });

        // 通貨リストを収める
        const currencies = allCurrencies.data.rates;
        for (const currency in currencies) {
            // push() メソッドを使用して値を追加
            currencyList.push(currency);
        }
        
        // 為替レート
        if(funcSw === 1) {
            // 引数の通貨は存在しているか
            if(currencyList.includes(baseCurrency) && currencyList.includes(targetCurrency)) {
                const API_URL = "https://open.er-api.com/v6/latest/" + baseCurrency;
                const bases = await axios.get(API_URL, {
                    headers: {"Authorization": `Token ${apiKey}`}
                });
                const exchangeRate = bases.data.rates[targetCurrency];
                arrayRet.push(exchangeRate);    // 通貨リストの返りは配列なので、こっちも配列にして揃える
            }
            return arrayRet;

        } else {
            // 通貨リストをそのまま返す
            return currencyList;
        }

    } catch (err) {
        console.error("getAvailableCurrencies:", err);
        throw err;
    }
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
    pubkey = getPublicKey(BOT_PRIVATE_KEY_HEX);               // 秘密鍵から公開鍵の取得
    adminPubkey = process.env.admin_HEX_PUBKEY;               // bot管理者の公開鍵の取得
    relayUrl = process.env.RELAY_URL;                         // リレーURL
    apiKey = process.env.OPEN_EXCHANGE_RATES_API;             // open exchange rates のAPI


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
        //_old_autoReply(relay);
        autoReply(relay);

    } catch(err) {
        console.error(err);
    }
}

main();