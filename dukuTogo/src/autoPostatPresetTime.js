/**
 * 狙撃屋13bot(@dukuTogo)
 * autoPostatPresetTime.js
 * jsonに設定された指定の時刻に対応する語句をポスト
 */
require("websocket-polyfill");
const cron = require("node-cron");
const { relayInit, getPublicKey, finishEvent, nip19 } = require("nostr-tools");

const sunCalc = require("suncalc");
const { currDateTime, currUnixtime, random, jsonOpen, writeJsonFile, formattedDateTime } = require("../../common/utils.js");
const { publishToRelay } = require("../../common/publishToRelay.js");

let BOT_PRIVATE_KEY_HEX;
let pubkey;
let postEv;


// 定刻ポスト
//const subPresetPost = (relay
                    // ,presetDatePath
                    // ,nowDateTime) => {
const subPresetPost = (presetDatePath, nowDateTime) => {    
    try {
        const nowDateTime12 = nowDateTime.substring(0 ,12);     // 秒をカット   YYYYMMDDHHMM
        const nowDateTimeYMD = nowDateTime12.substring(0 ,8);   // 年月日部分
        const nowDateTimeY = nowDateTime12.substring(0 ,4);     // 年部分
        const nowDateTimeMMDD = nowDateTime12.substring(4 ,8);  // 月日部分
        const nowDateTimeHHMM = nowDateTime12.substring(8 ,12); // 時刻部分

        //console.log(nowDateTime12);    
        const presetDateJson = jsonOpen(presetDatePath);
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
                //const postEv = composePost(target.postChar[postIdx]);
                postEv = composePost(target.postChar[postIdx]);
                // ポスト
                //publishToRelay(relay, postEv);
                //break;
                return true;
            } else {
                //console.log(targetDateTime);
            }
        }
        return false;
    } catch(err) {
        console.error("subPresetPost:" + err);
        return false;
    }
  }






// 日の出日の入ポスト
// const subSunriseSunset = (relay
//                         , sunriseSunsetPath
//                         , nowDateTime, lat, lng) => {
const subSunriseSunset = (sunriseSunsetPath, nowDateTime, lat, lng) => {
    let ret = 0;
    try {
        let isPostSunrise = false;
        let isPostSunset = false;

        // 日の出と日没の格納されたjsonを取得
        const sunriseSunsetJson = jsonOpen(sunriseSunsetPath);
        //console.log(Array.isArray(sunriseSunsetJson));
        if(sunriseSunsetJson === null){
            console.error("subSunriseSunset:json file is not get");
            return false;
        }
        // jsonファイルから日の出と日の入りの日時を設定
        const sunrise = sunriseSunsetJson.sunRise;
        const sunset = sunriseSunsetJson.sunSet;

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
        // 海外サーバ設置の際の対応として、日本時間にできるようにjsonで対応
        const offset = sunriseSunsetJson.jpnTimezoneOffset1 * sunriseSunsetJson.jpnTimezoneOffset2 * 60 * 1000;

// const times1 = sunCalc.getTimes(nextDay, lat, lng);
// console.log(new Date(times1.sunrise.getTime() ));
// console.log(new Date(times1.sunrise.getTime() + offset));

        //console.log("offset:" + offset);
        if(isPostSunrise == true || isPostSunset == true) {
            // 明日の日の出日の入りの時刻を取得
            const times = sunCalc.getTimes(nextDay, lat, lng);
            // 日の出と日の入りでjsonから得るプロパティが異なるため、処理を分ける（三項演算子で書いてもいいけど、isPostSunrise の真偽判断が全部に入るのはしっくりこないので避けた）
            let nextSunriseorSunsetwk;
            let sunriseorSunset = "";
            let sunRiseorSunsetPostLength = 0;
            let sunRiseorSunsetPost = "";
            let sunRiseorSunsetConst = "";
            
            if(isPostSunrise == true) {
                // 明日の日の出時間を取得
                nextSunriseorSunsetwk = new Date(times.sunrise.getTime() + offset);
                sunriseorSunset = "sunRise";
                sunRiseorSunsetPostLength = sunriseSunsetJson.sunRisePost.length;
                sunRiseorSunsetPost = "sunRisePost";
                sunRiseorSunsetConst = "sunRiseConst";
            } else {
                if(isPostSunset == true) {
                    // 明日の日の入り時間を取得
                    nextSunriseorSunsetwk = new Date(times.sunset.getTime() + offset);
                    sunriseorSunset = "sunSet";
                    sunRiseorSunsetPostLength = sunriseSunsetJson.sunSetPost.length;
                    sunRiseorSunsetPost = "sunSetPost";
                    sunRiseorSunsetConst = "sunSetConst";
                }
            }

            let nextSunriseorSunset = formattedDateTime(nextSunriseorSunsetwk);
            nextSunriseorSunset = nextSunriseorSunset.substring(0, 12); // 秒部分をカット

            // 設定されている投稿語句の設定数の範囲でランダム数を取得する
            const postIdx = random(0, sunRiseorSunsetPostLength - 1);
            //const postEv = composePost(sunriseSunsetJson[sunRiseorSunsetConst] + sunriseSunsetJson[sunRiseorSunsetPost][postIdx]);
            postEv = composePost(sunriseSunsetJson[sunRiseorSunsetConst] + sunriseSunsetJson[sunRiseorSunsetPost][postIdx]);

            //publishToRelay(relay, postEv);

            //console.log(sunriseorSunset);
            // json ファイルへ次の日の出か日の入り時刻を書き込む
            writeJsonFile(sunriseSunsetPath, sunriseorSunset, nextSunriseorSunset);
            console.log("write json(" + sunriseorSunset + "):" + nextSunriseorSunset);
            //return true;
            ret = 1;
        } else {
            // console.log("----");
            // const times = sunCalc.getTimes(nextDay, lat, lng);
            // console.log("sunrise  :" + times.sunrise);
            // console.log("sunset   :" + times.sunset);
            // const sunriseJapanTime = formattedDateTime(new Date(times.sunrise.getTime() + offset));
            // const sunsetJapanTime = formattedDateTime(new Date(times.sunset.getTime() + offset));
            // console.log("sunriseJp:" + sunriseJapanTime);
            // console.log("sunsetJp :" + sunsetJapanTime);
            // console.log("nextDaywk:" + nextDaywk);
            // console.log("nextDay:" + nextDay);
            // console.log("nowDateTime:" +nowDateTime);
            // console.log("nowDateTime12:" + nowDateTime12);
            // console.log("currUnixtimeOrg:" + currUnixtimeOrg());
            // console.log("----");
            //return false;
        }
    } catch (err) {
        console.error("subSunriseSunset:" + err);
        return false;
    } finally {
        if(ret === 1) {
            return true;
        } else {
            return false;
        }

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





/****************
 * メイン
 ***************/
const main = async () => {
    cron.schedule ("* * * * *", async () => {  // 分単位

        // 現在日時
        const nowDate = currDateTime();
        const nowDateTime = formattedDateTime(new Date(nowDate));

        // jsonの場所を割り出すために
        const jsonPath = require("path");

        // 秘密鍵
        require("dotenv").config();
        // console.log(require("dotenv").config());
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


        for (let i = 1; i <= 2; i++) {
            let postSubject = false;
            let connectedSw = 0;

            try {

                if(i==1) {

                    // 定刻ポストjsonファイルの場所の設定
                    const presetDatePath =  jsonPath.join(__dirname, "../config/presetDate.json");

                    // 定刻ポスト
                    postSubject = subPresetPost(presetDatePath, nowDateTime);

                } else {

                    // 東京の座標を指定
                    const lat = 35.6895;
                    const lng = 139.6917;

                    // 日の出日の入りjsonファイルの場所の設定
                    const sunriseSunsetPath = jsonPath.join(__dirname, "../config/sunriseSunset.json");

                    // 日の出日の入ポスト
                    postSubject = subSunriseSunset(sunriseSunsetPath, nowDateTime, lat, lng);

                }

                if(postSubject == true) {

                    // リレー
                    const relayUrl = "wss://relay-jp.nostr.wirednet.jp";
                    const relay = relayInit(relayUrl);
                    relay.on("error", () => {
                        console.error("autoPostatPresetTime:failed to connect");
                        relay.close();
                        return;
                    });

                    await relay.connect();
                    // console.log("autoPostatPresetTime:connected to relay");
                    connectedSw = 1;
                    // /*
                    //     jsonに設定された指定の時刻に対応する語句をポスト
                    // */
                    // autoPostatPresetTime(relay);

                    // ポスト
                    publishToRelay(relay, postEv);   

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