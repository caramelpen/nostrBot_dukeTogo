# nostrBot_dukuTogo
## nostrのbotです
### ・某狙撃屋13をキャラとして運用していますが、後述する各jsonファイルの内容を変更すれば他のキャラとして運用も可能なはずです
### ・ChatGPT と絡めたような大層なものではなく、設定された語句をランダムでポストする「ドラクエ村人的bot」です
##### 　

### 0.事前準備
### 　・以下のモジュール(バージョン)がインストールされています
#### 　・node.js v20.10.0
#### 　・npm 10.2.3
#### 　・nostr-tools@1.17.0
#### 　・websocket-polyfill@0.0.3
#### 　・dotenv@16.3.1 ... .envファイルが使用できます
#### 　・node-cron@3.0.3 ...cronが使えます
#### 　・suncalc@1.9.0 ...日の出日の入り時刻を取得できます
#### 　・ほかに環境によってはPM2などの永続化に対応したモジュールを必要に応じて使用してください
##### 　

### 1.製品識別
<pre>
nostr
   ├─common
   │      publishToRelay.js
   │      utils.js
   │
   └─dukuTogo
       ├─config
       │      autoReply.json
       │      presetDate.json
       │      sunriseSunset.json
       │
       └─src
               autoPostatPresetTime.js
               autoReply.js
               replytoReply.js
</pre>
##### 　
### 2.各ファイルの役割概要

### 2-1.common ディレクトリ
#### 　2-1-1.publishToRelay.js
##### 　　・リレーにイベントを送信する
#### 　2-1-2.utils.js
##### 　　・共通関数

### 2-2.dukuTogo\config ディレクトリ
#### 　2-2-1.autoReply.json
##### 　　・dukuTogo\src\autoReply.js, replytoReply.js で使用（後述）
#### 　2-2-2.presetDate.json
##### 　　・dukuTogo\src\autoPostatPresetTime.js で使用（後述）
#### 　2-2-3.sunriseSunset.json
##### 　　・dukuTogo\src\autoPostatPresetTime.js で使用（後述）

### 2-3.dukuTogo\src ディレクトリ
#### 　2-3-1.autoPostatPresetTime.js
##### 　　・presetDate.json, sunriseSunset.json に設定された時刻や年月日分になると設定値をポスト
#### 　2-3-2.autoReply.js
##### 　　・autoReply.json に設定された語句を発見するとそれに対応する設定値をポスト
#### 　2-3-3.replytoReply.js
##### 　　・リプライを受けるとautoReply.json に設定された設定値をポスト
##### 　

### 3.各機能詳細（長いので各mdファイルに分割しました）

### 3-1.autoPostatPresetTime.js
##### ・README_autoPostatPresetTime.md をご覧ください

### 3-2.autoReply.js
##### ・README_autoReply.md をご覧ください

### 3-3.replytoReply.js
##### ・README_replytoReply.md をご覧ください
##### 　

### 4.その他
#### 4-1.秘密鍵
##### ・秘密鍵は .envファイルの dukuTogo_BOT_PRIVATE_KEY から取得しています（0.で dotenv をインストールしているのはこのためです）
#### 4-2.3.各機能詳細内の※1について
##### ・ランダムで語句を得る方法として、配列で設定した設定語句の要素数の範囲を用いてランダム値を取得し、それをそのまま配列の要素番号として使用し、語句を得ます
#### 4-3.リレーについて
##### ・「 wss://relay-jp.nostr.wirednet.jp 」で運用させていただいています
##### 　

### 5.謝辞
#### ・Nostr Japan ( https://github.com/nostr-jp )のPeople様
#### ・Don ( https://github.com/nikolat )様
#### ・ひゅうが霄 ( https://showhyuga.blogspot.com/ )様
