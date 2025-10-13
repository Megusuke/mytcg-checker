// src/models.ts
export interface Card {
  cardId: string;      // カード番号 (例: OP01-001)
  name: string;        // カード名
  rarity: string;      // レアリティ (C,R,SR…)
  color: string;       // 色（赤,青,緑…）
  kind: string;        // 種類（leader,character…）
  type: string;        // 特徴（麦わらの一味…）
  cost: string;        // コスト
  counter: string;     // カウンター値
  life: string;        // ライフ（リーダー以外は0）
  power: string;       // パワー
  effect: string;      // 効果
  attribute?: string;  // 属性（打,斬,特）
  blockicon?: string;  // ブロックアイコン
}

export interface Ownership {
  cardId: string;
  count: number;       // 所持枚数（0以上）
}
