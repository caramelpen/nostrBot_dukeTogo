/**
 * 狙撃屋13bot(@dukeTogo)
 * autoPostatPresetTime.js
 * jsonに設定された指定の時刻に対応する語句をポスト
 */
require("websocket-polyfill");
const cron = require("node-cron");
const { relayInit, getPublicKey, finishEvent, nip19 } = require("nostr-tools");

const sunCalc = require("suncalc");
const { currDateTime, currUnixtime, random, jsonSetandOpen, writeJsonFile, formattedDateTime } = require("./common/utils.js");
const { publishToRelay } = require("./common/publishToRelay.js");
const { toGitHubPush } = require("./common/gitHubCooperation.js");

let sunriseSunsetJson = null;
let BOT_PRIVATE_KEY_HEX = "";
let pubkey = "";
let postEv;
let relayUrl = "";

let sunriseorSunset = "";
let sunriseSunsetJsonPath = "";

let gitUserName = "";
let gitRepoName = "";
let gitToken = "";
let gitBranch = "";


// // 0:00になったら実行する関数
// const executeAtMidnight = (presetDatePath, nowDateTime) => {    //各引数はほかの関数と合わせるためのもので、ここでは使用しない
//     const nowDate = currDateTime();
//     if (nowDate.getHours() === 0 && nowDate.getMinutes() === 0) {   // 0:00 なら
//         // 年末の日付を作成
//         const endOfYear = new Date(nowDate.getFullYear(), 11, 31); // 月は0から始まるため、11 は12月を表す

//         // 今日から年末までの残りの時間を計算
//         const millisecondsPerDay = 24 * 60 * 60 * 1000; // 1日のミリ秒数
//         const remainingDays = Math.round((endOfYear - nowDate) / millisecondsPerDay);

//         // 残りの日数が10の倍数の場合、または12月であるなら
//         const remainingDaysMod10 = remainingDays % 10;
//         if (remainingDaysMod10 === 0 || nowDate.getMonth() === 11) {
//             if (nowDate.getMonth() === 11 && nowDate.getDate() === 31) {
//                 console.log(`今日は大みそかです！新しい年まであと${remainingDays}日です。`);
//             } else {
//                 if(nowDate.getMonth() === 11) {
//                     console.log(`今年も残すところあと${remainingDays}日です。`);
//                 } else {
//                     console.log(`今日から年末まで、残り${remainingDays}日です。`);
//                 }
//             }
//         }
//     }
// }


// 定刻ポスト
const subPresetPost = (presetDatePath, nowDateTime) => {
    try {
        const nowDateTime12 = nowDateTime.substring(0 ,12);     // 秒をカット   YYYYMMDDHHMM
        const nowDateTimeYMD = nowDateTime12.substring(0 ,8);   // 年月日部分
        const nowDateTimeY = nowDateTime12.substring(0 ,4);     // 年部分
        const nowDateTimeMMDD = nowDateTime12.substring(4 ,8);  // 月日部分
        const nowDateTimeHHMM = nowDateTime12.substring(8 ,12); // 時刻部分

        const presetDateJson = jsonSetandOpen(presetDatePath);
        if(presetDateJson === null){
            console.error("subPresetPost:json file is not get");
            return false;
        }

        // ポストに至るまでの確認は5回
        for (let i = 1; i <= 5; i++) {
            let targetDateTime;
                    
            if(i===1) {
                targetDateTime = nowDateTime12;                     // フル設定
            } else if(i===2) {
                targetDateTime = nowDateTimeYMD + "9999";           // 年月日部分のみ設定
            } else if(i===3) {
                targetDateTime = nowDateTimeY + "99999999";         // 年部分のみ設定
            } else if(i===4) {
                targetDateTime = "9999" + nowDateTimeMMDD + "9999"; // 月日部分のみ設定
            } else if(i===5) {
                targetDateTime = "99999999" + nowDateTimeHHMM;      // 時刻部分のみ設定
            }

            // jsonに設定された年月日時分か調べる
            const target = presetDateJson.find((element) => element.presetDateTime === targetDateTime);
            if (target) {
                // ポスト語句は複数設定されており、設定数の範囲でランダムに取得
                const postIdx = random(0,target.postChar.length - 1);
                postEv = composePost(target.postChar[postIdx]);
                return true;
            }
        }
        return false;
    } catch(err) {
        console.error("subPresetPost:" + err);
        return false;
    }
  }






// 日の出日の入ポスト
const subSunriseSunset = (sunriseSunsetPath, nowDateTime) => {
    try {
        let isPostSunrise = false;
        let isPostSunset = false;

        // 日の出と日没の格納されたjsonを取得
        sunriseSunsetJson = null;
        sunriseSunsetJson = jsonSetandOpen(sunriseSunsetPath);
        if(sunriseSunsetJson === null){
            console.error("subSunriseSunset:json file is not get");
            return false;
        }

        // jsonファイルから日の出と日の入りを得る座標を取得
        const lat = sunriseSunsetJson.lat;
        const lng = sunriseSunsetJson.lng;

        // jsonファイルから日の出と日の入りの日時を取得
        const sunrise = sunriseSunsetJson.sunrise;
        const sunset = sunriseSunsetJson.sunset;

        // 明日の日付
        const nextDaywk = nowDateTime.substring(0 ,4) + "/" 
                        + nowDateTime.substring(4 ,6) + "/" 
                        + nowDateTime.substring(6 ,8);
        const mewDate = new Date(nextDaywk);
        const addDay = mewDate.setDate(mewDate.getDate() + 1);
        const nextDay = new Date(addDay);

        const nowDateTime12 = Number(nowDateTime.substring(0 ,12)); // 秒をカット

        // 日の出になったか
        if(Number(sunrise) === nowDateTime12) {
            isPostSunrise = true;
        } else {
            // 日没になったか
            if(Number(sunset) === nowDateTime12) {
                isPostSunset = true;
            }
        }
        // 海外サーバ設置の際など、timedatectl set-timezone Asia/Tokyo を行ってもなぜか日本時刻が得られない対応として、日本時間にできるようにjsonで対応
        const offset = sunriseSunsetJson.jpnTimezoneOffset1 * sunriseSunsetJson.jpnTimezoneOffset2 * 60 * 1000;
        if(isPostSunrise == true || isPostSunset == true) {
            const nowDateTime12toString = nowDateTime12.toString();
            const jpnNotation = nowDateTime12toString.substring(0 ,4) + "年"
                                + (nowDateTime12toString.substring(4 ,6)).replace(/^0+/, '') + "月"
                                + (nowDateTime12toString.substring(6 ,8)).replace(/^0+/, '') + "日" + " "
                                + (nowDateTime12toString.substring(8 ,10)).replace(/^0+/, '') + "時" + 
                                + (nowDateTime12toString.substring(10 ,12)).replace(/^0+/, '') + "分"; // .replace(/^0+/, '') はゼロサプレスの正規化表現

            // 明日の日の出日の入りの時刻を取得
            const times = sunCalc.getTimes(nextDay, lat, lng);
            // 日の出と日の入りでjsonから得るプロパティが異なるため、処理を分ける（三項演算子で書いてもいいけど、isPostSunrise の真偽判断が全部に入るのはしっくりこないので避けた）
            let nextSunriseorSunsetwk;
            sunriseorSunset = "";
            let sunriseorSunsetPostLength = 0;
            let sunriseorSunsetPost = "";
            let sunriseorSunsetConst = "";
            
            if(isPostSunrise == true) {
                // 明日の日の出時間を取得
                nextSunriseorSunsetwk = new Date(times.sunrise.getTime() + offset);
                // 各 json プロパティの取得
                sunriseorSunset = "sunrise";
                sunriseorSunsetPostLength = sunriseSunsetJson.sunrisePost.length;
                sunriseorSunsetPost = "sunrisePost";
                sunriseorSunsetConst = "sunriseConst";
            } else {
                if(isPostSunset == true) {
                    // 明日の日の入り時間を取得
                    nextSunriseorSunsetwk = new Date(times.sunset.getTime() + offset);
                    // 各 json プロパティの取得
                    sunriseorSunset = "sunset";
                    sunriseorSunsetPostLength = sunriseSunsetJson.sunsetPost.length;
                    sunriseorSunsetPost = "sunsetPost";
                    sunriseorSunsetConst = "sunsetConst";
                }
            }

            let nextSunriseorSunset = formattedDateTime(nextSunriseorSunsetwk);
            nextSunriseorSunset = nextSunriseorSunset.substring(0, 12); // 秒部分をカット

            const postChrConst = sunriseSunsetJson[sunriseorSunsetConst] + "(" +  sunriseSunsetJson.location + "／" + jpnNotation + ")\n";

            // 設定されている投稿語句の設定数の範囲でランダム数を取得する
            const postIdx = random(0, sunriseorSunsetPostLength - 1);
            // 投稿イベントを組み立て
            postEv = composePost(postChrConst + sunriseSunsetJson[sunriseorSunsetPost][postIdx]);

            // 今回の投稿が日の出なら次の日の出、日の入りなら次の日の入りの時刻を json ファイルの sunRise(sunSet) プロパティへ書き込む
            writeJsonFile(sunriseSunsetJsonPath, sunriseorSunset, nextSunriseorSunset, -1);
            console.log("write json(" + sunriseorSunset + "):" + nextSunriseorSunset);
            return true;
        } else {
            return false;
        }
    } catch (err) {
        console.error("subSunriseSunset:" + err);
        return false;
    }
}




// 投稿イベントを組み立てる
const composePost = (postChar) => {
    const ev = {
        pubkey: pubkey
        ,kind: 1
        ,content: postChar
        ,tags: []
        ,created_at: currUnixtime()
    };

    // イベントID(ハッシュ値)計算・署名
    return finishEvent(ev, BOT_PRIVATE_KEY_HEX);
};


// ディスパッチのオブジェクト
const funcObj = {
    subPresetPost           // 定刻ポスト
    ,subSunriseSunset       // 日の出日の入ポスト
    // ,executeAtMidnight      // 年末残日数ポスト
}

// ディスパッチの設定値
const funcConfig = {
    // funcName: ["executeAtMidnight", "subPresetPost", "subSunriseSunset" ]   // useJsonFile の記述順と対応させる
    // ,useJsonFile: ["","presetDate.json", "sunriseSunset.json"]              // funcName の記述順と対応させる（jsonを使用しないなら""としておく）
    // ,operationCategory: [0, 0, 1]                                           // 1ならGitHubへプッシュコミット（useJsonFileやuncName の記述順と対応させる）

    funcName: ["subPresetPost", "subSunriseSunset" ]   // useJsonFile の記述順と対応させる
    ,useJsonFile: ["presetDate.json", "sunriseSunset.json"]              // funcName の記述順と対応させる（jsonを使用しないなら""としておく）
    ,operationCategory: [0, 1]                                           // 1ならGitHubへプッシュコミット（useJsonFileやuncName の記述順と対応させる）
}





/****************
 * メイン
 ***************/
const main = async () => {
    cron.schedule("* * * * *", async () => {  // 分単位

        // 現在日時
        const nowDate = currDateTime();
        const nowDateTime = formattedDateTime(new Date(nowDate));

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

        gitUserName = process.env.GIT_USER_NAME;
        gitRepoName = process.env.GIT_REPO;
        gitToken = process.env.GIT_TOKEN;
        gitBranch = process.env.GIT_BRANCH;

        // jsonの場所を割り出すために
        const jsonPath = require("path");

        for(let i = 0; i <= funcConfig.funcName.length - 1; i++) {            
            let postSubject = false;
            let connectedSw = 0;
            sunriseSunsetJsonPath = "";
            const jsonPathCommon = "../../config/"; // configの場所はここからみれば../config/だが、util関数の場所から見れば../../config/となる

            try {
                
                if(funcConfig.operationCategory[i] === 1) {
                    // 日の出日の入りjsonファイルの場所の設定
                    sunriseSunsetJsonPath = jsonPath.join(__dirname, "../config/sunriseSunset.json");
                }

                // 処理の実行はディスパッチで行い、スリム化をはかる
                postSubject = await funcObj[funcConfig.funcName[i]](jsonPathCommon + funcConfig.useJsonFile[i], nowDateTime);

                if(postSubject) {

                    // リレー
                    relayUrl = process.env.RELAY_URL;    // リレーURL
                    const relay = await relayInit(relayUrl);
                    relay.on("error", () => {
                        console.error("autoPostatPresetTime:failed to connect");
                        relay.close();
                        return;
                    });

                    await relay.connect();
                    connectedSw = 1;

                    // ポスト
                    publishToRelay(relay, postEv);

                    // 日の出日の入りポストなら更新されたjsonファイルをGitHubへプッシュする
                    if(funcConfig.operationCategory[i] === 1) {
                        // GitHubへプッシュする
                        if(sunriseSunsetJson.gitHubPush === 1) {
                            const fileNamewk = sunriseSunsetJsonPath.split("/").pop();
                            const sunriseSunsetPathSingle = `config/${fileNamewk}`; // "../config/sunriseSunset.json" を "config/sunriseSunset.json" の形にする
                            await toGitHubPush(gitRepoName, sunriseSunsetJsonPath, sunriseSunsetPathSingle, gitUserName, gitToken, "[auto/" + sunriseorSunset + "] daily update", gitBranch);
                            console.log("sunriseSunset.json is commit/push");
                        }
                    }

                }

            } catch(err) {
                console.error(err);

            } finally {
                if(connectedSw === 1) {
                    relay.close();
                }
            }
        }
    });
}


main();