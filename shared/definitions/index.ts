// المصدر الوحيد لتعريفات اللعبة — يُستهلك من العميل والخادم والأدوات معاً.
import spear_wall from './units/spear_wall.json';
import shield_guard from './units/shield_guard.json';
import axe_warriors from './units/axe_warriors.json';
import archers from './units/archers.json';
import light_slingers from './units/light_slingers.json';
import flame_archers from './units/flame_archers.json';
import raid_cavalry from './units/raid_cavalry.json';
import north_wolves from './units/north_wolves.json';
import field_medic from './units/field_medic.json';
import frost_witch from './units/frost_witch.json';
import iron_ram from './units/iron_ram.json';
import catapult from './units/catapult.json';
import sera from './commanders/sera.json';
import border_fort from './arenas/border_fort.json';
import economy from './economy.json';
import ar from './locales/ar.json';
import en from './locales/en.json';

export const UNIT_DEFS: Record<string, any> = {
  spear_wall, shield_guard, axe_warriors, archers, light_slingers, flame_archers,
  raid_cavalry, north_wolves, field_medic, frost_witch, iron_ram, catapult
};
export const UNIT_IDS = Object.keys(UNIT_DEFS);
export const COMMANDERS: Record<string, any> = { sera };
export const ARENAS: Record<string, any> = { border_fort };
export const ECONOMY = economy;
export const LOCALES: Record<string, Record<string, string>> = { ar, en };
export const DEFAULT_DECK = [
  'spear_wall', 'shield_guard', 'archers', 'flame_archers', 'raid_cavalry', 'field_medic', 'catapult'
];
