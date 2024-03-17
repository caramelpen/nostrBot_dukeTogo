/**
 * utils.js
 * 共通関数
 */

const crypto = require("crypto");
const { lastReplyTimePerPubkey } = require("./lastReplyTimePerPubkey.js");   // 公開鍵ごとに、最後にリプライを返した時刻(unixtime)を保持するMap

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
const jsonSetandOpen = (filePath) => {
    try {
        // jsonの場所を割り出すために
        const jsonPath = require("path");
        const lastJsonPath = jsonPath.join(__dirname, filePath);
        const fs = require("fs");
        const data = fs.readFileSync(lastJsonPath, "utf8");
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
const writeJsonFile = (jsonPath, propertyName, writeValue, idx) => {
    let jsonData;
    const fs = require("fs");
    try {
        const data = fs.readFileSync(jsonPath, "utf8");
        jsonData = JSON.parse(data);
        if(idx < 0) {
            jsonData[propertyName] = writeValue;
        } else {
            jsonData[idx][propertyName] = writeValue;
        }

        // JSONデータを文字列に変換
        const jsonString = JSON.stringify(jsonData, null, 2);

        //jsonへ書き込み
        fs.writeFileSync(jsonPath, jsonString, "utf8");
        console.log(`Property "${propertyName}" has been updated successfully.`);
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
    const COOL_TIME_DUR_SEC2 = 5;

    // 現在のUNIX時間を取得
    const now = currUnixtime();

    // 作成日時が現在時間からクールタイムを引いたものより過去（古すぎる）なら、返信は安全ではないと判断し、偽を返す
    if (created_at < now - COOL_TIME_DUR_SEC) {
        return false;
    }

    // 公開鍵に対応する最後の返信時間を取得
    const lastReplyTime = lastReplyTimePerPubkey.get(pubkey);
    // 最後の返信時間が定義されていて、かつ現在時間から最後の返信時間を引いた値がクールタイム未満（つまり最近すぎる）であれば、返信は安全ではないと判断し、falseを返す
    if (lastReplyTime !== undefined && now - lastReplyTime <= COOL_TIME_DUR_SEC2) {
        return false;
    }
    // 返信が安全であると判断し、真を返す
    return true;
}

const updateLastReplyTime = (pubkey, time) =>{
    // 公開鍵に対する最後の返信時間を現在時間で更新
    lastReplyTimePerPubkey.set(pubkey, time);
}

// 第2引数の公開鍵が現在から10秒前以内に10個以上投稿があったら偽を返す
const retrievePostsInPeriod = (relay, pubKey) => {
    const baseSeconds = 10; 
    const currUnixtime_60 = currUnixtime - baseSeconds;

    return new Promise((resolve, reject) => {
        try {
            const sub = relay.sub([
                { 
                    "kinds": [1]
                    , "authors": [pubKey]
                    , "since": currUnixtime_60
                }
            ]);
            let cnt = 0;
            let resolved = false; // resolveが呼び出されたかどうかを追跡する変数

            const eventListener = (ev) => {
                cnt ++;
                if (cnt >= 10) {
                    sub.off("event", eventListener); // リスナーを削除
                    resolved = true; // resolveが呼び出されたことを記録
                    resolve(false);
                }
            };

            sub.on("event", eventListener);
            sub.on("eose", () => {
                sub.off("event", eventListener); // リスナーを削除
                if (!resolved) { // resolveが呼び出されていないときだけresolve(true)を呼び出す
                    resolve(true);
                }
            });
        } catch (error) {
            reject(false);
        }
    });
}


//第2引数の公開鍵からユーザ名を取得する
const userDisplayName = (relay, pubKey) => {
    return new Promise((resolve, reject) => {
        try {
            let displayName = "";
            const sub = relay.sub([
                { 
                    kinds: [0]
                    , authors: [pubKey]
                }
            ]);
            sub.on("event", (ev) => {

                // JSON文字列をJavaScriptオブジェクトに変換
                const evObj = JSON.parse(ev.content);
                
                // display_nameの値を取得
                displayName = evObj.display_name;

                resolve(displayName);
            });
        } catch (error) {
            reject(undefined);
        }
    });
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
// const probabilityDetermination = (probability) => {
//     // 100なら無条件でOK
//     if(probability >= 100) {
//         return true;
//     } else {
//         // 0ならダメ
//         if(probability <= 0) {
//             return false;
//         } else {
//             // 1-100までの整数をランダムで取得し、基準を満たせばOK
//             return Math.floor(Math.random() * 100) + 1 <= probability;
//         }
//     }
// }
const probabilityDetermination = (probability) => {
    // 100なら無条件でOK
    if(probability >= 100) {
        return true;
    } else {
        // 0ならダメ
        if(probability <= 0) {
            return false;
        } else {
            const randomInt = crypto.randomBytes(2).readUInt16BE(0) + 1;  // 1 から 65536 の範囲
            const maxRange = 65536;
            const probabilityThreshold = Math.floor((probability / 100) * maxRange);
            return randomInt <= probabilityThreshold;
        }
    }
}






/**
 * module.exports
 */
module.exports = {
    currDateTime
    ,currUnixtime
    // ,getCliArg
    ,jsonOpen, jsonSetandOpen
    ,writeJsonFile
    ,asyncIsFileExists, isFileExists
    ,isSafeToReply, updateLastReplyTime, retrievePostsInPeriod, userDisplayName
    ,random
    ,formattedDateTime
    ,probabilityDetermination
};

