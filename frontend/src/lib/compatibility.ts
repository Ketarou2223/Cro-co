// compatibility.ts — 今日の相性占い（完全フロント・日替わり・完全対称）
// 検証済み: 順位/運命/tier すべて相互一致（A→Bが4位ならB→Aも4位、運命は必ず双方向）

import { LUCKY_ITEMS } from "./luckyItems";

// ===== 基本 =====
export const ZODIAC = ["牡羊座","牡牛座","双子座","蟹座","獅子座","乙女座","天秤座","蠍座","射手座","山羊座","水瓶座","魚座"] as const;
export const BLOOD  = ["A","B","O","AB"] as const;
const Z_CUT: [number,string][] = [[120,"山羊座"],[219,"水瓶座"],[320,"魚座"],[420,"牡羊座"],[521,"牡牛座"],[621,"双子座"],[722,"蟹座"],[822,"獅子座"],[922,"乙女座"],[1023,"天秤座"],[1122,"蠍座"],[1221,"射手座"],[1231,"山羊座"]];

export function zodiacOf(birthDate: string): string {
  const d = new Date(birthDate); const md = (d.getMonth()+1)*100 + d.getDate();
  return (Z_CUT.find(([c]) => md <= c)?.[1]) ?? "山羊座";
}
const zIdx = (sign: string) => Math.max(0, ZODIAC.indexOf(sign as any));
const bIdx = (blood: string) => Math.max(0, BLOOD.indexOf(blood as any));

// FNV-1a 32bit（Python検証版と一致）
function seed(s: string): number {
  let h = 2166136261;
  for (let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
const todayStr = () => new Date().toISOString().slice(0,10);

// ===== 対称ランキングの核 =====
const circ = (m:number,T:number,N:number) => { const d=((m-T)%N+N)%N; return Math.min(d, N-d); };
// 残差 0..N-1 を (Tへの円距離, 前方距離) で並べた順位表
function ordPos(T:number, N:number): number[] {
  const res = [...Array(N).keys()].sort((x,y)=>{
    const cx=circ(x,T,N), cy=circ(y,T,N);
    if(cx!==cy) return cx-cy;
    return ((x-T)%N+N)%N - (((y-T)%N+N)%N);
  });
  const pos = new Array(N); res.forEach((m,i)=>pos[m]=i); return pos;
}
const T_of = (date:string,key:string,N:number) => (2*seed(date+key)+1) % N; // 奇数→自己ペア無し→鏡映で相互対称
// a視点でのb順位（1始まり）。(a+b)対称なので rank(a,b)===rank(b,a)
function rankIn(a:number,b:number,_T:number,N:number,pos:number[]){ return pos[(a+b)%N] + 1; }
const bestPartner = (a:number,T:number,N:number) => ((T-a)%N+N)%N; // a の#1（鏡映）。これの#1はaに戻る

// ===== 公開API =====
export type Tier = "運命" | "かなり" | "ちょっと" | null;

// 今日のランキング等（自分の星座×血液型から）
export function dailyCompat(birthDate: string, blood: string, date = todayStr()) {
  const az = zIdx(zodiacOf(birthDate)), ab = bIdx(blood);
  const Tz = T_of(date,"zodiac",12), Tb = T_of(date,"blood",4);
  const pz = ordPos(Tz,12), pb = ordPos(Tb,4);
  const zodiacRanking = [...ZODIAC.keys()].sort((x,y)=>rankIn(az,x,Tz,12,pz)-rankIn(az,y,Tz,12,pz)).map(i=>ZODIAC[i]);
  const bloodRanking  = [...BLOOD.keys()].sort((x,y)=>rankIn(ab,x,Tb,4,pb)-rankIn(ab,y,Tb,4,pb)).map(i=>BLOOD[i]);
  return {
    bestZodiac: ZODIAC[bestPartner(az,Tz,12)],
    bestBlood:  BLOOD[bestPartner(ab,Tb,4)],
    zodiacRanking,            // 12星座を相性順
    bloodRanking,             // 4血液型を相性順
    luckyItem: LUCKY_ITEMS[ seed(`${date}|L|${az}|${ab}`) % LUCKY_ITEMS.length ],
    loveFortune: loveFortune(date, az, ab),
  };
}

// 相手プロフ用: 自分(me)から見た相手(other)の今日のtier。良い時だけ表示、悪い/普通はnull。
export function compatTier(meBirth:string, meBlood:string, otherBirth:string, otherBlood:string, date = todayStr()): Tier {
  const az=zIdx(zodiacOf(meBirth)), ab=bIdx(meBlood), bz=zIdx(zodiacOf(otherBirth)), bb=bIdx(otherBlood);
  const Tz=T_of(date,"zodiac",12), Tb=T_of(date,"blood",4);
  const pz=ordPos(Tz,12), pb=ordPos(Tb,4);
  const rz=rankIn(az,bz,Tz,12,pz), rb=rankIn(ab,bb,Tb,4,pb);
  if (rz===1 && rb===1) return "運命";
  if (rz<=4 && rb<=2)  return "かなり";
  if (rz<=4 || rb===1) return "ちょっと";
  return null;
}
// tier→相手プロフ上部に出す一文（nullなら何も出さない＝マッチ阻害を避ける）
export const TIER_MESSAGE: Record<Exclude<Tier,null>, string> = {
  "運命":   "今日のあなたと運命的な相性みたい",
  "かなり": "今日はかなり相性がいいみたい",
  "ちょっと":"今日はちょっと相性がいいかも",
};

// ===== 恋愛運（テンプレ×差し込み・日付×星座×血液でシード）=====
const LV_TEMPLATES = [
  "今日は{act}と、新しい縁が近づきそう。{adv}",
  "{act}と、恋のきっかけが生まれるかも。{adv}",
  "ふとした瞬間、{act}が運命を動かしそう。{adv}",
  "今日のあなたは{tone}。{act}と素直になれると吉。{adv}",
  "{act}に小さなときめきが隠れていそう。{adv}",
  "気になる人とは{act}が追い風に。{adv}",
  "{tone}な一日。{act}と心の距離が縮まりそう。{adv}",
  "今日は{act}を意識すると、印象がぐっと上がる。{adv}",
  "巡り合わせの良い日。{act}が幸運の入り口に。{adv}",
  "{act}と、自分らしさが魅力として伝わりそう。{adv}",
  "今日の恋愛運は上向き。{act}を大切に。{adv}",
  "{tone}な気分のときこそ、{act}がチャンスを呼ぶ。{adv}",
];
const LV_ACT = ["いつもより早い時間の行動","誰かへの短いメッセージ","笑顔のあいさつ","正直な一言","相手の話をじっくり聞くこと","新しい場所への一歩","ちょっとした気づかい","素直なお礼","背伸びしない自然体","共通の趣味の話題","食事のお誘い","散歩がてらの寄り道","懐かしい人への連絡","丁寧な身だしなみ","小さな約束を守ること","相手をほめる勇気","ゆっくり過ごす時間","新しい挑戦の報告","好きなものを共有すること","ふとした誘いの受け入れ","落ち着いた話し方","ありがとうの気持ち","一緒に笑える瞬間","気軽な相談","休憩中のひとこと"];
const LV_ADV = ["焦らず、流れに任せてみて。","小さな勇気が良い結果につながりそう。","深呼吸して、笑顔を忘れずに。","完璧を目指さなくて大丈夫。","相手のペースも尊重してみて。","直感を少しだけ信じてみよう。","無理せず自分らしくいこう。","タイミングは自然に訪れるはず。","ひとつ素直になれると流れが変わる。","聞き役にまわるのも吉。","今日の縁は大切に。","気負わず、軽やかに。","遠慮しすぎないことがコツ。","笑顔は最強のアクセサリー。","急がば回れ、を意識して。","気持ちは言葉にすると伝わる。","小さな一歩で十分。","余白のある一日にしてみて。","相手の良いところに目を向けて。","今日は受け取り上手になろう。"];
const LV_TONE = ["穏やか","前向き","チャーミング","落ち着いた","ぽかぽか","好奇心旺盛","柔らかな雰囲気","頼れる存在","マイペース","ひだまりのよう"];

function loveFortune(date:string, az:number, ab:number): string {
  const base = `${date}|love|${az}|${ab}`;
  const t = LV_TEMPLATES[ seed(base+"|t") % LV_TEMPLATES.length ];
  return t
    .replace("{act}",  LV_ACT [ seed(base+"|a") % LV_ACT.length ])
    .replace("{adv}",  LV_ADV [ seed(base+"|d") % LV_ADV.length ])
    .replace("{tone}", LV_TONE[ seed(base+"|n") % LV_TONE.length ]);
}
