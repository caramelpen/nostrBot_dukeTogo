### 3-5.postUponReceiptofZap.js
- 3-5-1.概要
  - zapを受領したら、`postUponReceiptofZap.json`の`postedWord`プロパティと`postedSubWord`を使用してランダム(※1)でポストを行います

- 3-5-2.リレー
  - zapレシートイベントである`9735`は日本リレーを弾くため、海外リレーを`.env`の`RELAY_URL_ZAP`に設定し、そこへ接続したうえで、`9735`イベントの取得を試みます

- 3-5-3.リレー
  - `9735`イベントで取得できる公開鍵はzapをしてくれたユーザではなく、zapウォレットの公開鍵になるため、`.env`の`ZAPPER_PUBKEYS`にカンマ区切りで公開キーを設定（現状、WOSとAlbyの公開鍵を設定しています）し、`9735`イベント取得の`authors`タグとして使用します


- ※1について
  - `README.md`の 4-2. をご覧ください
