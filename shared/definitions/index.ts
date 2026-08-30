// المصدر الوحيد لتعريفات اللعبة — يُستهلك من العميل والخادم والأدوات معاً.
// الوحدات العشر من توجيه المالك (docs/OWNER_DIRECTIVE.md §11).
import steel_guard from './units/steel_guard.json';
import vale_archers from './units/vale_archers.json';
import spear_bearers from './units/spear_bearers.json';
import hollow_knights from './units/hollow_knights.json';
import flame_casters from './units/flame_casters.json';
import bat_riders from './units/bat_riders.json';
import siege_engineers from './units/siege_engineers.json';
import banner_guards from './units/banner_guards.json';
import running_shadows from './units/running_shadows.json';
import stone_golem from './units/stone_golem.json';
import sera from './commanders/sera.json';
import border_fort from './arenas/border_fort.json';
import economy from './economy.json';
import buildings from './buildings.json';
import missions from './missions.json';
import ar from './locales/ar.json';
import en from './locales/en.json';

export const UNIT_DEFS: Record<string, any> = {
  steel_guard, vale_archers, spear_bearers, hollow_knights, flame_casters, bat_riders, siege_engineers, banner_guards, running_shadows, stone_golem
};
export const UNIT_IDS = Object.keys(UNIT_DEFS);
export const COMMANDERS: Record<string, any> = { sera };
export const ARENAS: Record<string, any> = { border_fort };
export const ECONOMY = economy;
export const BUILDINGS: Record<string, any> = (buildings as any).buildings;
export const BUILDINGS_META: any = (buildings as any).meta;
export const MISSIONS: any[] = missions as any[];
export const LOCALES: Record<string, Record<string, string>> = { ar, en };
// تشكيلة الدخول: 8 وحدات (يد 4 + دورة) — البند 8 من التوجيه
export const DEFAULT_DECK = [
  'spear_bearers', 'vale_archers', 'steel_guard', 'hollow_knights',
  'flame_casters', 'banner_guards', 'siege_engineers', 'stone_golem'
];
