export interface Card {
  cardId: string;
  name: string;
  number: string;
  rarity: string;
  color: string;
  kind: string;
  type: string;
  cost: string;
  counter: string;
  life: string;
  power: string;
  effect: string;
  attribute?: string;
  blockicon?: string;
}

export interface Ownership {
  cardId: string;
  count: number;     // 所持枚数（0以上）
  updatedAt: number; // 変更時刻（ms）
}
