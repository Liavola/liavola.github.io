// ─── Team Leaderboard (Firebase) ──────────────────────────────────────────────
//
// This module is only loaded when the user has joined a team with a team code.
// Without a code the app never contacts Firebase.
//
// Data layout (see database.rules.json for who may read/write what):
//   teamCodes/{code}                   → team label, e.g. "Team Alpha" (admin-only, set in console)
//   teams/{code}/members/{nickname}    → anonymous uid that claimed the nickname
//   teams/{code}/leaderboard/{nickname}/{YYYY-MM-DD} → { _total, CID, SINGLES, ICM }
//   teams/{code}/comments/{id}         → { name, text, ts }
//
// Privacy: sign-in is Firebase *Anonymous* Auth (a random id per browser, no
// email or name). Only nicknames and daily counts are stored, and anything
// older than RETENTION_DAYS is deleted automatically.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  get,
  push,
  update,
  remove,
  onValue,
  query,
  orderByChild,
  endAt,
  limitToLast,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBBNOP6urLAl-_7wJoa-1n0nRnKpW2SjCE",
  authDomain: "worflow-counter.firebaseapp.com",
  databaseURL:
    "https://worflow-counter-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "worflow-counter",
  storageBucket: "worflow-counter.firebasestorage.app",
  messagingSenderId: "465573472148",
  appId: "1:465573472148:web:a461431a7a7b03709cd181",
};

export const RETENTION_DAYS = 30;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

let _db = null;
let _auth = null;
let _team = null; // validated team code

function init() {
  if (!_db) {
    const app = initializeApp(FIREBASE_CONFIG);
    _db = getDatabase(app);
    _auth = getAuth(app);
  }
}

async function ensureSignedIn() {
  init();
  await _auth.authStateReady();
  if (!_auth.currentUser) await signInAnonymously(_auth);
  return _auth.currentUser.uid;
}

const teamRef = (path) => ref(_db, `teams/${_team}/${path}`);

/** Normalize a typed team code: lowercase, letters/digits/dashes only. */
export function normalizeTeamCode(code) {
  return String(code || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 40);
}

/**
 * Sanitize a nickname for use as a Firebase key.
 * Firebase keys cannot contain: . # $ [ ] /
 */
export function sanitizeNickname(name) {
  return String(name || "")
    .trim()
    .replace(/[.#$[\]/]/g, "_")
    .slice(0, 20);
}

/** Cutoff date key (YYYY-MM-DD); days before this are deleted. */
function cutoffDateKey() {
  const d = new Date(Date.now() - RETENTION_MS);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Validate a team code and connect to it.
 * @returns {Promise<string|null>} the team's label, or null if the code is unknown
 */
export async function joinTeam(code) {
  const normalized = normalizeTeamCode(code);
  if (normalized.length < 8) return null;
  await ensureSignedIn();
  const snapshot = await get(ref(_db, `teamCodes/${normalized}`));
  if (!snapshot.exists()) return null;
  _team = normalized;
  const label = snapshot.val();
  return typeof label === "string" && label ? label : "Team";
}

/**
 * Claim a nickname in the current team for this browser.
 * Matching is case-insensitive: "alice" resolves to an existing "Alice" claim
 * if this browser owns it. If `previous` is a nickname this browser owned, its
 * scores are moved to the new one and the old one is released.
 * @returns {Promise<{ok: true, name: string} | {ok: false, reason: "taken"|"invalid"|"error"}>}
 */
export async function claimNickname(name, previous) {
  const wanted = sanitizeNickname(name);
  if (!_team || !wanted) return { ok: false, reason: "invalid" };
  try {
    const uid = await ensureSignedIn();
    const membersSnap = await get(teamRef("members"));
    const members = membersSnap.exists() ? membersSnap.val() : {};

    const match = Object.keys(members).find(
      (k) => k.toLowerCase() === wanted.toLowerCase(),
    );
    if (match && members[match] !== uid) return { ok: false, reason: "taken" };

    const finalName = match || wanted;
    if (!match) await set(teamRef(`members/${finalName}`), uid);

    const prev = sanitizeNickname(previous);
    if (prev && prev !== finalName && members[prev] === uid) {
      await moveScores(prev, finalName);
      await remove(teamRef(`members/${prev}`));
    }
    return { ok: true, name: finalName };
  } catch (err) {
    console.warn("[Team] nickname claim failed:", err.message);
    return { ok: false, reason: "error" };
  }
}

async function moveScores(from, to) {
  const snap = await get(teamRef(`leaderboard/${from}`));
  if (snap.exists()) {
    const existing = await get(teamRef(`leaderboard/${to}`));
    await set(teamRef(`leaderboard/${to}`), {
      ...snap.val(),
      ...(existing.exists() ? existing.val() : {}),
    });
  }
  await remove(teamRef(`leaderboard/${from}`));
}

/**
 * Fetch all stored days for one nickname and delete any older than the
 * retention window. Returns null if nothing is stored or the fetch fails.
 */
export async function fetchUserScores(name) {
  if (!_team) return null;
  const key = sanitizeNickname(name);
  try {
    const snapshot = await get(teamRef(`leaderboard/${key}`));
    if (!snapshot.exists()) return null;
    const days = snapshot.val();
    const cutoff = cutoffDateKey();
    const stale = Object.keys(days).filter((d) => d < cutoff);
    if (stale.length) {
      const updates = {};
      stale.forEach((d) => {
        updates[d] = null;
        delete days[d];
      });
      await update(teamRef(`leaderboard/${key}`), updates);
    }
    return days;
  } catch (err) {
    console.warn("[Team] user fetch failed:", err.message);
    return null;
  }
}

/**
 * Push today's score for a nickname this browser owns.
 * @param {number|object} payload - total number (legacy) or { _total, CID, ... }
 */
export async function pushScore(name, dateKey, payload) {
  if (!_team) return false;
  try {
    await set(
      teamRef(`leaderboard/${sanitizeNickname(name)}/${dateKey}`),
      payload,
    );
    return true;
  } catch (err) {
    console.warn("[Team] sync failed:", err.message);
    return false;
  }
}

/**
 * Fetch the team leaderboard: { "Alice": { "2026-03-17": {...}, ... }, ... }.
 * Returns null on failure.
 */
export async function fetchLeaderboard() {
  if (!_team) return null;
  try {
    const snapshot = await get(teamRef("leaderboard"));
    return snapshot.exists() ? snapshot.val() : {};
  } catch (err) {
    console.warn("[Team] fetch failed:", err.message);
    return null;
  }
}

/**
 * Post a comment to the team chat as a nickname this browser owns.
 * @returns {Promise<boolean>} whether the comment was posted
 */
export async function pushComment(name, text) {
  if (!_team) return false;
  const trimmed = String(text || "").trim().slice(0, 300);
  if (!trimmed) return false;
  try {
    await push(teamRef("comments"), {
      name: sanitizeNickname(name),
      text: trimmed,
      ts: Date.now(),
    });
    return true;
  } catch (err) {
    console.warn("[Team] comment post failed:", err.message);
    return false;
  }
}

/** Delete team comments older than the retention window. */
async function pruneOldComments() {
  const cutoff = Date.now() - RETENTION_MS;
  const snap = await get(
    query(teamRef("comments"), orderByChild("ts"), endAt(cutoff)),
  );
  if (!snap.exists()) return;
  const updates = {};
  Object.keys(snap.val()).forEach((id) => (updates[id] = null));
  await update(teamRef("comments"), updates);
}

/**
 * Listen for live changes to the team chat. The callback receives the most
 * recent comments, newest first.
 * @returns {Function} unsubscribe
 */
export function subscribeComments(callback, limitCount = 50) {
  if (!_team) return () => {};
  pruneOldComments().catch((err) =>
    console.warn("[Team] comment cleanup failed:", err.message),
  );
  return onValue(
    query(teamRef("comments"), orderByChild("ts"), limitToLast(limitCount)),
    (snapshot) => {
      const data = snapshot.exists() ? snapshot.val() : {};
      callback(Object.values(data).sort((a, b) => b.ts - a.ts));
    },
    (err) => console.warn("[Team] chat listener failed:", err.message),
  );
}

/**
 * Leave the current team: deletes this nickname's scores and releases the
 * nickname. Comments are left to expire with the retention window.
 */
export async function leaveTeam(name) {
  if (!_team) return;
  const key = sanitizeNickname(name);
  try {
    if (key) {
      const owner = await get(teamRef(`members/${key}`));
      if (owner.exists() && owner.val() === _auth.currentUser?.uid) {
        await remove(teamRef(`leaderboard/${key}`));
        await remove(teamRef(`members/${key}`));
      }
    }
  } catch (err) {
    console.warn("[Team] leave cleanup failed:", err.message);
  } finally {
    _team = null;
  }
}
