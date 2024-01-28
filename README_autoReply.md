### 3-2.autoReply.js


##### ・フィードを購読し、autoReaction.json の nativeWords プロパティに設定してある語句そのもののポストを発見した場合、配列で設定してある autoReaction.json の contentReaction プロパティからランダム(※1)でリアクションするカスタム絵文字を取得し、その取得した要素番目に対応する autoReaction.json の reactionImgURL プロパティでリアクションし、さらに autoReaction.json の reactionImgURL プロパティを使用してリプライも行います
##### ・上記には例外があり、autoReaction.json の contentReaction プロパティがカスタム絵文字コードではなく既存絵文字を設定している場合は、autoReaction.json の reactionImgURL プロパティは未設定とし、リアクションは行わず、その絵文字でのリプライのみ行います
##### 

##### ・フィードを購読し、配列で設定してある autoReply.json の orgPost プロパティに設定された語句をフィードに発見すると、 probability プロパティに設定された確率を満たした時に限り、対応する配列で設定された replyPostChar プロパティからランダム(※1)でリプライ語句を決定し、元々の語句の投稿者へそのリプライ語句をリプライします

##### ・確率には例外があり、.envファイルの admin_HEX_PUBKEY (HEX値で設定してください) に設定した管理者の公開鍵のポストに対する反応か、反応語句の前方に autoReaction.json の nativeWords プロパティの設定値を発見（例：「ゴルゴテスト」、「ゴルゴ　テスト」　など）すると確率判定を無視し、100%の確率でリプライします
##### ・一度のポストに複数の反応語句があった場合はjsonの記述順で初めにヒットした orgPost の反応語句が対象になります
### 　
##### ※1について
##### ・README.md の 4-2.3. をご覧ください
