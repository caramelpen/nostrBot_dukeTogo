/**
 * env.js
 * .envファイルの取得
 */

const { getPublicKey, nip19 } = require("nostr-tools");

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

const env = {
    BOT_PRIVATE_KEY_HEX: dr.data                    // 秘密鍵
    ,pubkey: getPublicKey(dr.data)                  // 秘密鍵から公開鍵の取得
    ,adminPubkey: process.env.admin_HEX_PUBKEY      // bot管理者の公開鍵の取得
    ,RELAY_URL: process.env.RELAY_URL               // リレーURL
    ,GIT_USER_NAME: process.env.GIT_USER_NAME       // GitHubのユーザ名
    ,GIT_REPO: process.env.GIT_REPO                 // GitHubのリポジトリ
    ,GIT_TOKEN: process.env.GIT_TOKEN               // GitHubのAPIトークン
    ,GIT_BRANCH: process.env.GIT_BRANCH             // GitHubのブランチ名
};

module.exports = Object.freeze(env);
