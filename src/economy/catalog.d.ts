export interface Product {
  id: string; kind: 'gems' | 'bundle' | 'pass'; usd: number; n: string;
  gems?: number; coins?: number; wild?: string; pass?: boolean; consumable?: boolean; d?: string; art?: string; bonus?: number;
}
export interface Grant { gems: number; coins: number; wild: string | null; pass: boolean }
declare const CATALOG: {
  PRODUCTS: Product[];
  ids: string[];
  get(id: unknown): Product | null;
  ofKind(kind: Product['kind']): Product[];
  grantOf(p: Product | string): Grant | null;
};
export default CATALOG;
