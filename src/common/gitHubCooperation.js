const { Octokit } = require("octokit");
const fs = require("fs");
const { execSync } = require("child_process");

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
//const toGitHubPush = async (repoName, filePath, relativePath, gitUserName, gitToken, comment, branch) => {
const toGitHubPush = async (repoName, filePath, relativePath, gitUserName, gitToken, comment, branch, projectRoot = null) => {    
    try {
        const octokit = new Octokit({
            auth: gitToken
        });

        // ファイルのコンテンツを取得
        let fileContent = fs.readFileSync(filePath, "utf-8");

        // core.autocrlf = true 環境下で GitHub API 経由のプッシュ時に
        // CRLF/LF の差異が生じないよう、LF に正規化する
        fileContent = fileContent.replace(/\r\n/g, "\n");

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
            repo: repoName,
            path: relativePath,
            message: comment,
            content: Buffer.from(fileContent).toString("base64"),
            branch: branch, // プッシュ先のブランチ名
            sha: fileSha    // ファイルの SHA ハッシュ
        });

        // GitHub API 経由での push 後、ローカル git 参照を同期させる
        // これにより VSCode の git 差分表示が正しく更新される
        if (projectRoot) {
            try {
                //execSync(`git -C "${projectRoot}" fetch origin ${branch}:${branch}`, { stdio: "pipe" });
                //execSync(`git -C "${projectRoot}" pull --ff-only origin ${branch}`, { stdio: "pipe" });
                execSync(`git -C "${projectRoot}" fetch origin`, { stdio: "pipe" });
                console.log(`Local git reference updated for branch: ${branch}`);
            } catch (fetchErr) {
                console.warn("Git fetch failed after push, but push was successful:", fetchErr.message);
            }
        }


    } catch (err) {
        console.error("GitHubPush is Err:"+ err);
        throw err;  // ここでエラーをスローして、呼び出し元でも把握ができるようにする
    }
}

module.exports = {
    toGitHubPush
};
