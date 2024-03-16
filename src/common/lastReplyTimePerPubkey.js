/**
 * 起動後、自動リプライした日時を保管しておくマップ
 */

const lastReplyTimePerPubkey = new Map();
module.exports = { lastReplyTimePerPubkey };