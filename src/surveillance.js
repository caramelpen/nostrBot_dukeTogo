/**
 * 狙撃屋13bot(@dukeTogo)
 * surveillance.js
 * botの監視プログラム
 */

require("websocket-polyfill");
const cron = require("node-cron");
const { relayInit, finishEvent } = require("nostr-tools");
const { currUnixtime, jsonSetandOpen, random } = require("./common/utils.js");
const { BOT_PRIVATE_KEY_HEX, pubkey, RELAY_URL } = require("./common/env.js");
const { publishToRelay } = require("./common/publishToRelay.js");
const { conditions, exeProcess } = require("./emergency.js");
const fs = require("fs");


const jsonCommonPath = "../../config/";    // configの場所はここからみれば../config/だが、util関数の場所から見れば../../config/となる
const jsonFineName = "surveillance.json";


// JSONファイルの監視を開始
fs.watchFile("../config/" + jsonFineName, (curr, prev) => {
    // ファイルが変更された場合の処理
    console.log("surveillance.json has been updated");

    // 変更があった場合にメインの処理を再起動する
    main();
});


// HH:MMで設定されたものをcron形式にして返す
const convertToCronFormat = (time) => {
    // 時と分に分割
    const [hour, minute] = time.split(":");
    // 時と分を数値に変換することでゼロサプレス
    const cronHour = parseInt(hour).toString();
    const cronMinute = parseInt(minute).toString();
    return `${cronMinute} ${cronHour} * * *`;
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


// 停止／起動
const runProcess = async (config, stoporStart) => {
    let connectedSw = 0;
    let errCondition = false;
    let relay;
    try {
        // ストップ／スタート
        const exec = await exeProcess(config.exec, config.runConfig, stoporStart);
        if(exec) {
            try {
                //リレーに接続
                relay = relayInit(RELAY_URL);
                relay.on("error", () => {
                    console.error("surveillance:failed to connect");
                    relay.close();
                    return;
                });
            
                await relay.connect();
                console.log("surveillance:connected to relay");

                connectedSw = 1;
                // 語句配列の数の範囲からランダム値を取得し、それを配列要素とする
                const idx = random(0, config.comment.length - 1);
                if(idx >= 0) {
                    // イベント組み立て
                    const postEv = composePost(config.comment[idx]);

                    // ポスト
                    publishToRelay(relay, postEv);
                }

            } catch (err){
                errCondition = true;
                console.error("publishToRelay of runProcess is error:["+ stoporStart + "]" + err);
            }
        }
    } catch (err){
        errCondition = true;
        console.error("runProcess is error:["+ stoporStart + "]" + err);

    } finally {
        if(connectedSw === 1){
            relay.close();
            connectedSw = 0;
        }

        if(errCondition) {
            return false;
        } else {
            return true;
        }

    }
}



const main = async () => {
    try {
        // jsonの場所の割り出しと設定
        const config = await jsonSetandOpen(jsonCommonPath + jsonFineName); 

        // 停止時間の設定がある場合
        if (config.stopTime) {
            config.stopTime.forEach(time => {
                const cronTime = convertToCronFormat(time);
                cron.schedule(cronTime, () => {
                    if(!conditions.occurrenceEmergency && !conditions.runStop) {
                        if(runProcess( {exec: config.stopExec , runConfig: config.runConfig, comment: config.stopComment},"stopped" )) {
                            conditions.runStop = true;
                            conditions.runStart = false;
                        }
                    }
                });
            });

        }

        // 起動時間の設定がある場合
        if (config.startTime) {
            config.startTime.forEach(time => {
                const cronTime = convertToCronFormat(time);
                cron.schedule(cronTime, () => {
                    if(!conditions.occurrenceEmergency && !conditions.runStart) {
                        if(runProcess( {exec: config.startExec , runConfig: config.runConfig, comment: config.startComment},"started" )) {                            
                            conditions.runStart = true;
                            conditions.runStop = false;
                        }
                    }
                });
            });
        }

    } catch (err) {
        console.error("surveillance main is error:" + err);
    }
}


main();

