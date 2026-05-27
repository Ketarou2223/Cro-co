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

export function getDefaultStatusMessage(userId: string): string {
  if (!userId) return DEFAULT_STATUS_MESSAGES[0]
  return DEFAULT_STATUS_MESSAGES[userId.charCodeAt(0) % DEFAULT_STATUS_MESSAGES.length]
}
