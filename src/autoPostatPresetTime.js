/**
 * 狙撃屋13bot(@dukeTogo)
 * autoPostatPresetTime.js
 * jsonに設定された指定の日時に対応する語句をポスト
 */
require("websocket-polyfill");
const cron = require("node-cron");
const { relayInit, finishEvent } = require("nostr-tools");

const sunCalc = require("suncalc");
const jpnHolidays = require('@holiday-jp/holiday_jp');
const { currDateTime, currUnixtime, random, jsonSetandOpen, writeJsonFile, formattedDateTime } = require("./common/utils.js");
const { BOT_PRIVATE_KEY_HEX, pubkey, adminPubkey, RELAY_URL, GIT_USER_NAME, GIT_REPO, GIT_TOKEN, GIT_BRANCH} = require("./common/env.js");
const { publishToRelay } = require("./common/publishToRelay.js");
const { toGitHubPush } = require("./common/gitHubCooperation.js");

const { initial, uploadBTCtoJPYChartImg } = require("./replyFunction.js");


// envファイルのかたまり
const keys = {
    BOT_PRIVATE_KEY_HEX: BOT_PRIVATE_KEY_HEX
    , pubKey: pubkey
    , adminPubkey: adminPubkey
};
const envKeys = Object.freeze(keys);    // 変更不可のかたまりにしてしまう
// replyFunction へ各キーを代入する
initial(envKeys);


let sunriseSunsetJson = null;
let postEv;

let sunriseorSunset = "";
let sunriseSunsetJsonPath = "";

// 定刻ポスト
const subPresetPost = (presetDatePath, nowDate, retPostEv = undefined) => {

    try {
        
        const hours = nowDate.getHours();
        const minutes = nowDate.getMinutes();
        const presetDateJson = jsonSetandOpen(presetDatePath);
        if(presetDateJson === null || presetDateJson === undefined){
            console.error("subPresetPost:json file is not get");
            return false;
        }

        // 0:00
        if (hours === 0 && minutes === 0) {
            // jsonの親プロパティ midnightConditions を取得
            const midnightConditions = presetDateJson.midnightConditions;
            const endOfYear = new Date(nowDate.getFullYear(), 11, 31);
            const remainingDays = Math.floor((endOfYear - nowDate) / (1000 * 60 * 60 * 24));
        
            // 各条件をチェック
            for (let condition of midnightConditions) {
                let message = "";
                let subMessage = "";
                let postSubject = false;
                let idx = 0;
                // 投稿の優先順位は 指定月日 祝日 指定月 指定日 残10日単位 指定曜日 で行う
                // 指定月日
                if (condition.type === "specificDate") {
                    for (let value of condition.value) {
                        if(value.date.length > 0) {
                            const [month, date] = value.date.split("/");
                            if (nowDate.getMonth() + 1 === Number(month) && nowDate.getDate() === Number(date)) {
                                postSubject = true;
                                break;
                            }
                        }
                        idx ++;
                    }

                // 祝日
                } else if (condition.type === "jpnHoliday") {
                    if (jpnHolidays.isHoliday(nowDate)) {   // 今日は祝日だ
                        const holiday = jpnHolidays.between(nowDate, nowDate);  // 今日から今日までの祝日情報を取得(まわりくどい...)
                        message = holiday[0].name;  // 今日のみの指定なので、0番目固定で祝日の名前を取得
                        postSubject = true;
                    }

                // 指定月
                } else if (condition.type === "specificMonth") {
                    for (let value of condition.value) {
                        if(value.month.length > 0) {
                            if (nowDate.getMonth() + 1 === Number(value.month)) {
                                message = remainingDays;
                                postSubject = true;
                                break;
                            }
                        }
                        idx ++;
                    }

                // 指定日
                } else if (condition.type === "specificDay") {
                    for (let value of condition.value) {
                        if(value.day.length > 0) {
                            const day = value.day;
                            if (nowDate.getDate() === Number(value.day)) {
                                postSubject = true;
                                break;
                            }
                        }
                        idx ++;
                    }

                // 今年の残日数が value.number 日単位
                } else if (condition.type === "everyNDays") {
                    for (let value of condition.value) {
                        if(value.number.length > 0) {
                            if (remainingDays % value.number === 0) {
                                message = remainingDays;
                                postSubject = true;
                                break;
                            }
                        }
                        idx ++;
                    }
            
                // 指定曜日
                } else if(condition.type === "dayName") {
                    for (let value of condition.value) {
                        if(value.dayName.length > 0) {
                            const options = { weekday: "narrow" };  //「月」「火」などの形式で得る（「曜日」もつけたい場合は「long」と指定）
                            const dayOfWeek = new Intl.DateTimeFormat("ja-JP", options).format(nowDate);                            
                            if(dayOfWeek === value.dayName) {
                                message = dayOfWeek;
                                postSubject = true;
                                break;
                            }
                        }
                        idx ++;
                    }

                // 0:00 
                } else if(condition.type === "everyMidnight") {
                    postSubject = true;
                }

                

                if(postSubject) {
                    // ポスト語句は複数設定されており、設定数の範囲でランダムに取得
                    const postIdx = random(0,condition.value[idx].messages.length - 1);
                    message = condition.value[idx].messages[postIdx] + message;
                    if(condition.value[idx].subMessages.length > 0){
                        const subPostIdx = random(0,condition.value[idx].subMessages.length - 1);
                        subMessage = condition.value[idx].subMessages[subPostIdx];
                    }
                    postEv = composePost(message + subMessage);
                    return true;
                }

            }
            return false;
        
        } else {
            // jsonの親プロパティ minuteConditions を取得
            const minuteConditions = presetDateJson.minuteConditions;
            // HH:MM
            const currentTime = String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0");

            // 各条件をチェック
            for (let condition of minuteConditions) {
                if (condition.type === "everyMinutes") {
                    for (let value of condition.value) {
                        if (currentTime === value.minutes) {
                            // ポスト語句は複数設定されており、設定数の範囲でランダムに取得
                            const postIdx = random(0,value.messages.length - 1);
                            let subMessage = "";
                            if(value.subMessages.length > 0){
                                const subPostIdx = random(0,value.subMessages.length - 1);
                                subMessage = value.subMessages[subPostIdx];
                            }
                            postEv = composePost(value.messages[postIdx] + subMessage);
                            return true;
                        }
                    }
                }
            }
            return false;

        }
    } catch (err) {
        console.error("subPresetPost:" + err);
        return false;
    }
}






// 日の出日の入ポスト
const subSunriseSunset = (sunriseSunsetPath, nowDate, retPostEv = undefined) => {
    const nowDateTime = formattedDateTime(new Date(nowDate));
    try {
        let isPostSunrise = false;
        let isPostSunset = false;

        // 日の出と日没の格納されたjsonを取得
        sunriseSunsetJson = null;
        sunriseSunsetJson = jsonSetandOpen(sunriseSunsetPath);
        if(sunriseSunsetJson === null || sunriseSunsetJson === undefined ){
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
    ,uploadBTCtoJPYChartImg // BTCチャート
}

// ディスパッチの設定値
const funcConfig = {
    funcName: ["subPresetPost", "subSunriseSunset", "uploadBTCtoJPYChartImg"]             // useJsonFile の記述順と対応させる
    ,useJsonFile: ["presetDate.json", "sunriseSunset.json", "presetDate.json"]     // funcName の記述順と対応させる（jsonを使用しないなら""としておく）
    ,operationCategory: [0, 1, 0]                                  // 1ならGitHubへプッシュコミット（useJsonFileやuncName の記述順と対応させる）
}




/****************
 * メイン
 ***************/
const main = async () => {
    cron.schedule("* * * * *", async () => {  // 分単位
        let retPostEv = {};
        // 現在日時
        const nowDate = currDateTime();

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
                postSubject = await funcObj[funcConfig.funcName[i]](jsonPathCommon + funcConfig.useJsonFile[i], nowDate, retPostEv);

                if(postSubject) {

                    // リレー
                    const relay = await relayInit(RELAY_URL);
                    relay.on("error", () => {
                        console.error("autoPostatPresetTime:failed to connect");
                        relay.close();
                        return;
                    });

                    await relay.connect();
                    connectedSw = 1;

                    if(retPostEv.postEv !== undefined) {
                        postEv = retPostEv.postEv;
                    }
                    // ポスト
                    publishToRelay(relay, postEv);

                    // 日の出日の入りポストなら更新されたjsonファイルをGitHubへプッシュする
                    if(funcConfig.operationCategory[i] === 1) {
                        // GitHubへプッシュする
                        if(sunriseSunsetJson.gitHubPush === 1) {
                            const fileNamewk = sunriseSunsetJsonPath.split("/").pop();
                            const sunriseSunsetPathSingle = `config/${fileNamewk}`; // "../config/sunriseSunset.json" を "config/sunriseSunset.json" の形にする
                            await toGitHubPush(GIT_REPO, sunriseSunsetJsonPath, sunriseSunsetPathSingle, GIT_USER_NAME, GIT_TOKEN, "[auto/" + sunriseorSunset + "] daily update", GIT_BRANCH);
                            console.log("sunriseSunset.json is commit/push");
                        }
                    }

                }

            } catch(err) {
                console.error(err);

            } finally {
                if(connectedSw === 1) {
                    relay.close();
                    connectedSw = 0;
                }
            }
        }
    });
}


main();