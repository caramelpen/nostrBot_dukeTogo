# nostrBot_dukeTogo
## nostrのbotです
- 某狙撃屋13
 ( @dukeTogo npub163qhxuj7sf4hagnzrayrfypfh5cld2lshcqzqsqpqc53fy6m87sqlrvjv9 )
 をキャラとして運用していますが、後述する各jsonファイルの内容を変更すれば他のキャラとして運用も可能なはずです
- ChatGPT と絡めたような大層なものではなく、設定された語句をランダムでポストする「ドラクエ村人的bot」です

### 0.事前準備
 以下のモジュール(バージョン)がインストールされています
  - node.js (20.10.0)
  - npm (10.2.3)
    - nostr-tools (1.17.0)
    - websocket-polyfill (0.0.3)
    - @holiday-jp/holiday_jp@ (2.4.0) ...祝日取得のために使用しています
    - axios (1.6.7) ...通貨の為替レートの取得のために使用しています
    - dotenv (16.3.1) ... .envファイルが使用できます
    - node-cron (3.0.3) ...cronが使えます
    - octokit (3.1.2) ...GitHubへのプッシュで使用しています
    - rss-parser (3.13.0) ...RSSフィードの購読を行います
    - sharp (0.33.2) ...svgファイルをpngに変換するために使用しています
    - suncalc (1.9.0) ...日の出日の入り時刻を取得できます
    - vega (5.17.0) ...チャートの描画で使用しています
  - ほかに環境によってはPM2などの永続化に対応したモジュールを必要に応じて使用してください


### 1.製品識別
<pre>
├─config
│      autoReaction.json
│      autoReply.json
│      exchangeRate.json
│      functionalPosting.json
│      infoUpNotification.json
│      postUponReceiptofZap.json
│      presetDate.json
│      sunriseSunset.json
│      surveillance.json
│
└─src
    │  autoPostatPresetTime.js
    │  autoReply.js
    │  emergency.js
    │  infoUpNotification.js
    │  postUponReceiptofZap.js
    │  replyFunction.js
    │  replytoReply.js
    │  surveillance.js
    │
    └─common
           │ env.js 
           │ gitHubCooperation.js 
           │ lastReplyTimePerPubkey.js
           │ publishToRelay.js
           │ utils.js
</pre>

### 2.各ファイルの役割概要

### 2-1.config ディレクトリ
- 2-1-1.autoReaction.json
  - `src\autoReply.js`で使用（後述）
  - 内容は随時更新していきます
- 2-1-2.autoReply.json
  - `src\autoReply.js`、`replytoReply.js`で使用（後述）
  - 内容は随時更新していきます
- 2-1-3.exchangeRate.json  
  - `src\autoReply.js`で使用（後述）
- 2-1-4.functionalPosting.json
  - `src\autoReply.js`、`replytoReply.js`で使用（後述）
  - 内容は随時更新していきます 
- 2-1-5.infoUpNotification.json
  - `src\infoUpNotification.js`で使用（後述）
  - 内容は随時更新していきます
- 2-1-6.postUponReceiptofZap.json
  - `src\postUponReceiptofZap.js`で使用（後述）
- 2-1-7.presetDate.json
  - `src\autoPostatPresetTime.js`で使用（後述）
  - 内容は随時更新していきます
- 2-1-8.sunriseSunset.json
  - `src\autoPostatPresetTime.js`で使用（後述）
  - 内容は随時更新していきます
- 2-1-9.surveillance.json
  - `src\surveillance.js`、`emergency.js`で使用（後述）
  - 内容は随時更新していきます

### 2-2.src ディレクトリ
- 2-2-1.autoPostatPresetTime.js
  - `presetDate.json`と`sunriseSunset.json`に設定された時刻や年月日分になると設定値をポスト
- 2-2-2.autoReply.js
  - `autoReaction.json`、`exchangeRate.json`、`autoReply.json`に設定された語句を発見するとそれに対応する設定値をリアクションやリプライ
- 2-2-3.emergency.js
  - `surveillance.js`が実行する際の条件を保持するオブジェクト変数や、 サーバへの本botの停止／起動コマンド、緊急停止時の実行などを実装
- 2-2-4.infoUpNotification.js
  - `infoUpNotification.json`に設定されたRSSフィードを1時間おきに購読し、変更があればポスト
- 2-2-5.postUponReceiptofZap.js
  - zapをされたら、`postUponReceiptofZap.json`に設定された投稿語句を使用してポスト
- 2-2-6.replyFunction.js
  - `replytoReply`や`replytoReply`では共通のポスト仕様が適用されるため、その機能を集約したもの 
- 2-2-7.replytoReply.js
  - リプライを受けると`autoReply.json`に設定された設定値でリプライ
- 2-2-8.surveillance.js
  - `surveillance.json`に設定があると、本botの停止や起動を行う

### 2-3.src/common ディレクトリ
- 2-3-1.env.js
  - .envの設定値を納める
- 2-3-2.gitHubCooperation.js
  - GitHubとの連携（現在はプッシュ）機能
- 2-3-3.lastReplyTimePerPubkey.js
  - `autoReply.js`が最後にリプライした日時を保管しておくマップ  
- 2-3-4.publishToRelay.js
  - リレーにイベントを送信する
- 2-3-5.utils.js
  - 共通関数


### 3.各機能詳細（長いので各mdファイルに分割しました）

- 3-1.autoPostatPresetTime.js
  - `README_autoPostatPresetTime.md`をご覧ください

- 3-2.autoReply.js
  - `README_autoReply.md`をご覧ください
 
- 3-3.emergency.js
  - `README_emergency.md`をご覧ください 

- 3-4.infoUpNotification.js
  - `README_infoUpNotification.md`をご覧ください

- 3-5.postUponReceiptofZap.js
  - 'README_postUponReceiptofZap.md'をご覧ください

- 3-6.replytoReply.js
  - `README_replytoReply.md`をご覧ください

- 3-7.surveillance.js
  - `README_surveillance.md`をご覧ください 

### 4.その他
- 4-1.秘密鍵
  - 秘密鍵は`.env`ファイルの`BOT_PRIVATE_KEY`(nsec...)から取得しています（0.で`dotenv`をインストールしているのはこのためです）
- 4-2.各機能詳細内の※1について
  - ランダムで語句を得る方法として、配列で設定した設定語句の要素数の範囲を用いてランダム値を取得し、それをそのまま配列の要素番号として使用し、語句を得ます
- 4-3.リレーについて
  - `wss://relay-jp.nostr.wirednet.jp`で運用させていただいています
    (`.env`ファイルの`RELAY_URL`からリレーURLは取得しています)

### 5.ライセンス
- MIT No Attribution(MIT-0)です(詳しくは LICNECE ファイルをご覧ください)

### 6.謝辞
- Nostr Japan ( https://github.com/nostr-jp )各位
- Don ( https://github.com/nikolat )様
- ひゅうが霄 ( https://showhyuga.blogspot.com/ )様
- 名言まとめドットコム ( https://www.underwater-festival.com/00096-2/ )様
- 劇画 Bombs away！( https://onihei-fan.com/?p=10214 )様
