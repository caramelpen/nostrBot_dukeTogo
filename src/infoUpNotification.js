/**
 * 狙撃屋13bot(@dukeTogo)
 * infoUpNotification.js
 * jsonファイルに記載されたURLの更新情報をポストする
 */
require("websocket-polyfill");
const { relayInit, getPublicKey, finishEvent, nip19 } = require("nostr-tools");
const { currUnixtime, jsonOpen, random, writeJsonFile } = require("./common/utils.js");
const { publishToRelay } = require("./common/publishToRelay.js");
const { toGitHubPush } = require("./common/gitHubCooperation.js");
const cron = require("node-cron");
const parser = require("rss-parser");

let relayUrl = "";
let BOT_PRIVATE_KEY_HEX = "";
let pubkey = "";
let postEv;
let gitUserName = "";
let gitRepoName = "";
let gitToken = "";
let gitBranch = "";

const infoUpNotification = async (rssJsonPath, rssJson, i) => {
    let connectedSw = 0;
    let relay = null;
    try {
        // rss調査
        const rssParser = new parser();
        const previousData = rssJson[i].rssContents;
        const feed = await rssParser.parseURL(rssJson[i].rss);
        const newData = feed.items[rssJson[i].contentsIdx].link + feed.items[rssJson[i].contentsIdx].pubDate;

        if (newData !== previousData) {
            // ポスト準備
            const constCommentIdx = random(0, rssJson[i].constComment.length - 1);
            const commentIdx = random(0, rssJson[i].comment.length - 1);
            const postChr = rssJson[i].nickName + " " + rssJson[i].constComment[constCommentIdx] 
                            + "\n" + rssJson[i].comment[commentIdx] + " " 
                            + "\n" + feed.items[rssJson[i].contentsIdx].link;
            postEv = composePost(postChr);

            // リレー
            relayUrl = process.env.RELAY_URL;    // リレーURL
            relay = await relayInit(relayUrl);
            relay.on("error", () => {
                console.error("infoUpNotification:failed to connect");
                relay.close();
                return;
            });

            await relay.connect();
            connectedSw = 1;

            // ポスト
            publishToRelay(relay, postEv);

            // json更新
            writeJsonFile(rssJsonPath, "rssContents", newData, i);
            console.log("write json(" + newData + ")");

            // GitHubへコミットプッシュする
            if(rssJson[i].gitHubPush === 1) {
                const fileNamewk = rssJsonPath.split("/").pop();
                const rssJsonPathSingle = `config/${fileNamewk}`;   // "../config/infoUpNotification.json" を "config/infoUpNotification.json" の形にする
                await toGitHubPush(gitRepoName, rssJsonPath, rssJsonPathSingle, gitUserName, gitToken, "[auto]"+ rssJson[i].nickName + " RSS info update", gitBranch);
                console.log("infoUpNotification.json is commit/push");
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
    cron.schedule("0 * * * *", () => {  // 1時間単位
        
        // jsonの場所を割り出すために
        const json= require("path");
        // 更新監視jsonファイルの場所の設定
        const jsonPath =  json.join(__dirname, "../config/infoUpNotification.json");
        // 反応語句の格納されたjsonを取得
        const rssJson = jsonOpen(jsonPath);
        if(rssJson === null){
            console.log("json file is not get");
            return;
        }           

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

        // jsonの rss プロパティの数だけ回る
        const len = rssJson.length;
        if(len > 0) {
            for (let i = 1; i <= len; i++) {
                infoUpNotification(jsonPath, rssJson, i - 1);
            }
        }
    })
}

main();