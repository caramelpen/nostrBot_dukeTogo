/**
 * 狙撃屋13bot(@dukeTogo)
 * morphologischeAnalyse.js
 * 形態素解析を行います
 */


const kuromoji = require("kuromoji");

let tokenizerPromise = null;

// tokenizer取得（遅延初期化）
const getTokenizer = () => {
  if (!tokenizerPromise) {
    tokenizerPromise = new Promise((resolve, reject) => {
      kuromoji.builder({ dicPath: "node_modules/kuromoji/dict" })
        .build((err, tokenizer) => {
          if (err) reject(err);
          else resolve(tokenizer);
        });
    });
  }
  return tokenizerPromise;
};

// 判定関数（アロー関数）
const isNounWoEnd = async (text) => {
  if (!text) return false;

  const tokenizer = await getTokenizer();
  const tokens = tokenizer.tokenize(text.trim());

  return (
    tokens.length >= 2 &&
    tokens[tokens.length - 2].pos === "名詞" &&
    tokens[tokens.length - 1].surface_form === "を"
  );
};

module.exports = { isNounWoEnd };


/*呼び出し例
const { isNounWoEnd } = require("./yourModule");

(async () => {
  console.log(await isNounWoEnd("本を"));     // true
  console.log(await isNounWoEnd("本を読む")); // false
})();
*/
