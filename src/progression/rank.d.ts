// أنواع نواة التصنيف المشتركة (src/progression/rank.js) — للخادم بـTypeScript
export interface RankProfile {
  gameId: string; seasonId: number;
  placed: boolean; placementDone: number; placementWins: number;
  tier: number; div: number; rp: number; mmr: number; protect: number;
  seasonBest: { tier: number; div: number };
  wins: number; losses: number; gamesPlayed: number; winStreak: number; bestStreak: number;
  masteryXp: number; lastPlayedAt: number; seen: string[];
}
export interface ResolveInput {
  gameId: string; mode?: string; matchId?: string | null;
  result?: Record<string, unknown>;
  opponents?: { mmr?: number }[];
}
export interface ResolveOutput {
  applied: boolean; rp: number; mmr: number; promoted: boolean; demoted: boolean;
  protected: boolean; placement: boolean; mastery: number; oldName: string; newName: string; reason: string;
  rpGain?: number; oldLabel?: string; newLabel?: string;
}
export interface GameDef {
  id: string; ar: string; icon: string; rmKey: string | null; desc: string;
  scoreModel: 'winLoss' | 'placement' | 'teamResult' | 'roundsAggregate';
  ranked: number; casual: number; room: number; bot: number; pass: number; minP: number; maxP: number; status: string;
}
declare const RankCore: {
  TIERS: { k: string; n: string; ar: string; c: string; div: number; t: number; opt: [number, number] }[];
  RP_PER_DIV: number;
  SEASON_ID: number;
  GAMES: string[];
  GAME_DEFS: GameDef[];
  MODES_ALL: string[];
  MASTERY_XP: Record<string, number>;
  SCORE_MODELS: Record<string, (res: Record<string, unknown>) => { won: boolean; strength: number }>;
  gameDef(id: string): GameDef | null;
  newRankProfile(gameId: string): RankProfile;
  tierOf(p: { tier: number }): { k: string; ar: string; div: number; t: number; opt: [number, number]; c: string; n: string };
  rankName(p: { tier: number; div: number }): string;
  rankView(p: RankProfile): Record<string, unknown>;
  masteryLevel(xp: number): number;
  grantsRP(mode: string): boolean;
  mmrDelta(myMmr: number, oppMmr: number, won: number): number;
  rpFromStrength(strength: number, myMmr: number, oppMmr: number): number;
  resolve(profile: RankProfile, o: ResolveInput, now?: number): ResolveOutput;
  softReset(profile: RankProfile, newSeasonId: number): RankProfile;
  score(profile: RankProfile): number;
  sanitizeProfile(p: unknown, gameId: string): RankProfile;
};
export = RankCore;
