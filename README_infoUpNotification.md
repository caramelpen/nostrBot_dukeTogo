### 3-3.infoUpNotification.js
- 毎時`infoUpNotification.json`の`rss`プロパティに設定してあるRSSフィードを購読し、更新が確認出来たらその旨をポストします
- `contentsIdx`プロパティには購読するRSS中のコンテンツ要素番号を設定します
- `rssContents`に前回取得したフィードの情報を保存し、次回以降はこの値と毎時取得する購読情報を比較し、異なれば「更新された」と判断します
- `nickName`、`constComment`(※1)、`comment`(※1)プロパティの値を用いてポストは行われます
- ポストを行ったら、`rssContents`に今回取得したフィードの情報を保存します
- `gitHubPush`プロパティが1なら、GitHubへ`.env`の`GIT_USER_NAME`、`GIT_REPO`、`GIT_TOKEN`、`GIT_BRANCH`を使用してコミットとプッシュを行います（そのため`octokit`をインストールしています）
- 毎時処理を行うため、`node-cron`をインストールしています


##### ※1について
- `README.md`の 4-2. をご覧ください
