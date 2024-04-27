### 3-2.autoReply.js

#### 大前提として、以降の動作はこのbotをフォローしている人にのみ行います（管理者にはいつでも動作します）

### 詳細

- 3-2-0. 現状の機能として、このbotの機能を答える`functionalPosting`、通貨の為替を答える`exchangeRate`、通常リプライである`normalAutoReply`に対応しています
  - `functionalPosting`、`exchangeRate`、`normalAutoReply`の優先順で機能し、`exchangeRate`が該当してポストを行った場合は、`normalAutoReply`は実行しません
  - 上記機能は`replytoReply.js`と大部分で共通のため、`replyFunction.js`上でコーディングされています

- 3-2-1. functionalPosting
  - フィードを購読し、`functionalPosting.json`の`orgPost`プロパティに設定してある値を発見し、その前方に`autoReaction.json`の`nativeWords`プロパティに設定してある語句(以下「固有設定値」)があれば、  `functionalPosting.json`の`replyPostChar`プロパティの値をリプライします
  - リプライができたら以降の処理へは進みません
  
- 3-2-2. exchangeRate
  - フィードを購読し、配列で設定してある`exchangeRate.json`の`orgPost`プロパティに設定された語句をフィードに「発見」し、かつその前方に固有設定値があれば、以下を行います
  - 3-2-2.1. `sw`プロパティの値が1なら`orgPost`プロパティで発見した語句を挟んだ通貨単位を使って為替レートをポストし、`sw`プロパティの値が1以外なら全通貨のリストをポストします(0.で`axios`をインストールしているのはこのためです)
  - 3-2-2.2. 発見した`orgPost`が存在する通貨の値なら、3-4-2.1.のように`orgPost`プロパティで発見した語句を挟まなくても、`autoTargetCurrency`プロパティを使用した為替レートをリプライします
  - 利用しているAPIは現在`kraken.com`ですが、使用できる通貨に`BTC`は含まれていないにも関わらず為替レートは算出できるので、`autoOrgCurrency`プロパティに`BTC`と設定し、ポストが`BTC`でもレートがリプライできるようにしています
  - `open exchange rates`にユーザ登録することで得られるAPIキーを`.env`ファイルの`OPEN_EXCHANGE_RATES_API`に設定します
  - フィードを購読し、配列で設定してある`exchangeRate.json`の`orgPost`プロパティに設定された語句をフィードに「発見できなかった」場合は、3-4-3.へ進みます
  - もし`open exchange rates`のAPIキーを取得していない場合は`.env`ファイルの`OPEN_EXCHANGE_RATES_API`を未設定にしておけば、この機能は行わず3-4-3.へ進みます

- 3-2-3. normalAutoReply
  - フィードを購読し、配列で設定してある`autoReply.json`の`orgPost`プロパティに設定された語句をフィードに発見した場合、以下の動作をします
 
    | No. | 反応語句 | 反応元投稿者 | 投稿内に固有設定値 | 作動確率 | 作動内容 |
    |:-:|:-:|:-:|:-:|:-:|:-:|
    | 1 | 発見 | 管理者 | (発見有無関係なし) | 100% | リプライ |
    | 2 | 発見 | 一般 | 反応語句の前方に発見 | 100% | リプライ |
    | 3 | 発見 | 一般 | 反応語句の前方に未発見 | ※B ※C | ※B リプライ  ※C リアクション |
    | 4 | 未発見 | 管理者 | 発見 | 100% | リプライ(※D) |
    | 5 | 未発見 | 管理者 | 発見(※A) | 100% | リアクション or リアクションとリプライ (※E) |
    | 6 | 未発見 | 管理者 | 発見(※F) | 100% | リプライ (※D) |
    | 7 | 未発見 | 一般 | 発見(※A) | 100% | リアクション or リアクションとリプライ (※E) |
    | 8 | 未発見 | 一般 | 発見(※F) | 100% | リプライ (※D) |

    (※A)設定値がポスト内のどこかに存在するのではなく、ポストが設定値そのものの完全一致  
    (※B)各反応語句に設定された確率  
    (※C)各反応語句に設定された確率の倍  
    (※D)全反応語句に設定されたリプライ語句全てからランダム  
    (※E)リアクションカスタム絵文字の設定からランダムで取得したカスタム絵文字が規定絵文字なら規定絵文字を使用したリアクションのみ、カスタム絵文字ならその絵文字でリアクションとリプライ  
    (※F)ポストの先頭の文字が固有設定値に設定されているものを含んでいた場合

  - 3-2-3-1.フィードを購読し、配列で設定してある`autoReply.json`の`orgPost`プロパティに設定された語句をフィードに「発見」(No.1～3)  
    - 1.`.env`ファイルの`admin_HEX_PUBKEY`(HEX値で設定してください) に設定した管理者の公開鍵のポストに対する反応なら、`autoReaction.json`の`nativeWords`プロパティに設定してある語句の有無に関係なく、`autoReply.json`の `replyPostChar`プロパティからランダム(※1)でリプライ語句を決定しリプライします

    - 2.管理者以外のポストに対する反応の場合、反応語句の前方に`autoReaction.json`の`nativeWords`プロパティの設定値を発見すると、`autoReply.json`の`replyPostChar`プロパティからランダム(※1)でリプライ語句を決定しリプライします

    - 3.管理者以外のポストに対する反応の場合、反応語句の前方に`autoReaction.json`の`nativeWords`プロパティの設定値が発見できないと、`autoReply.json`の`probability`プロパティに設定された確率を満たした時に限り、対応する配列で設定された`autoReply.json`の`replyPostChar`プロパティからランダム(※1)でリプライ語句を決定しリプライします
    - 4.3.において確率を満たせなかった場合は、その確率の倍で再度判定を行い、満たせば配列で設定してある`autoReaction.json`の`contentReaction`プロパティからランダム(※1)でリアクションするカスタム絵文字を取得し、その取得した要素番目に対応する`autoReaction.json`の`reactionImgURL`が設定してあるならその`reactionImgURL`でリアクションします（`reactionImgURL`に値が設定されているか100回繰り返し、設定された`reactionImgURL`を取得できた時点で繰り返しを終了します　100回繰り返しても`reactionImgURL`を取得できなければリアクションは行いません）


  - 3-2-3-2.フィードを購読し、配列で設定してある`autoReply.json`の`orgPost`プロパティに設定された語句をフィードから「未発見」(No.4～6)
    - 5.`.env`ファイルの`admin_HEX_PUBKEY`(HEX値で設定してください) に設定した管理者の公開鍵のポストであり、`autoReaction.json`の`nativeWords`プロパティに設定してある語句を含むポストなら、`autoReply.json`の全`replyPostChar`からランダム(※1)でリプライ語句を決定しリプライします

    - 6.`.env`ファイルの`admin_HEX_PUBKEY`(HEX値で設定してください) に設定した管理者の公開鍵のポストであり、`autoReaction.json`の`nativeWords`プロパティに設定してある語句そのもののポストなら、配列で設定してある`autoReaction.json`の`contentReaction`プロパティからランダム(※1)でリアクションするカスタム絵文字を取得し、その取得した要素番目に対応する`autoReaction.json`の`reactionImgURL`プロパティでリアクションし、さらに`autoReaction.json`の`reactionImgURL`プロパティを使用してリプライも行います  
※上記には例外があり、`autoReaction.json`の`contentReaction`プロパティがカスタム絵文字コードではなく既存絵文字を設定している場合は、`autoReaction.json`の`reactionImgURL`プロパティは未設定とし、リアクションは行わず、その絵文字でのリプライのみ行います

    - 7.管理者以外のポストであり、`autoReaction.json`の`nativeWords`プロパティに設定してある語句そのもののポストなら、5.に同じとなります

  - 一度のポストに複数の反応語句があった場合はjsonの記述順で初めにヒットした`orgPost`の反応語句が対象になります

##### ※1について
- `README.md`の 4-2. をご覧ください
