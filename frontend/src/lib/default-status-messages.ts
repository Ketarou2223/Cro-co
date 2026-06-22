// 解説: このファイルはステータスメッセージ未設定ユーザーに表示する日替わり既定文を提供する。
// 解説: 呼ばれる場所: ColorfulCard.tsx / ProfileDetailPage.tsx でステータスメッセージが null のとき

// JST (+9h) オフセット。HERO_LINES（HomePage.tsx）と同方式でカレンダー日付を決定する。
const JST_OFFSET_MS = 9 * 60 * 60 * 1000

export const DEFAULT_STATUS_MESSAGES = [
  "今日も普通の一日。",
  "なんか面白いことないかな。",
  "ちょっと暇してる。",
  "気が向いたら話そう。",
  "考えごとしてた。",
  "今日は早めに帰る。",
  "課題が終わらない。",
  "なんとなく春。",
  "わりと元気です。",
  "そろそろ何かしたい。",
  "コーヒー2杯目。",
  "なんとなく外に出た。",
  "今日は冴えてる。",
  "意外と忙しい。",
  "ぼーっとしてる。",
  "もう少しだけ起きてる。",
  "テンションは中の上。",
  "ちょっと話したい気分。",
  "予定は特にない。",
  "今日のBGM、悪くない。",
  "なんでもない日。",
  "気分は薄曇り。",
  "あと一歩で平和。",
  "授業終わった。",
  "ご飯食べたい。",
  "天気がいい日は得した気分。",
  "ちょっと前向き。",
  "なにかが起こりそう。",
  "とりあえず生きてる。",
  "気になる人、いるかも。",
] as const

function _hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0
  }
  return h
}

// シード: JST 日付（YYYY-MM-DD）+ userId。同じ人・同じ日 → 同じ文。人ごとに分散。
export function getDailyStatusMessage(userId: string): string {
  const jstDate = new Date(Date.now() + JST_OFFSET_MS).toISOString().slice(0, 10)
  return DEFAULT_STATUS_MESSAGES[_hash(jstDate + (userId || '')) % DEFAULT_STATUS_MESSAGES.length]
}
