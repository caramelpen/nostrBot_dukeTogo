const util = require("util");
const exec = util.promisify(require("child_process").exec);
const { currUnixtime, jsonSetandOpen } = require("./common/utils.js");
const { publishToRelay } = require("./common/publishToRelay.js");

const conditions = {
    runStop: false
    ,runStart: false
    ,occurrenceEmergency: false
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


// 緊急措置
const emergency = async (relay) => {
    conditions.occurrenceEmergency = true;
    conditions.runStop = true;
    conditions.runStart = false;
    try {
        // jsonの場所の割り出しと設定
        const jsonCommonPath = "../../config/";    // configの場所はここからみれば../config/だが、util関数の場所から見れば../../config/となる
        const jsonFineName = "surveillance.json";        
        const config = await jsonSetandOpen(jsonCommonPath + jsonFineName); 
        // ストップ
        const exec = await exeProcess(config.stopExec, config.runConfig, "stopped");
        
        if(exec) {
            // イベント組み立て
            const postEv = composePost(config.emergencyComment);

            // ポスト
            publishToRelay(relay, postEv);
        }

    } catch(err) {
        console.error("emergency logic is error:" + err);  

    }
}


module.exports = { conditions, exeProcess, emergency }
