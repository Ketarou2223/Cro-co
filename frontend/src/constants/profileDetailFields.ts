export interface DetailOption { value: string; label: string; }
export type DetailControl = 'single' | 'multi' | 'height';
export interface DetailFieldDef {
  key: string;
  label: string;
  control: DetailControl;
  options?: DetailOption[];
  maxItems?: number;
}

export const HOMETOWNS: string[] = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県',
  '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県',
  '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
  '海外',
];

export const DETAIL_FIELDS: DetailFieldDef[] = [
  { key: 'height_cm', label: '身長', control: 'height' },
  { key: 'body_type', label: '体型', control: 'single', options: [
    { value: 'slim', label: 'スリム' }, { value: 'average', label: '普通' },
    { value: 'muscular', label: '筋肉質' }, { value: 'glamorous', label: 'グラマー' },
    { value: 'chubby', label: 'ぽっちゃり' },
  ]},
  { key: 'blood_type', label: '血液型', control: 'single', options: [
    { value: 'A', label: 'A型' }, { value: 'B', label: 'B型' },
    { value: 'O', label: 'O型' }, { value: 'AB', label: 'AB型' },
  ]},
  { key: 'sibling_rank', label: '兄弟構成', control: 'single', options: [
    { value: 'only', label: '一人っ子' }, { value: 'eldest_son', label: '長男' },
    { value: 'eldest_daughter', label: '長女' }, { value: 'second_son', label: '次男' },
    { value: 'second_daughter', label: '次女' }, { value: 'third_son', label: '三男' },
    { value: 'third_daughter', label: '三女' }, { value: 'later', label: 'それ以降' },
  ]},
  { key: 'languages', label: '話せる言語', control: 'multi', maxItems: 8, options: [
    { value: 'ja', label: '日本語' }, { value: 'en', label: '英語' },
    { value: 'zh', label: '中国語' }, { value: 'ko', label: '韓国語' },
    { value: 'fr', label: 'フランス語' }, { value: 'de', label: 'ドイツ語' },
    { value: 'es', label: 'スペイン語' }, { value: 'other', label: 'その他' },
  ]},
  { key: 'campus', label: 'キャンパス', control: 'single', options: [
    { value: 'toyonaka', label: '豊中' }, { value: 'suita', label: '吹田' },
    { value: 'minoh', label: '箕面' },
  ]},
  { key: 'housing', label: '居住形態', control: 'single', options: [
    { value: 'alone', label: '一人暮らし' }, { value: 'family', label: '実家' },
    { value: 'dorm', label: '寮' }, { value: 'share', label: 'シェアハウス' },
  ]},
  { key: 'commute_time', label: '通学時間', control: 'single', options: [
    { value: 'le30', label: '〜30分' }, { value: 'le60', label: '〜1時間' },
    { value: 'le90', label: '〜1時間半' }, { value: 'le120', label: '〜2時間' },
    { value: 'le150', label: '〜2時間半' }, { value: 'gt150', label: '3時間以上' },
  ]},
  { key: 'commute_means', label: '通学手段', control: 'multi', maxItems: 6, options: [
    { value: 'train', label: '電車' }, { value: 'bus', label: 'バス' },
    { value: 'bicycle', label: '自転車' }, { value: 'walk', label: '徒歩' },
    { value: 'motorbike', label: 'バイク' }, { value: 'car', label: '車' },
  ]},
  { key: 'second_lang', label: '第二外国語', control: 'single', options: [
    { value: 'de', label: 'ドイツ語' }, { value: 'fr', label: 'フランス語' },
    { value: 'zh', label: '中国語' }, { value: 'es', label: 'スペイン語' },
    { value: 'ru', label: 'ロシア語' }, { value: 'ko', label: '朝鮮語' },
    { value: 'it', label: 'イタリア語' }, { value: 'other', label: 'その他' },
  ]},
  { key: 'marriage_intent', label: '結婚願望', control: 'single', options: [
    { value: 'someday', label: 'いずれはしたい' }, { value: 'not_now', label: '今は考えていない' },
    { value: 'unsure', label: 'わからない' },
  ]},
  { key: 'preferred_age_band', label: '好きな年齢層', control: 'single', options: [
    { value: 'older', label: '年上' }, { value: 'younger', label: '年下' },
    { value: 'same', label: '同年代' }, { value: 'any', label: 'こだわらない' },
  ]},
  { key: 'drinking', label: 'お酒', control: 'single', options: [
    { value: 'often', label: 'よく飲む' }, { value: 'sometimes', label: 'たまに飲む' },
    { value: 'no', label: '飲まない' },
  ]},
  { key: 'smoking', label: 'たばこ', control: 'single', options: [
    { value: 'no', label: '吸わない' }, { value: 'yes', label: '吸う' },
    { value: 'vape', label: '電子タバコ' }, { value: 'not_around_others', label: '相手の前では吸わない' },
  ]},
  { key: 'mbti', label: 'MBTI', control: 'single', options: [
    ...['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP',
    'ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP',
    ].map(v => ({ value: v, label: v })),
    { value: 'unknown', label: 'わからない' },
  ] },
  { key: 'hometown', label: '出身地', control: 'single', options: HOMETOWNS.map(h => ({ value: h, label: h })) },
];

// zodiac は read専用（入力UIなし）。生成値→JP表示マップ。
export const ZODIAC_LABELS: Record<string, string> = {
  aries: '牡羊座', taurus: '牡牛座', gemini: '双子座', cancer: '蟹座',
  leo: '獅子座', virgo: '乙女座', libra: '天秤座', scorpio: '蠍座',
  sagittarius: '射手座', capricorn: '山羊座', aquarius: '水瓶座', pisces: '魚座',
};

export const HEIGHT_MIN = 140;
export const HEIGHT_MAX = 190;
