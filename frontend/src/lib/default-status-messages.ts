// 解説: このファイルはステータスメッセージ未設定ユーザーに表示するデフォルト文言を提供する。
// 解説: 呼ばれる場所: BrowsePage.tsx / ProfileDetailPage.tsx 等でステータスメッセージが null のとき
// 解説: ユーザーが自分でステータスメッセージを設定するまでの間、このリストから1つ表示する

// 解説: DEFAULT_STATUS_MESSAGES = デフォルトのステータスメッセージの定数配列（as const = 変更不可）
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

// 解説: getDefaultStatusMessage(userId) = ユーザー ID の先頭文字コードを配列長で割った余りを index にする
//   ユーザーごとに固定のメッセージが返るが「ランダム感」がある（同じユーザーは常に同じ文言）
export function getDefaultStatusMessage(userId: string): string {
  if (!userId) return DEFAULT_STATUS_MESSAGES[0]
  return DEFAULT_STATUS_MESSAGES[userId.charCodeAt(0) % DEFAULT_STATUS_MESSAGES.length]
}
