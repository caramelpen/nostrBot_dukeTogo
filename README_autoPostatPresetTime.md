### 3-1.autoPostatPresetTime.js
##### ・配列で設定してある presetDate.json の presetDateTime プロパティに設定された年月日時分にヒットすると、ヒットした配列の postChar プロパティの値をポストします
##### ・ヒットした配列の postChar プロパティはさらに配列で設定されており、ランダム(※1)でポスト語句を決定します
##### ・presetDateTime プロパティの設定方法は、セットしたい YYYYMMDDHHMM を設定し、他は「9」で設定します
##### 　(例えば毎日00:00なら 999999990000 と設定し、また2024年1月1日なら 202401019999 と設定します)
##### ・sunriseSunset.json の日の出時刻プロパティ sunRise と日の入り時刻プロパティ sunSet になったら、 sunRiseConst(sunSetConst) プロパティと sunRisePost(sunSetPost) プロパティ を結合した語句をポストします
##### ・sunRisePost(sunSetPost) プロパティはさらに配列で設定されており、ランダム(※1)でポスト語句を決定します
##### ・緯度と経度を lat lng プロパティに設定します（現在東京の座標が設定されていますが、ここの値を変えれば他の地点の日の出日の入り時刻が得られます）
##### ・sunRise(sunSet) プロパティは上記ポスト後に次回の日の出(日の入り)の値を取得して更新します
##### ・海外サーバの場合、jpnTimezoneOffset1 プロパティ に「9」、jpnTimezoneOffset2 プロパティ に「60」と設定すると日本時間になります（日本サーバの際はどちらかを 0 にすれば無効になります）
##### ※1について
##### ・README.md の 4-2.3. をご覧ください