### 3-4.replytoReply.js
- 3-4-0. 現状の機能として、このbotの機能を答える`functionalPosting`、通貨の為替を答える`exchangeRate`、通常リプライである`normalAutoReply`に対応しています
  - `functionalPosting`、`exchangeRate`、`normalAutoReply`の優先順で機能し、`functionalPosting`や`exchangeRate`が該当してポストを行った場合は、`normalAutoReply`は実行しません
  - 上記機能は`autoReply.js`と大部分で共通のため、`replyFunction.js`上でコーディングされています

- 3-4-1. functionalPosting
  - フィードを購読し、`functionalPosting.json`の`orgPost`プロパティに設定してある値を発見し、その前方に`autoReaction.json`の`nativeWords`プロパティに設定してある語句があれば、`functionalPosting.json`の`replyPostChar`プロパティの値をリプライします
  - リプライを行った場合は以降は進みません
 
- 3-4-2. exchangeRate
  - フィードを購読し、配列で設定してある`exchangeRate.json`の`orgPost`プロパティに設定された語句をフィードに「発見」し、かつその前方に`autoReaction.json`の`nativeWords`プロパティに設定してある語句があれば、以下を行います
  - 3-4-2.1. `sw`プロパティの値が1なら`orgPost`プロパティで発見した語句を挟んだ通貨単位を使って為替レートをポストし、`sw`プロパティの値が1以外なら全通貨のリストをポストします(0.で`axios`をインストールしているのはこのためです)
  - 3-4-2.2. 発見した`orgPost`が存在する通貨の値なら、3-4-2.1.のように`orgPost`プロパティで発見した語句を挟まなくても、`autoTargetCurrency`プロパティを使用した為替レートをリプライします
  - 利用しているAPIは現在`kraken.com`ですが、使用できる通貨に`BTC`は含まれていないにも関わらず為替レートは算出できるので、`autoOrgCurrency`プロパティに`BTC`と設定し、ポストが`BTC`でもレートがリプライできるようにしています
  - `open exchange rates`にユーザ登録することで得られるAPIキーを`.env`ファイルの`OPEN_EXCHANGE_RATES_API`に設定します
  - フィードを購読し、配列で設定してある`exchangeRate.json`の`orgPost`プロパティに設定された語句をフィードに「発見できなかった」場合は、3-4-3.へ進みます
  - もし`open exchange rates`のAPIキーを取得していない場合は`.env`ファイルの`OPEN_EXCHANGE_RATES_API`を未設定にしておけば、この機能は行わず3-4-3.へ進みます

- 3-4-3. 
  - 本botへのリプライに対し、受けたリプライ文字列の中に`autoReply.json`の`orgPost`プロパティに設定してある反応語句が含まれていたら、その反応語句に対応する`replyPostChar`プロパティ内からランダム(※1)でリプライ語句を選んでリプライします
  - 本botへのリプライに対し、受けたリプライ文字列の中に`autoReply.json`の`orgPost`プロパティに設定してある反応語句が含まれていないのなら、`autoReply.json`の全`replyPostChar`プロパティからランダム(※1)でリプライ語句を決定しリプライ投稿者へそのリプライ語句をリプライします(つまり受けたリプライの内容に即さない語句を使用してのリプライになります)



- ※1について
  - `README.md`の 4-2. をご覧ください
