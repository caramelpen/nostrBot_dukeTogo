const git = require("simple-git");

const toGitHubPush = async (repoPath, filePath, gitUserName, gitUserMail, comment, origin, branch) => {
    const gitOptions = {
        baseDir: repoPath,
        config: {
             "user.name": gitUserName,
             "user.email": gitUserMail
        }
    };
    const gitRepo = git(gitOptions);
    try {
        // ステージングエリアに追加
        await gitRepo.add(filePath);

        // コミット
        await gitRepo.commit(comment);

        // リモートリポジトリにプッシュ
        await gitRepo.push(origin, branch);
    } catch (err) {
        console.error(err);
        throw err;  // ここでエラーをスローして、呼び出し元でも把握ができるようにする
    }
}

module.exports = {
    toGitHubPush
};
