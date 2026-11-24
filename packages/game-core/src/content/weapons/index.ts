/*
 * Every weapon type (request #77): one folder per weapon with its numbers
 * (weapon.ts) and its pictures (_weapon_icon_<type>.png, _weapon_hand_<type>.png).
 * To add a weapon: copy a folder, rename it and its files, edit weapon.ts,
 * add one line below, and add its name to WeaponType in define.ts.
 */
import sword from './sword/weapon.js';
import axe from './axe/weapon.js';
import dagger from './dagger/weapon.js';
import spear from './spear/weapon.js';
import mace from './mace/weapon.js';
import bow from './bow/weapon.js';
import staff from './staff/weapon.js';
import wand from './wand/weapon.js';
import tome from './tome/weapon.js';
import greatsword from './greatsword/weapon.js';
import greataxe from './greataxe/weapon.js';
import handaxe from './handaxe/weapon.js';
import hammer from './hammer/weapon.js';
import greathammer from './greathammer/weapon.js';
import morningstar from './morningstar/weapon.js';
import lance from './lance/weapon.js';
import crossbow from './crossbow/weapon.js';
import scepter from './scepter/weapon.js';
import chakram from './chakram/weapon.js';
import scythe from './scythe/weapon.js';
import sling from './sling/weapon.js';

export const WEAPON_DEFS = {
  sword,
  axe,
  dagger,
  spear,
  mace,
  bow,
  staff,
  wand,
  tome,
  greatsword,
  greataxe,
  handaxe,
  hammer,
  greathammer,
  morningstar,
  lance,
  crossbow,
  scepter,
  chakram,
  scythe,
  sling,
};
