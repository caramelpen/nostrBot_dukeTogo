### 3-5.surveillance.js
- 3-5-1.stop
  - `surveillance.json`の`stopTime`プロパティに`hh:mm`形式の時刻設定がされていた場合、nodeサーバへ`runConfig`プロパティを使用して`stopExec`プロパティのstopコマンドを送信し、本botの機能を停止します
  - またこの際`stopComment`プロパティを使用してランダム(※1)でポストを行います

- 3-5-2.start
  - `surveillance.json`の`startTime`プロパティに`hh:mm`形式の時刻設定がされていた場合、nodeサーバへ`runConfig`プロパティを使用して`startExec`プロパティのstopコマンドを送信し、本botの機能を停止します
  - またこの際`startComment`プロパティを使用してランダム(※1)でポストを行います

- 3-5-3.emergency
  - 呼び出された場合は`runConfig`プロパティを使用して`stopExec`プロパティのstopコマンドを送信し、本botの機能を停止します
  - またこの際`emergencyComment`プロパティを使用してランダム(※1)でポストを行います



- ※1について
  - `README.md`の 4-2. をご覧ください
