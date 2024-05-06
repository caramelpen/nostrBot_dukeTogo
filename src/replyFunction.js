/**
 * 狙撃屋13bot(@dukeTogo)
 * eachPostingFunctions.js
 * autoReply や replytoReply では共通のポスト仕様が適用されるためここで1本化する
 */
let axios = require("axios");
let vega = require("vega");
let sharp = require("sharp");
let fs = require("fs");
require("websocket-polyfill");
const { finishEvent } = require("nostr-tools");
const { currUnixtime, isSafeToReply, random, probabilityDetermination, retrievePostsInPeriod, isFolderExists, jsonSetandOpen, asyncIsFileExists, deleteFile } = require("./common/utils.js");
const { publishToRelay } = require("./common/publishToRelay.js");
const { emergency } = require("./emergency.js");

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
        // フィードのポストがjsonの nativeWords プロパティそのものではなくて、 nativeWords を含んでいるなら真（isFromReplytoReply 経由ならいつでも真）
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
                    // if (isSafeToReply(ev) && retrievePostsInPeriod(relay, pubKey)) {
                    if(!retrievePostsInPeriod(relay, pubKey)) {
                        await emergency(relay);
                        return;
                    }
                    if (isSafeToReply(ev)) {
                        // リプライ
                        const replyPostEv = !isFromReplytoReply ? composeReply(replyChr, ev) : composeReplytoReply(replyChr, ev);

                        await publishToRelay(relay, replyPostEv, (isFromReplytoReply ? false : true), ev.pubkey, ev.content);
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
        // フィードのポストがjsonの nativeWords プロパティそのものではなくて、 nativeWords を含んでいるなら真（isFromReplytoReply 経由ならいつでも真）
        const isIncludeWord = !isFromReplytoReply ? (!isNativeWords && autoReactionJson.nativeWords.some(element => (ev.content).includes(element)) ? true : false) : true;

        // 投稿者が管理者なら真
        const isAdminPubkey = ev.pubkey === adminPubkey ? true : false;
        // 公開キー ev.Pubkey のフォローの中に自分の公開キー pubkey がいるなら真
        let isChkMyFollower = false;
        // 作動区分
        postInfoObj.postCategory = 0;

        replyChr = "";

        // 通貨反応語句が存在し、フィードのポストがjsonの nativeWords プロパティそのものではなくて、 nativeWords を含んでいる
        if(priorityTarget && isIncludeWord) {
            let arrayRet = [];

            // 投稿者が管理者
            if(isAdminPubkey) {
                // 自分のフォロアと同じ扱い
                isChkMyFollower = true;
            // 投稿者が管理者以外
            } else {
                // 公開キー ev.Pubkey のフォローの中に自分の公開キー pubkey がいるなら真
                isChkMyFollower = isFromReplytoReply ? true : await chkMyFollower(relay, ev.pubkey);
            }
            if(isChkMyFollower) {
                let preceding = "";
                let following = "";

                // 反応語句はjsonの何番目にいるか取得
                const orgPostIdx = priorityTarget.orgPost.findIndex(element => ev.content.includes(element));
                // 反応語句は存在するはずだが、もし何らかの理由で見つからなかったらなにもしない
                if(orgPostIdx === -1) {
                    return;
                }

                // 反応語句
                const compoundWord = priorityTarget.orgPost[orgPostIdx];

                // 反応語句はポストの何文字目にいるか取得
                const chridx = ev.content.indexOf(compoundWord);
                // 反応語句の前方を収める
                const fowardSubstr = ev.content.substring(0, chridx);
                // 反応語句の前方に配列で設定した nativeWords が含まれる
                if(autoReactionJson.nativeWords.length > 0 && autoReactionJson.nativeWords.some(word => fowardSubstr.includes(word))) {
                    arrayRet = [];
                    arrayRet = await getAvailableCurrencies("", ""); // 通貨リスト
                    // 通貨レート
                    if(priorityTarget.sw === 1) {

                        // 反応語句は通貨一覧に含まれているか
                        const incCompoundWord = arrayRet.includes(compoundWord);

                        // 反応語句が自動為替単位のどこにいるか
                        const autoOrgCurrencyIdx = priorityTarget.autoOrgCurrency.findIndex(element => compoundWord.includes(element));

                        // 反応語句がそのまま存在する通貨か、あるいは存在はしないがjsonに設定のある自動為替単位と合致する
                        if(incCompoundWord || (!incCompoundWord && autoOrgCurrencyIdx >= 0) ) {
                            preceding = compoundWord;
                            following = priorityTarget.autoTargetCurrency;

                        } else {
                            // nativeWords はjsonの何番目か
                            const nativeWordsIdx = autoReactionJson.nativeWords.findIndex(element => ev.content.includes(element));

                            const idxOfNativeWordsBefore = fowardSubstr.lastIndexOf(autoReactionJson.nativeWords[nativeWordsIdx]); // nativeWords 直前の位置を取得

                            if(idxOfNativeWordsBefore !== -1) {
                                const nativeWordsAfter = ev.content.substring(idxOfNativeWordsBefore + autoReactionJson.nativeWords[nativeWordsIdx].length); // nativeWords の後ろの部分を取得
                                const idxOfCompoundWord = nativeWordsAfter.indexOf(compoundWord); // 反応語句の位置を取得

                                if (idxOfCompoundWord !== -1) {    
                                    preceding = nativeWordsAfter.substring(0, idxOfCompoundWord); // 為替元通貨
                                    following = nativeWordsAfter.substring(idxOfCompoundWord + compoundWord.length);    // 為替先通貨
                                }
                            }
                        }

                        arrayRet = await getAvailableCurrencies(preceding, following, priorityTarget.sw);
                        if(arrayRet.length <= 0) {
                            replyChr = priorityTarget.nonGet[0];
                            postInfoObj.postCategory = 1;    // 通貨単位は無効であることをポストするので有効とする
                        } else {
                            replyChr = "1 " + preceding + " は " + parseFloat(arrayRet[0]).toLocaleString() + " " + following + " " + priorityTarget.replyPostChar[0];
                        }

                    // 通貨一覧
                    } else {
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
            // if (isSafeToReply(ev) && retrievePostsInPeriod(relay, pubKey)) {
            if(!retrievePostsInPeriod(relay, pubKey)) {
                await emergency(relay);
                return;
            }
            if (isSafeToReply(ev)) {
                
                // リプライ
                const replyPostorreactionPostEv = !isFromReplytoReply ? composeReply(replyChr, ev) : composeReplytoReply(replyChr, ev);

                await publishToRelay(relay, replyPostorreactionPostEv, (isFromReplytoReply ? false : true), ev.pubkey, ev.content);
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
                // 公開キー ev.Pubkey のフォローの中に自分の公開キー pubkey がいるなら真（自分のフォロアだ）
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
                        // replytoReply から来た
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
                                    if(target.probability > 0) {
                                        console.log("out of probability determination:" + target.orgPost);
                                    }
                                }
                            }
                        }
                    }
                }
            }

        // 反応語句未発見
        } else {

            // フィードのポストがjsonの nativeWords プロパティそのものなら真
            const isNativeWords = autoReactionJson.nativeWords.length > 0 && autoReactionJson.nativeWords.some(name => name === ev.content) ? true : false;
            // フィードのポスト先頭がjsonの nativeWords プロパティを含んでいるなら真
            const includeNativeWords = autoReactionJson.nativeWords.some(word => ev.content.startsWith(word));

            // 投稿者が管理者か replytoReply から来た
            if(isAdminPubkey || isFromReplytoReply) {
                if(isNativeWords) {
                    postInfoObj.postCategory = 3;     // リアクションとリアクション絵文字でのリプライ
                } else {
                    if(isFromReplytoReply) {
                        postInfoObj.postCategory = 2;     // リプライ(全リプライ語句からのランダムリプライ)
                    } else {
                        // 管理者だ
                        if(isAdminPubkey) {
                            // フィードのポスト先頭がjsonの nativeWords プロパティを含んでいる
                            if(includeNativeWords) {
                                postInfoObj.postCategory = 2;     // リプライ(全リプライ語句からのランダムリプライ)
                            }
                        }
                    }
                }
            // 投稿者が管理者以外だし、replytoReply からも来ていない
            } else {
                // 自分をフォローしている人なら真
                isChkMyFollower = isFromReplytoReply ? true : await chkMyFollower(relay, ev.pubkey);
                // フィードのポストがjsonの nativeWords プロパティそのもので、かつ自分をフォローしている人なら
                if(isNativeWords) {
                    if(isChkMyFollower) {
                        postInfoObj.postCategory = 3;     // リアクションとリアクション絵文字でのリプライ
                    }
                } else {
                    // 自分をフォローしている人なら
                    if(isChkMyFollower) {
                        // フィードのポスト先頭がjsonの nativeWords プロパティを含んでいる
                        if(includeNativeWords) {
                            postInfoObj.postCategory = 2;     // リプライ(全リプライ語句からのランダムリプライ)
                        }
                    }
                }
            }
        }

        // 作動対象だ
        if(postInfoObj.postCategory > 0) {
            replyChr = "";

            // リプライやリアクションしても安全なら、リプライイベントやリアクションイベントを組み立てて送信する
            if(!retrievePostsInPeriod(relay, pubKey)) {
                await emergency(relay);
                return;
            }
            if (isSafeToReply(ev)) {
                let replyPostorreactionPostEv;
                let randomReactionIdx;
                if(postInfoObj.postCategory === 1) {
                    // jsonに設定されている対応するリプライ語句の数を利用してランダムでリプライ語句を決める
                    const randomIdx = random(0, target.replyPostChar.length - 1);
                    // リプライ
                    replyPostorreactionPostEv = !isFromReplytoReply ? composeReply(target.replyPostChar[randomIdx], ev) : composeReplytoReply(target.replyPostChar[randomIdx], ev);

                } else if(postInfoObj.postCategory === 2) {
                    // 反応語句配列の数の範囲からランダム値を取得し、それを配列要素とする
                    const replyChrPresetIdx = random(0, autoReplyJson.length - 1);
                    // 配列要素を決めたら、その配列に設定されているリプライ語句の設定配列の範囲からさらにランダム値を取得
                    const replyChrIdx = random(0, autoReplyJson[replyChrPresetIdx].replyPostChar.length - 1);
                    // リプライ語句決定
                    replyChr = autoReplyJson[replyChrPresetIdx].replyPostChar[replyChrIdx];
                    // リプライ
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

                await publishToRelay(relay, replyPostorreactionPostEv, (isFromReplytoReply ? false : true), ev.pubkey, ev.content);
                // リアクションとリアクション絵文字でのリプライを行う動作区分で、かつカスタム絵文字URLが設定されているならリアクション絵文字でリプライも行う
                if(postInfoObj.postCategory === 4) {
                    // リプライ
                    replyPostorreactionPostEv = composeReplyEmoji(ev, autoReactionJson, randomReactionIdx);
                    await publishToRelay(relay, replyPostorreactionPostEv, (isFromReplytoReply ? false : true), ev.pubkey, ev.content);
                }
            }
        }

    } catch(err) {
        throw err;
    }
}


// zap反応ポスト
const postUponReceiptofZap = async (relay, ev, autoReplyJson, postInfoObj) => {
    try {
        // 作動区分
        postInfoObj.postCategory = 0;

        // ev.tags の P(大文字p) に限定し、(一応)かつ自分の公開キーは外したものを格納する
        const filteredSecondElements = ev.tags.filter(tag => tag[0] === "P" && tag[1] !== pubKey).map(tag => tag[1]);
        if(filteredSecondElements.length > 0) {
            // 反応する
            postInfoObj.postCategory = 1;
        }

        if(postInfoObj.postCategory >= 1) {
            // 投稿しても大丈夫だ
            if (isSafeToReply(ev)) {
                // jsonに設定されている対応するリプライ語句の数を利用してランダムで投稿語句を決める
                const randomIdx = random(0, autoReplyJson.postedWord.length - 1);
                const randomSubIdx = random(0, autoReplyJson.postedSubWord.length - 1);
                // 投稿
                const replyPostorreactionPostEv = composePost(autoReplyJson.postedWord[randomIdx] + " \n" + autoReplyJson.postedSubWord[randomSubIdx]);
                await publishToRelay(relay, replyPostorreactionPostEv);
            }
        }

    } catch (err) {
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
const  getAvailableCurrencies = async (baseCurrency, targetCurrency, funcSw = 0) => {
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



// UNIX時間から日本時間に変換し、ISOUTC形式にする
const convertUnixTimeToJapanISOUTC = (unixTimeInSeconds) => {
    // UNIX時間をミリ秒に変換してDateオブジェクトを作成
    const date = new Date(unixTimeInSeconds * 1000);

    let offset = 9; // 日本時間はUTC+9
    let localDate = new Date(date.getTime() + (3600000 * offset));
    let formattedDate = `${localDate.getUTCFullYear()}-${(localDate.getUTCMonth()+1).toString().padStart(2, '0')}-${localDate.getUTCDate().toString().padStart(2, '0')}T${localDate.getUTCHours().toString().padStart(2, '0')}:${localDate.getUTCMinutes().toString().padStart(2, '0')}:${localDate.getUTCSeconds().toString().padStart(2, '0')}`;
    formattedDate=new Date(formattedDate).toISOString();
    formattedDate=new Date(formattedDate);
    return formattedDate
};


// BTCの日本円チャートを得る（第1引数がDなら日ごと、Hなら時間ごと）
const getBTCtoJPYChart = async (dorh, APIEndPoint) => {
    try {
        // パラメーターを設定
        let params;
        if(dorh === "D") {
            params = {
                fsym: "BTC",
                tsym: "JPY",
                aggregate: 1,
                limit: 29
            };
        } else {
            params = {
                fsym: "BTC",
                tsym: "JPY",
                aggregate: 1,
                limit: 179,
                aggregatePredictableTimePeriods: false
            };
        }

        // APIにリクエストを送信してデータを取得
        const response = await axios.get(APIEndPoint, {params});
        return response.data.Data.Data; // データは価格の配列として返されます
    } catch (err) {
        console.error(err);
    }
}



// チャート作成（第1引数がDなら日ごと、Hなら時間ごと）して画像として保存する
const createAndSaveChart = async (dorh, data, schema) => {
    let decData = [];
    for (let i = 0; i <= data.length-1; i++){
        decData.push({
            date: convertUnixTimeToJapanISOUTC(data[i].time),
            price: data[i].close
        });
    }
    // priceの値からなる配列を作成
    const prices = decData.map(d => d.price);

    // 最小値と最大値を取得
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    // Vegaの仕様の作成
    let spec;
    if(dorh === "D") {
        spec = {
            $schema: schema
            ,width: 600
            ,height: 300
            ,padding: 5
            ,background: "whitesmoke"

            ,data: [
                {
                    name: "table"
                    ,values: decData
                }
            ]

            ,scales: [
                {
                    name: "x"
                    ,type: "time"
                    ,range: "width"
                    ,nice: true
                    ,domain: {data: "table", field: "date"}
                }
                ,{
                    name: "y"
                    ,type: "linear"
                    ,range: "height"
                    ,nice: true
                    ,zero: false
                    ,domain: [minPrice, maxPrice]  // 最小値と最大値を使用
                }
            ]

            ,axes: [
                {
                    orient: "bottom"
                    ,scale: "x"
                    ,format: "%m/%d"
                    ,tickCount: {interval: "date", step: 1}
                    ,title: "date"              // タイトル
                    ,grid: true                 // 罫線
                    ,labelAngle: -90            // ラベルを垂直にする
                    ,labelAlign: "right"        // ラベルを右寄せにする
                    ,labelBaseline: "middle"    // ラベルを中央寄せにする


                }
                ,{
                    orient: "left"
                    ,scale: "y"
                    ,title: "price(JPY)"        // タイトル
                    ,grid: true                 // 罫線
                }
            ]

            ,marks: [
                {
                    type: "line"
                    ,from: {data: "table"}
                    ,encode: {
                        enter: {
                            x: {scale: "x", field: "date"}
                            ,y: {scale: "y", field: "price"}
                            ,stroke: {value: "black"}
                            ,strokeWidth: {value: 2}    // 線の太さを
                        }
                    }
                }
            ]
        };
    } else {
        spec = {
            $schema: schema
            ,width: 600
            ,height: 300
            ,padding: 5
            ,background: "whitesmoke"
    
            ,data: [
                {
                    name: "table"
                    ,values: decData
                }
            ]
    
            ,scales: [
                {
                    name: "x"
                    ,type: "time"
                    ,range: "width"
                    ,domain: {data: "table", field: "date"}
                }
                ,{
                    name: "y"
                    ,type: "linear"
                    ,range: "height"
                    ,nice: true
                    ,zero: false
                    ,domain: [minPrice, maxPrice]  // 最小値と最大値を使用
                }
            ]
    
            ,axes: [
                {
                    orient: "bottom"
                    ,scale: "x"
                    ,format: "%H:%M"
                    ,tickCount: {interval: "minutes", step: 10}
                    ,title: "time"              // タイトル
                    ,grid: true                 // 罫線
                    ,labelAngle: -90            // ラベルを垂直にする
                    ,labelAlign: "right"        // ラベルを右寄せにする
                    ,labelBaseline: "middle"    // ラベルを中央寄せにする                            
                }
                ,{
                    orient: "left"
                    ,scale: "y"
                    ,title: "price(JPY)"  // タイトル
                    ,grid: true  // 罫線
                }
            ]
    
            ,marks: [
                {
                    type: "line"
                    ,from: {"data": "table"}
                    ,encode: {
                        enter: {
                            x: {scale: "x", field: "date"}
                            ,y: {scale: "y", field: "price"}
                            ,stroke: {value: "black"}
                            ,strokeWidth: {value: 2}    // 線の太さを
                        }
                    }
                }
            ]
        };


    }
    
    const slash = "/";
    // Vegaのビューの作成とSVGの出力
    const path = require("path");
    const targetFolderPath = "img";
    const absoluteFolderPath = path.join(__dirname, '..', targetFolderPath);    // 1つ上の階層
    // フォルダが未存在なら作る
    isFolderExists(absoluteFolderPath, true);
    const svgFile = "chart" + dorh + ".svg";
    const imgFile = "chart" + dorh + ".png";
    // (前回アップロード時に削除してあるはずだが)ファイルが存在していたら削除する
    for (;;) {
        if(await asyncIsFileExists(absoluteFolderPath + slash + svgFile)) {
            await deleteFile(absoluteFolderPath + slash + svgFile);
        }
        if(!await asyncIsFileExists(absoluteFolderPath + slash + svgFile)) {
            break;
        }
    }
    for (;;) {        
        if(await asyncIsFileExists(absoluteFolderPath + slash + imgFile)) {
            await deleteFile(absoluteFolderPath + slash + imgFile);
        }
        if(!await asyncIsFileExists(absoluteFolderPath + slash + imgFile)) {
            break;
        }
    }
    const view = new vega.View(vega.parse(spec), {renderer: "none"});
    const svg = await view.toSVG();
    fs.writeFileSync(absoluteFolderPath + slash + svgFile, svg);
    // SVGをPNGに変換
    try {
        await sharp(absoluteFolderPath + slash + svgFile).png().toFile(absoluteFolderPath + slash + imgFile);
        return absoluteFolderPath + slash + imgFile;
    } catch (err) {
        console.error(err);
        throw err; // SVGをPNGに変換する過程でエラーが発生した場合、エラーを再スローします
    }
}

// 画像アップロードして、そのURLを得る
const uploadImg = async (imgPath) => {
    const crypto = require("crypto");
    // void.cat APIのエンドポイントURL
    const uploadUrl = "https://void.cat/upload?cli=true";
    
    // 画像ファイルの読み込み
    const imageData = fs.readFileSync(imgPath);
    
    try {

        // ファイルのSHA256ハッシュを計算
        const hash = crypto.createHash("sha256");
        hash.update(imageData);
        const fileHash = hash.digest("hex");


        // void.cat へのHTTP POSTリクエストの設定
        const response = await axios.post(uploadUrl, imageData, {
            headers: {
                "accept": "*/*"
                ,"V-Content-Type": "image/png" // 画像のコンテンツタイプを指定
                ,"V-Filename": imgPath 
                ,"V-Full-Digest": fileHash 
            }
        });
        return response.data + ".png";
    } catch (error) {
        console.error('Error uploading image:', error);
        return "";
    }
}

// ビットコインチャートをダウンロードして、画像保存してポストする
const uploadBTCtoJPYChartImg = async (presetJsonPath, nowDate, retPostEv, relay = undefined) => {

    // キャッシュのクリア
    axios = require.resolve("axios");
    vega = require.resolve("vega");
    sharp = require.resolve("sharp");
    fs = require.resolve("fs");
    
    // モジュールを再ロード
    delete require.cache[axios];
    delete require.cache[vega];
    delete require.cache[sharp];
    delete require.cache[fs];
    
    axios = require("axios");
    vega = require("vega");
    sharp = require("sharp");
    fs = require("fs");


    let processingResult = false;

    try {
        const presetDateJson = await jsonSetandOpen(presetJsonPath);
        if(presetDateJson === null || presetDateJson === undefined || !presetDateJson){
            console.error("uploadBTCtoJPYChartImg:json file is not get");
            return false;
        }

        const hours = nowDate.getHours();
        const minutes = nowDate.getMinutes();

        // jsonの親プロパティ specifiedProcessatSpecifiedTime を取得
        const specifiedProcessatSpecifiedTime = presetDateJson.specifiedProcessatSpecifiedTime;

        // HH:MM
        const currentTime = String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0");

        // 各条件をチェック
        for (let condition of specifiedProcessatSpecifiedTime) {
            // 指定時刻
            if (condition.type === "specifiedTime") {
                for (let value of condition.value) {
                    const hitMinutes = value.minutes.includes(currentTime);
                    if (hitMinutes) {
                        // BTCの日ごとと時間ごとのチャートデータを得る
                        const chartDataD = await getBTCtoJPYChart("D","https://min-api.cryptocompare.com/data/v2/histoday");
                        const chartDataH = await getBTCtoJPYChart("H","https://min-api.cryptocompare.com/data/v2/histominute");
                        if(chartDataD !== undefined && chartDataH !== undefined) {
                            // チャートを図にする
                            const imgPathD = await createAndSaveChart("D", chartDataD, "https://vega.github.io/schema/vega/v5.json");
                            const imgPathH = await createAndSaveChart("H", chartDataH, "https://vega.github.io/schema/vega/v5.json");
                            if(imgPathD !== undefined && imgPathH !== undefined) {
                                // チャート画像をアップデート
                                // const imgURLD = await uploadImg(imgPathD);
                                // const imgURLH = await uploadImg(imgPathH);
                                const [imgURLD, imgURLH] = await Promise.all([uploadImg(imgPathD), uploadImg(imgPathH)]);
                                if(imgURLD !== undefined && imgURLH !== undefined && imgURLD.length > 0 && imgURLH.length > 0) {

                                    // ポスト語句は複数設定されており、設定数の範囲でランダムに取得
                                    const postIdx = random(0,value.messages.length - 1);
                                    let subMessage = "";
                                    if(value.subMessages.length > 0){
                                        const subPostIdx = random(0,value.subMessages.length - 1);
                                        subMessage = value.subMessages[subPostIdx];
                                    }

                                    // リプライ
                                    const postEv = composePost(value.messages[postIdx] + "\n" + imgURLH + " " + "\n" + imgURLD + (subMessage.length > 0 ? " \n" + subMessage:""));
                                    if(relay !== undefined) {
                                        await publishToRelay(relay, postEv);            
                                    } else {
                                        retPostEv.postEv = postEv;
                                    }

                                    // ファイルはアップロードしたので削除する
                                    for (let i = 1; i <= 2; i++) {
                                        let dorh = i === 1? "D": "H";
                                        let imgPath = i === 1? imgPathD: imgPathH;
                                        let lastIndex = imgPath.lastIndexOf("/");
                                        let commonPath = imgPath.substring(0, lastIndex + 1);
                                        let imgFileName = "chart" + dorh + ".svg";
                                        for (;;) {
                                            if(await asyncIsFileExists(commonPath + imgFileName)) {
                                                await deleteFile(commonPath + imgFileName);
                                            }
                                            if(!await asyncIsFileExists(commonPath + imgFileName)) {
                                                break;
                                            }
                                        }
                                        for (;;) {        
                                            if(await asyncIsFileExists(imgPath)) {
                                                await deleteFile(imgPath);
                                            }
                                            if(!await asyncIsFileExists(imgPath)) {
                                                break;
                                            }
                                        }
                                    }

                                    //return true;
                                    processingResult = true;
                                } else {
                                    console.error("failed to upload chart images");
                                    return false;                                    
                                }
                            } else {
                                console.error("failed to create and save chart images");
                                return false;
                            }
                        } else {
                            console.error("failed to retrieve chart data");
                            return false;
                        }
                        //break outerloop;
                    }
                }
            }
        }
        
    } catch(err) {
        console.error("uploadBTCtoJPYChartImg is error:" + err)
    }
    return processingResult;
}



// 投稿イベントを組み立てる
const composePost = (postChar) => {
    const ev = {
        pubkey: pubKey
        ,kind: 1
        ,content: postChar
        ,tags: []
        ,created_at: currUnixtime()
    };

    // イベントID(ハッシュ値)計算・署名
    return finishEvent(ev, BOT_PRIVATE_KEY_HEX);
};


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
// // リプライイベント(zap受け取り時)を組み立てる
// const composeReplyforReceiptZap = (replyPostChar, targetEvent) => {
//     const descriptionValues = targetEvent.tags.filter(tag => tag[0] === "description").map(tag => tag[1]);

//     // 文字列を JSON オブジェクトに変換
//     const eventData = JSON.parse(descriptionValues);

//     // pubkey と id の値を取得
//     const targetPubkey = eventData.pubkey;
//     const eid = eventData.tags.find(tag => tag[0] === "e")[1];

//     const ev = {
//         pubkey: pubKey
//         ,kind: 1
//         ,content: replyPostChar
//         ,tags: [ 
//             ["p", targetPubkey, ""]
//             ,["e", eid, ""] 
//         ]
//         ,created_at: currUnixtime()
//     };

//     // イベントID(ハッシュ値)計算・署名
//     return finishEvent(ev, BOT_PRIVATE_KEY_HEX);
// };




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
    ,functionalPosting      // 機能ポスト
    ,exchangeRate           // 為替ポスト
    ,normalAutoReply        // 通常リプライ
    ,uploadBTCtoJPYChartImg // BTCチャート画像ポスト
    ,postUponReceiptofZap   // zap反応ポスト
};
  