// リレーにイベントを送信
const publishToRelay = (relay, ev) => {
/* nostr-toolsのバージョンが1.17.0だとpub.onが対応しておらずエラーになる
const pub = relay.publish(ev);

pub.on("ok", () => {
    console.log("succeess!");
});
pub.on("failed", () => {
    console.error("failed to send event");
});
*/
relay.publish(ev).then(()=>{
    console.log("publishToRelay:success!" + ev);
}).catch(()=>{
                console.error("publishToRelay:failed to send event." + ev);
            })
};




/**
 * module.exports
 */
module.exports = {
    publishToRelay
  };
  