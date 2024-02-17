const { Octokit } = require("octokit");
const fs = require("fs");

/**
 * GitHubへプッシュする
 *  リポジトリ名
 *  プッシュ対象のファイルの絶対パス（/home/user/project/projectname/config/aaa.json みたいな）
 *  GitHubにおけるリポジトリ以降のファイルまでの相対パス（config/aaa.json みたいな）※先頭にスラッシュはつけない
 *  GitHubのユーザ名（VSCodeの.gitにあるものではなく、GitHubへのログインユーザ名）
 *  このリポジトリのトークン（repoとgistを有効にしたもの）
 *  GitHub側に表示されるコミットのコメント
 *  ブランチ名（main とか）
 */
const toGitHubPush = async (repoName, filePath, relativePath, gitUserName, gitToken, comment, branch) => {
    try {
        const octokit = new Octokit({
            auth: gitToken
        });

        // ファイルのコンテンツを取得
        const fileContent = fs.readFileSync(filePath, "utf-8");

        // ファイルがすでに存在するかどうかを確認し、存在する場合は GitHubにある街頭ファイルのSHAハッシュを取得する
        let fileSha = "";
        try {
            const response = await octokit.rest.repos.getContent({
                owner: gitUserName,
                repo: repoName,
                path: relativePath,
                ref: branch // ブランチ名を指定
            });
            fileSha = response.data.sha;
        } catch (error) {
            if (error.status !== 404) {
                throw error;
            }
        }

        
        // ファイルをリポジトリにプッシュ
        await octokit.rest.repos.createOrUpdateFileContents({
            owner: gitUserName,
            repo: repoName,//"nostrBot_dukeTogo",
            path: relativePath, //"config/sunriseSunset.json",
            message: comment,
            content: Buffer.from(fileContent).toString("base64"),
            branch: branch, // プッシュ先のブランチ名
            sha: fileSha // ファイルの SHA ハッシュ
        });

    } catch (err) {
        console.error(err);
        throw err;  // ここでエラーをスローして、呼び出し元でも把握ができるようにする
    }
}

module.exports = {
    toGitHubPush
};
