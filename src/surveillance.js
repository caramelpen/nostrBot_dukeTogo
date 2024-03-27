require("websocket-polyfill");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const cron = require("node-cron");
const { relayInit, finishEvent } = require("nostr-tools");
const { currDateTime, currUnixtime, jsonSetandOpen, random } = require("./common/utils.js");
const { BOT_PRIVATE_KEY_HEX, pubkey, RELAY_URL } = require("./common/env.js");
const { publishToRelay } = require("./common/publishToRelay.js");


const jsonCommonPath = "../../config/";    // configの場所はここからみれば../config/だが、util関数の場所から見れば../../config/となる
const jsonFineName = "surveillance.json";

let runStop = false;
let runStart = false;
let occurrenceEmergency = false;
let relay;


// HH:MMで設定されたものをcron形式にして返す
const convertToCronFormat = (time) => {
    // 時と分に分割
    const [hour, minute] = time.split(":");
    // 時と分を数値に変換することでゼロサプレス
    const cronHour = parseInt(hour).toString();
    const cronMinute = parseInt(minute).toString();
    return `${cronMinute} ${cronHour} * * *`;
}


// リレーに接続
const connectRelay = async () => {
    relay = await relayInit(RELAY_URL);
    relay.on("error", () => {
        console.error("surveillance:failed to connect");
        relay.close();
        return;
    });

    await relay.connect();
    console.log("surveillance:connected to relay");
    return true;
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


// 緊急措置
const emergency = async () => {
    occurrenceEmergency = true;
    runStop = true;
    runStart = false;    
    let connectedSw = 0;
    try {
        // jsonの場所の割り出しと設定
        const config = jsonSetandOpen(jsonCommonPath + jsonFineName); 

        // ストップ
        const exec = await exeProcess(config.stopExec, config.runConfig, "stopped");
        
        if(exec) {
            // リレーに接続
            if(await connectRelay()) {
                connectedSw = 1;
                // イベント組み立て
                const postEv = composePost(config.emergencyComment);

                // ポスト
                await publishToRelay(relay, postEv);
            }
        }
        

    } catch(err) {
        console.error("emergency logic is error:" + err);  
    } finally {
        //リレーから切断
        if(connectedSw === 1) {
            relay.close();
            connectedSw = 0;
        }
    }
}


// サーバへ停止／起動コマンドの送信
const exeProcess = async (cmdExe, cmdConfig, stoporStart) => {
    try {
        const { stdout, stderr } = await exec(`NODE_OPTIONS= execArgv=[] ${cmdExe} ${cmdConfig}`);
        if (stderr) {
            console.error(`shell error: ${stderr}`);
            return false;
        }
        console.log("all processes in " + cmdConfig + " "+ stoporStart +":" + stdout);
        return true;
    } catch (err) {
        console.error("exeProcess is error:" + err);
        return false;
    }
}


// 停止／起動
const runProcess = async (config, stoporStart) => {
    let connectedSw = 0;
    let errCondition = false;
    try {
        // ストップ／スタート
        const exec = await exeProcess(config.exec, config.runConfig, stoporStart);
        if(exec) {

            //リレーに接続
            if(await connectRelay()) { 
                connectedSw = 1;
                // 語句配列の数の範囲からランダム値を取得し、それを配列要素とする
                const idx = random(0, config.comment.length - 1);
                if(idx >= 0) {
                    // イベント組み立て
                    const postEv = composePost(config.comment[idx]);

                    // ポスト
                    await publishToRelay(relay, postEv);
                }
            }
        }
    } catch (err){
        errCondition = true;
        console.error("runProcess is error:" + err);

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
                    if(!occurrenceEmergency && !runStop) {
                        if(runProcess( {exec: config.stopExec , runConfig: config.runConfig, comment: config.stopComment},"stopped" )) {
                            runStop = true;
                            runStart = false;
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
                    if(!occurrenceEmergency && !runStart) {
                        if(runProcess( {exec: config.startExec , runConfig: config.runConfig, comment: config.startComment},"started" )) {                            
                            runStart = true;
                            runStop = false;
                        }
                    }
                });
            });
        }

    } catch (err) {
        console.error(":" + err);
    }
}





main();



module.exports = {
    emergency
}
