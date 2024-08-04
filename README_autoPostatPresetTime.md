### 3-1.autoPostatPresetTime.js
- 1分間隔で処理を行うため、`node-cron`をインストールしています
- 3-1-1.`presetDate.json`
  - `presetDate.json`の設定値を使用します
  - 3-1-1-1.親プロパティ`midnightConditions`
    - `midnightConditions`は毎日0:00に起動します
    - 子プロパティ`specificDate`、`anniversary`、`jpnHoliday`、`specificMonth`、`specificDay`、`everyNDays`、`dayName`、`everyMidnight`の順に作動し、どこかで作動すれば以降の動作は行いません
      - 3-1-1-1-1.`specificDate`
        - `date`プロパティの日付なら、`messages`と`subMessages`を使用してポストします(※1)
      - 3-1-1-1-2.`anniversary`
        - `date`プロパティの日付から周年を迎えていれば、`messages`と`subMessages`を使用してポストします(※1)   
      - 3-1-1-1-3.`jpnHoliday`
        - 祝日なら`messages`と`subMessages`を使用してポストします(※1)
      - 3-1-1-1-4.`specificMonth`
        - 今日の「月」が`month`なら`messages`と`subMessages`を使用して今年の残り日数をポストします(※1)
      - 3-1-1-1-5.`specificDay`
        - 今日の「日」が`day`なら`messages`と`subMessages`を使用してポストします(※1)
      - 3-1-1-1-6.`everyNDays`
        - 今日が今年の残り日数`number`で割り切れれば`messages`と`subMessages`を使用してポストします(※1)
      - 3-1-1-1-7.`dayName`
        - 今日が`dayName`曜日なら`messages`と`subMessages`を使用してポストします(※1)
      - 3-1-1-1-8.`everyMidnight`
        - 上記すべてに該当しなければ`messages`と`subMessages`を使用してポストします(※1)
  
  - 3-1-1-2.親プロパティ`minuteConditions`
    - `minuteConditions`は毎分起動します
    - 3-1-1-2-1.`everyMinutes`
      - `minutes`の時刻になったら`messages`と`subMessages`を使用してポストします(※1)
      - `date`に設定があった場合、その日の`minutes`の時刻になったらポストします
      - `date`に`mm/dd-mm/dd`というように設定があった場合、その日が設定値の範囲内の場合`minutes`の時刻になったらポストします

  - 3-1-1-3.親プロパティ`specifiedProcessatSpecifiedTime`
    - `specifiedProcessatSpecifiedTime`は`minutes`プロパティに設定された時刻`mm:ss`になるとBTCのチャートをダウンロードし画像にしたものを、`messages`と`subMessages`の文言も併せてポストします
   

- 3-1-2.`sunriseSunset.json`
  - 毎分起動します
  - `sunriseSunset.json`の日の出時刻プロパティ`sunRise`と日の入り時刻プロパティ`sunSet`になったら、`sunRiseConst`(`sunSetConst`)プロパティと`sunRisePost`(`sunSetPost`)プロパティを結合した語句をポストします
  - `sunRisePost`(`sunSetPost`)プロパティはさらに配列で設定されており、ランダム(※1)でポスト語句を決定します
  - 緯度と経度を`lat`、`lng`プロパティに設定します（現在東京の座標が設定されていますが、ここの値を変えれば他の地点の日の出日の入り時刻が得られます）
  - `sunRise`(`sunSet`) プロパティは上記ポスト後に次回の日の出(日の入り)の値を取得して更新します
  - 海外設置サーバの時などに日本時間に設定しようと、`timedatectl set-timezone Asia/Tokyo`を行ってもなぜか日本時間を得られず、UTC時間になる海外サーバの場合などは、`jpnTimezoneOffset1`プロパティ に「9」、`jpnTimezoneOffset2`プロパティ に「60」と設定すると日本時間になります（元々日本時間を得られている際はどちらかのプロパティを 0 にすれば無効になります）
  - 日の出/日の入りをポストしたら、次の日の出/日の入り時刻を検出し、jsonの`sunRise`/`sunSet`プロパティを更新します
  - jsonの`gitHubPush`プロパティが1の場合はGitHubへ`.env`の`GIT_USER_NAME`、`GIT_REPO`、`GIT_TOKEN`、`GIT_BRANCH`を使用してコミットとプッシュを行います（そのため`octokit`をインストールしています）
  - 日の出日の入り時刻を取得するため`suncalc`をインストールしています

##### ※1について
- `README.md`の 4-2. をご覧ください
