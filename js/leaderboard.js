// ─── Firebase Leaderboard ─────────────────────────────────────────────────────
//
// Setup (one-time):
//   1. Go to https://console.firebase.google.com/ → create a project
//   2. Build → Realtime Database → Create database → Start in test mode
//   3. Project Settings → Your apps → Add web app → copy the config below
//   4. In the Realtime Database "Rules" tab, paste:
//      { "rules": { "leaderboard": { ".read": true, "$user": { ".write": true } } } }
//
// Then fill in your config values below and share the file with your team.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  get,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBBNOP6urLAl-_7wJoa-1n0nRnKpW2SjCE",
  authDomain: "worflow-counter.firebaseapp.com",
  databaseURL: "https://worflow-counter-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "worflow-counter",
  storageBucket: "worflow-counter.firebasestorage.app",
  messagingSenderId: "465573472148",
  appId: "1:465573472148:web:a461431a7a7b03709cd181",
};

let _db = null;

function isConfigured() {
  return FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY";
}

function getDb() {
  if (!_db) {
    const app = initializeApp(FIREBASE_CONFIG);
    _db = getDatabase(app);
  }
  return _db;
}

// Sanitize a display name for use as a Firebase key
// Firebase keys cannot contain: . # $ [ ] /
function sanitizeKey(name) {
  return name
    .trim()
    .replace(/[.#$[\]/]/g, "_")
    .slice(0, 40);
}

/**
 * Push today's score for a user.
 * @param {string} name - Display name
 * @param {string} dateKey - YYYY-MM-DD
 * @param {number} total - Score for that day
 */
export async function pushScore(name, dateKey, total) {
  if (!isConfigured()) return;
  try {
    const db = getDb();
    const key = sanitizeKey(name);
    await set(ref(db, `leaderboard/${key}/${dateKey}`), total);
  } catch (err) {
    console.warn("[Leaderboard] sync failed:", err.message);
  }
}

/**
 * Fetch the full leaderboard data.
 * Returns an object like: { "Alice": { "2026-03-17": 42, ... }, ... }
 * Returns null if Firebase is not configured or fetch fails.
 */
export async function fetchLeaderboard() {
  if (!isConfigured()) return null;
  try {
    const db = getDb();
    const snapshot = await get(ref(db, "leaderboard"));
    return snapshot.exists() ? snapshot.val() : {};
  } catch (err) {
    console.warn("[Leaderboard] fetch failed:", err.message);
    return null;
  }
}

export { isConfigured };
