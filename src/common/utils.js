// 現在の日本時間を取得
const currDateTime = () => new Date();

// 現在の日本時間のUnixtime(秒単位)を取得
const currUnixtime = () => Math.floor(currDateTime().getTime() / 1000);

/*
// 1番目のコマンドライン引数を取得
const getCliArg = (errMsg) => {
  if (process.argv.length <= 2) {
    console.error(errMsg);
    process.exit(1);
  }
  return process.argv[2];
};
*/


/**
 * jsonを取得
 */
const asyncJsonOpen = async (jsonPath) => {
    const fs = require("fs").promises;
    try {
        const data = await fs.readFile(jsonPath, "utf8");
        const jsonData = JSON.parse(data);
        return jsonData;
    } catch (err)  {
        console.error("json Read Err:" + err);
        return null;
    }
}
const jsonOpen = (jsonPath) => {
    const fs = require("fs");
    try {
        const data = fs.readFileSync(jsonPath, "utf8");
        const jsonData = JSON.parse(data);
        return jsonData;
    } catch (err)  {
        console.error("json Read Err:" + err);
        return null;
    }
}






/**
 * json の指定のプロパティへ値を書き込む
 */
const asyncWriteJsonFile = async (jsonPath,propertyName,writeValue) => {
    let jsonData;
    const fs = require("fs").promises;
    try {
        const data = await fs.readFile(jsonPath, "utf8");
        jsonData = JSON.parse(data);
        jsonData[propertyName] = writeValue;

        // JSONデータを文字列に変換
        const jsonString = JSON.stringify(jsonData, null, 2);

        //jsonへ書き込み
        await fs.writeFile(jsonPath, jsonString, "utf8");
        //console.log(`Property "${propertyName}" has been updated successfully.`);
        return true;
    } catch (err){
        console.error("json Read or Write Err:" + err);
        return false;
    }
}
const writeJsonFile = (jsonPath,propertyName,writeValue) => {
    let jsonData;
    const fs = require("fs");
    try {
        const data = fs.readFileSync(jsonPath, "utf8");
        jsonData = JSON.parse(data);
        jsonData[propertyName] = writeValue;

        // JSONデータを文字列に変換
        const jsonString = JSON.stringify(jsonData, null, 2);

        //jsonへ書き込み
        fs.writeFileSync(jsonPath, jsonString, "utf8");
        //console.log(`Property "${propertyName}" has been updated successfully.`);
        return true;
    } catch (err){
        console.error("json Read or Write Err:" + err);
        return false;
    }
}






/**
 * ファイルの存在チェック
 */
const asyncIsFileExists = async (targetFilePath) => {
    const fs = require("fs").promises;
    try {
        const stats = await fs.stat(targetFilePath);
        return stats.isFile();
    } catch (error) {
        if (error.code === 'ENOENT') {
        console.error("asyncIsFileExists:file is not exists");
        return false;
        }
    }
}
const isFileExists = (targetFilePath) => {
    const fs = require("fs");
    if (fs.existsSync(targetFilePath)) {
        return true;
    } else {
        console.error("isFileExists:file is not exists");
        return false;
    }
}





// 引数のイベントにリプライしても安全か?
// 対象の発行時刻が古すぎる場合・最後にリプライを返した時点からクールタイム分の時間が経過していない場合、安全でない
const isSafeToReply = ({ pubkey, created_at }) => {
    /* 暴走・無限リプライループ対策 */
    // リプライクールタイム
    const COOL_TIME_DUR_SEC = 60;

    // 公開鍵ごとに、最後にリプライを返した時刻(unixtime)を保持するMap
    const lastReplyTimePerPubkey = new Map();

    //const now = currUnixtimeOrg();
    const now = currUnixtime();

    if (created_at < now - COOL_TIME_DUR_SEC) {
        return false;
    }

    const lastReplyTime = lastReplyTimePerPubkey.get(pubkey);
    if (lastReplyTime !== undefined && now - lastReplyTime < COOL_TIME_DUR_SEC) {
        return false;
    }
    lastReplyTimePerPubkey.set(pubkey, now);
    return true;
}






/**
 * 第1引数から第2引数の間でランダムな整数を得る
 */
const random = (min, max) => {
    return Math.floor( Math.random() * (max + 1 - min) ) + min;
}






/**
 * 現在日時分秒を得る（YYYYMMDDHHMMSS）
 */
const formattedDateTime = (date) => {
    const y = date.getFullYear();
    const m = ('0' + (date.getMonth() + 1)).slice(-2);
    const d = ('0' + date.getDate()).slice(-2);
    const h = ('0' + date.getHours()).slice(-2);
    const mi = ('0' + date.getMinutes()).slice(-2);
    const s = ('0' + date.getSeconds()).slice(-2);

    return y + m + d + h + mi + s;
}


/*
* 確率判定
*/
const probabilityDetermination = (probability) => {
    return Math.random() < probability / 100;
}


/**
 * module.exports
 */
module.exports = {
    currDateTime
    ,currUnixtime
    // ,getCliArg
    ,asyncJsonOpen, jsonOpen
    ,asyncWriteJsonFile, writeJsonFile
    ,asyncIsFileExists, isFileExists
    ,isSafeToReply
    ,random
    ,formattedDateTime
    ,probabilityDetermination
};

