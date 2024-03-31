### 3-4.infoUpNotification.js
- 毎時`infoUpNotification.json`の`rss`プロパティに設定してあるRSSフィードを取得し、更新が確認出来たらその旨をポストします
- `contentsIdx`プロパティには取得するRSS中のコンテンツ要素番号を設定します
- 取得するRSSのタグは`guid`と`pubDate`とし、jsonの`rssContents`に前回取得したフィードの情報を保存し、次回以降はこの値と毎時取得する取得情報を比較し、異なれば「更新された」と判断します
- jsonの`nickName`、`constComment`(※1)、`comment`(※1)プロパティの値を用いてポストは行われます
- ポストを行ったら、jsonの`rssContents`に今回取得したフィードの情報を保存し、次回の取得の際の比較対象とします
- jsonの`gitHubPush`プロパティが1なら、GitHubへ`.env`の`GIT_USER_NAME`、`GIT_REPO`、`GIT_TOKEN`、`GIT_BRANCH`を使用してコミットとプッシュを行います（そのため`octokit`をインストールしています）
- 毎時処理を行うため、`node-cron`をインストールしています


##### ※1について
- `README.md`の 4-2. をご覧ください
