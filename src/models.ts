// アプリ内で扱うカード/所持データ型
export interface Card {
  cardId: string;      // カード番号（キー）

  // 収集タブの絞り/並びに使う列（CSV由来）
  dan?: string;        // 発売弾（例: OP01, OP02）
  dansort?: number;    // 弾内での並び順（数値）※未指定は末尾扱い

  // 互換用（過去CSVに sort があった場合）
  sort?: number;

  // 以下は任意メタ
  name: string;
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
  count: number;
}
