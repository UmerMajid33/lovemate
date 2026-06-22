// utils/storage.js
// ─── Simple AsyncStorage helpers for LoveMate ─────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  USER:    'lovemate:user',
  HOME:    'lovemate:home',     // legacy single-home key (migrated on first read)
  HOMES:   'lovemate:homes',    // current multi-home list
  CLUBS:   'lovemate:clubs',    // friend clubs — entirely separate from homes
  SESSION: 'lovemate:loggedin', // session flag (set on login, cleared on logout)
};

export const MAX_HOMES = 2; // a user may belong to at most two homes
export const MAX_CLUBS = 3;  // a user may belong to at most three clubs

// ── User ──────────────────────────────────────────────────────────────────────
/** Save registered user: { name, email, password, gender } */
export async function saveUser(user) {
  await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
}

/** Get stored user or null */
export async function getUser() {
  const raw = await AsyncStorage.getItem(KEYS.USER);
  return raw ? JSON.parse(raw) : null;
}

/** Clear user (full account removal) */
export async function clearUser() {
  await AsyncStorage.removeItem(KEYS.USER);
}

// ── Session ─────────────────────────────────────────────────────────────────
/** Mark the session active (true) or end it (false). Keeps the account intact. */
export async function setLoggedIn(value) {
  if (value) await AsyncStorage.setItem(KEYS.SESSION, '1');
  else       await AsyncStorage.removeItem(KEYS.SESSION);
}

/** True if a session is currently active. */
export async function isLoggedIn() {
  return (await AsyncStorage.getItem(KEYS.SESSION)) === '1';
}

// ── Homes (multi, scoped per user) ──────────────────────────────────────────
// Homes are namespaced by the signed-in user's email so one account's homes can
// never appear for a different account on the same device/browser.
async function homesKey() {
  const u = await getUser();
  const email = (u && u.email ? u.email : 'anon').toLowerCase();
  return `${KEYS.HOMES}:${email}`;
}

// Remove the pre-scoping global keys once, so old shared data can't leak.
async function purgeGlobalHomeKeys() {
  await AsyncStorage.removeItem(KEYS.HOMES);
  await AsyncStorage.removeItem(KEYS.HOME);
}

/** Get the current user's homes as an array (newest first). */
export async function getHomes() {
  const key = await homesKey();
  const raw = await AsyncStorage.getItem(key);
  // Drop any legacy global keys so they never bleed into another account.
  await purgeGlobalHomeKeys();
  if (!raw) return [];
  let list;
  try { list = JSON.parse(raw) || []; } catch (_) { return []; }
  // Collapse any case-variant duplicates that older builds may have spawned
  // (uppercase local + lowercase server sync of the same home).
  const seen = new Set();
  const deduped = [];
  for (const h of list) {
    const lc = (h.linkCode || '').toLowerCase();
    if (seen.has(lc)) continue;
    seen.add(lc);
    deduped.push(h);
  }
  if (deduped.length !== list.length) {
    try { await AsyncStorage.setItem(key, JSON.stringify(deduped)); } catch (_) {}
  }
  return deduped;
}

/**
 * Save (upsert) a home into the current user's list, newest first.
 * Updates in place if a home with the same linkCode already exists.
 */
export async function saveHome(home) {
  const key  = await homesKey();
  const raw  = await AsyncStorage.getItem(key);
  let list   = [];
  try { list = raw ? JSON.parse(raw) || [] : []; } catch (_) {}
  // Match case-insensitively so a server-synced lowercase code never spawns a
  // duplicate of the same home stored locally in uppercase.
  const lc   = (home.linkCode || '').toLowerCase();
  const idx  = list.findIndex(h => (h.linkCode || '').toLowerCase() === lc);
  let next;
  // Keep the existing local linkCode casing on update — don't let a lowercase
  // sync overwrite it (which would re-trigger the mismatch next time).
  if (idx >= 0) { next = [...list]; next[idx] = { ...list[idx], ...home, linkCode: list[idx].linkCode }; }
  else          { next = [home, ...list]; }
  await AsyncStorage.setItem(key, JSON.stringify(next));
  return next;
}

/** Remove a single home by its bond code. Returns the remaining list. */
export async function removeHome(linkCode) {
  const key  = await homesKey();
  const raw  = await AsyncStorage.getItem(key);
  let list   = [];
  try { list = raw ? JSON.parse(raw) || [] : []; } catch (_) {}
  const next = list.filter(h => h.linkCode !== linkCode);
  await AsyncStorage.setItem(key, JSON.stringify(next));
  return next;
}

/** Get the current user's most recent home or null (used for auto-login). */
export async function getHome() {
  const list = await getHomes();
  return list[0] || null;
}

// ── Active home (which home the user is currently inside) ─────────────────────
async function activeHomeKey() {
  const u = await getUser();
  const email = (u && u.email ? u.email : 'anon').toLowerCase();
  return `lovemate:activehome:${email}`;
}

/** Remember which home the user opened, so reloads return there (not always #1). */
export async function setActiveHomeCode(code) {
  try { await AsyncStorage.setItem(await activeHomeKey(), (code || '').toString()); } catch (_) {}
}

/** The home the user was last inside (falls back to the most recent). */
export async function getActiveHome() {
  const list = await getHomes();
  if (!list.length) return null;
  let code = '';
  try { code = (await AsyncStorage.getItem(await activeHomeKey())) || ''; } catch (_) {}
  code = code.toLowerCase();
  return list.find(h => (h.linkCode || '').toLowerCase() === code) || list[0];
}

/** Clear the current user's homes. */
export async function clearHome() {
  const key = await homesKey();
  await AsyncStorage.removeItem(key);
}

// ── Clubs (multi, scoped per user) ────────────────────────────────────────────
// Stored under their own namespaced key so club data NEVER collides with homes.
async function clubsKey() {
  const u = await getUser();
  const email = (u && u.email ? u.email : 'anon').toLowerCase();
  return `${KEYS.CLUBS}:${email}`;
}

/** Get the current user's clubs (newest first). */
export async function getClubs() {
  const key = await clubsKey();
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];
  try { return JSON.parse(raw) || []; } catch (_) { return []; }
}

/** Save (upsert) a club into the current user's list, matched by clubCode. */
export async function saveClub(clubData) {
  const key = await clubsKey();
  const raw = await AsyncStorage.getItem(key);
  let list = [];
  try { list = raw ? JSON.parse(raw) || [] : []; } catch (_) {}
  const lc  = (clubData.clubCode || '').toLowerCase();
  const idx = list.findIndex(c => (c.clubCode || '').toLowerCase() === lc);
  let next;
  if (idx >= 0) { next = [...list]; next[idx] = { ...list[idx], ...clubData }; }
  else          { next = [clubData, ...list]; }
  await AsyncStorage.setItem(key, JSON.stringify(next));
  return next;
}

/** Remove a single club by its code. Returns the remaining list. */
export async function removeClub(clubCode) {
  const key = await clubsKey();
  const raw = await AsyncStorage.getItem(key);
  let list = [];
  try { list = raw ? JSON.parse(raw) || [] : []; } catch (_) {}
  const lc = (clubCode || '').toLowerCase();
  const next = list.filter(c => (c.clubCode || '').toLowerCase() !== lc);
  await AsyncStorage.setItem(key, JSON.stringify(next));
  return next;
}
