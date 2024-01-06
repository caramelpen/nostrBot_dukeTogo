# nostrBot_dukuTogo
## nostrのbotです
##### 　

### 0.事前準備
#### 　以下のパッケージをインストールしています
#### 　・node.js v20.10.0
#### 　・npm 10.2.3
#### 　・nostr-tools@1.17.0
#### 　・websocket-polyfill@0.0.3
#### 　・dotenv@16.3.1 ... .envファイルが使用できます
#### 　・node-cron@3.0.3 ...cronが使えます
#### 　・suncalc@1.9.0 ...日の出日の入り時刻を取得できます
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

### 3.各機能詳細

### 3-1.autoPostatPresetTime.js
##### ・配列で設定してある presetDate.json の presetDateTime プロパティに設定された年月日時分にヒットすると、ヒットした配列の postChar プロパティの値をポストします
##### ・ヒットした配列の postChar プロパティはさらに配列で設定されており、ランダム(※1)でポスト語句を決定します
##### ・presetDateTime プロパティの設定方法は、セットしたい YYYYMMDDHHMM を設定し、他は「9」で設定します
##### 　(例えば毎日00:00なら 999999990000 と設定し、また2024年1月1日なら 202401019999 と設定します)
##### ・sunriseSunset.json の日の出時刻プロパティ sunRise と日の入り時刻プロパティ sunSet になったら、 sunRiseConst(sunSetConst) プロパティと sunRisePost(sunSetPost) プロパティ を結合した語句をポストします
##### ・sunRisePost(sunSetPost) プロパティはさらに配列で設定されており、ランダム(※1)でポスト語句を決定します
##### ・日の出日の入りの時刻は東京の座標を使用します
##### ・sunRise(sunSet) プロパティは上記ポスト後に次回の日の出(日の入り)の値を取得して更新します
##### ・海外サーバの場合、jpnTimezoneOffset1 プロパティ に 9 jpnTimezoneOffset2 プロパティ に 60 と設定すると日本時間になります（日本サーバの際はどちらかを 0 にすれば無効になります）

### 3-2.autoReply.js
##### ・フィードを購読し、配列で設定してある autoReply.json の orgPost プロパティに設定された語句をフィードに発見すると、 probability プロパティに設定された確率を満たした時に限り、対応する配列で設定された replyPostChar プロパティからランダム(※1)でリプライ語句を決定し、元々の語句の投稿者へそのリプライ語句をリプライします
##### ・確率には例外があり、反応語句の前方に「ゴルゴ」という文字列を発見すると確率判定を無視し、100%の確率でリプライします（例：「ゴルゴテスト」、「ゴルゴ　テスト」　など）
##### ・複数の反応語句をポストした場合はjsonの記述順で初めにヒットした反応語句が対象になります

### 3-3.replytoReply.js
##### ・本botへのリプライに対し、autoReply.json の全 replyPostChar プロパティからランダム(※1)でリプライ語句を決定しリプライ投稿者へそのリプライ語句をリプライします(つまり受けたリプライの内容に即さない語句を使用してのリプライになります)
##### 　

### 4.その他
#### 4-1.秘密鍵
##### ・秘密鍵は .env ファイルから取得しています（0.で dotenv をインストールしているのはこのためです）
#### 4-2.※1について
##### ・ランダムで語句を得る方法として、配列で設定した設定語句の要素数の範囲を用いてランダム値を取得し、それをそのまま配列の要素番号として使用し、語句を得ます
##### 　

### 5.謝辞
#### ・Nostr Japan ( https://github.com/nostr-jp )のPeople様
#### ・Don ( https://github.com/nikolat )様
#### ・ひゅうが霄 ( https://showhyuga.blogspot.com/ )様
