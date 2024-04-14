## ver.240414
- `postUponReceiptofZap.js`、`postUponReceiptofZap.json`を追加し、zap受領時投稿機能を追加

## ver.240407
- `autoPostatPresetTime.js`に周年投稿機能を追加

## ver.240331
- `surveillance.js`を新規追加したことによる不具合の修正のため、`emergency.js`の追加を行い、機能の強化を図る

## ver.240327
- `surveillance.json`、`surveillance.js`を新規追加し、自動停止/起動機能と緊急停止機能の追加

## ver.240326
- 設定された時刻になるとポストするBTCチャート画像に3時間単位画像も併せる機能の追加

## ver.240323
- 設定された時刻になるとBTCチャートを画像でポストする機能の追加

## ver.240316
- 3/4 19:00 頃に発生した暴走事案の修正と、各機能の見直しと追加

## ver.240301
- `functionalPosting.json`を追加し`autoReply.js`に機能リプライ機能の追加

## ver.240225
- `exchangeRate.json`を追加し`autoReply.js`に通貨為替レート機能の追加

## ver.240221
- `infoUpNotification.js`、`infoUpNotification.json`の新規追加

## ver.240219
- autoPostatPresetTime.js
    - 変数変更漏れによるバグ修正

## ver.240218
- sunriseSunset.json
    - プロパティ名の修正
- autoPostatPresetTime.js
    - `config/sunriseSunset.json`のプロパティ名修正に伴う変数名の修正

## ver.240217
- `common/gitHubCooperation.js`の新規追加
- autoPostatPresetTime.js
    - 日の出（日の入り）ポストを行ったら、更新した`sunriseSunset.json`を自動でGitHubへコミットプッシュする機能の追加
    - 上記を行うため、`octokit`のインストール

## ver.240216
- replytoReply.js
    - 購読するフィードに`tag`が設定されているものに対して処理は行うよう明示

## ver.240215
- replytoReply.js
    - リプライを受けたら`autoReply.json`にある全`replyPostChar`プロパティからランダムで選んでリプライしていたものを見直し、受けたリプライ文字列の中に`autoReply.json`の`orgPost`プロパティに設定してある反応語句が含まれていたら、その反応語句に対応する`replyPostChar`プロパティ内からランダムでリプライ語句を選んでリプライする仕様に変更（受けたリプライ文字列の中に反応語句が含まれていなければ、従来どおり`autoReply.json`にある全`replyPostChar`プロパティからランダムで選んでリプライ）

## ver.240214
- autoReply.json
    - フォロア取得の不具合の修正

## ver.240212
- autoReply.js
    - `kind:1`が発生した時ではなく、`kind:1`の中で反応語句を発見した際にそのユーザは自分のフォロアか判断するように修正

## ver.240211
- ver.240210 のバグ修正
- リレーURLは`.env`ファイルから取得するように変更

## ver.240210
- 自動反応するにはこのbotをフォローしている人のみに限るよう修正

## ver.240201
- パブリックリリース
