"""Slavic Meter — Flask backend.

Endpoints
---------
GET  /                  → the slider UI
POST /api/log           → {"value": float 0..100} → append to SQLite, returns {ok, id, city}
GET  /api/entries       → JSON list of entries (admin-key protected)
GET  /admin?key=…       → admin dashboard: table + chart of all entries
GET  /health            → {ok: true, count: N}

Env
---
DB_PATH              default ./data/slavic.db (locally) or /var/data/slavic.db (Render)
ADMIN_KEY            required to view /admin and /api/entries
"""
from __future__ import annotations

import json
import os
import sqlite3
import time
from pathlib import Path

from flask import Flask, abort, jsonify, render_template, request

# Waypoint table mirrored on the server so we can compute city + emoji at log time.
WAYPOINTS = [
    (0,   "Cattolica",  "🇮🇹 Italia",         "🌞"),
    (8,   "Rimini",     "🇮🇹 Italia",         "🍦"),
    (18,  "Trieste",    "🇮🇹 Italia (mixed)", "☕"),
    (28,  "Koper",      "🇸🇮 Slovenija",     "🙂"),
    (38,  "Pula",       "🇭🇷 Hrvatska",      "😐"),
    (48,  "Zadar",      "🇭🇷 Hrvatska",      "😒"),
    (58,  "Split",      "🇭🇷 Hrvatska",      "😤"),
    (68,  "Dubrovnik",  "🇭🇷 Hrvatska",      "🙄"),
    (78,  "Kotor",      "🇲🇪 Crna Gora",     "😠"),
    (88,  "Budva",      "🇲🇪 Crna Gora",     "🤬"),
    (100, "Montenegro", "🇲🇪 Crna Gora",     "🐍"),
]


def nearest(value: float) -> tuple[int, str, str, str]:
    best = WAYPOINTS[0]
    bd = float("inf")
    for wp in WAYPOINTS:
        d = abs(wp[0] - value)
        if d < bd:
            bd, best = d, wp
    return best


DEFAULT_DB = str(Path(__file__).parent / "data" / "slavic.db")
DB_PATH = Path(os.environ.get("DB_PATH", DEFAULT_DB))
ADMIN_KEY = os.environ.get("ADMIN_KEY", "")

app = Flask(__name__, static_folder="static", template_folder="templates")


def db() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    c = sqlite3.connect(str(DB_PATH), timeout=10, check_same_thread=False)
    c.execute("PRAGMA journal_mode=WAL")
    c.execute("""CREATE TABLE IF NOT EXISTS entry(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts INTEGER NOT NULL,
        value REAL NOT NULL,
        city TEXT NOT NULL,
        country TEXT NOT NULL,
        emoji TEXT NOT NULL,
        note TEXT,
        ip TEXT,
        ua TEXT)""")
    c.execute("CREATE INDEX IF NOT EXISTS idx_entry_ts ON entry(ts)")
    return c


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/log", methods=["POST"])
def api_log():
    body = request.get_json(silent=True) or {}
    try:
        value = float(body.get("value"))
    except (TypeError, ValueError):
        return jsonify({"error": "value must be a number 0..100"}), 400
    if not (0 <= value <= 100):
        return jsonify({"error": "value out of range"}), 400
    note = (body.get("note") or "").strip()[:280]
    _, city, country, emoji = nearest(value)
    c = db()
    try:
        cur = c.execute(
            "INSERT INTO entry(ts, value, city, country, emoji, note, ip, ua) "
            "VALUES(?,?,?,?,?,?,?,?)",
            (int(time.time()), value, city, country, emoji, note,
             request.headers.get("X-Forwarded-For",
                                 request.remote_addr or "")[:64],
             (request.headers.get("User-Agent") or "")[:200]))
        c.commit()
        eid = cur.lastrowid
    finally:
        c.close()
    return jsonify({"ok": True, "id": eid, "city": city, "emoji": emoji,
                    "country": country, "value": round(value, 1)})


@app.route("/api/entries")
def api_entries():
    if not ADMIN_KEY or request.args.get("key") != ADMIN_KEY:
        abort(403)
    limit = min(int(request.args.get("limit", 500)), 5000)
    c = db(); c.row_factory = sqlite3.Row
    rows = [dict(r) for r in c.execute(
        "SELECT id, ts, value, city, country, emoji, note "
        "FROM entry ORDER BY ts DESC LIMIT ?", (limit,))]
    c.close()
    return jsonify(rows)


@app.route("/admin")
def admin():
    if not ADMIN_KEY or request.args.get("key") != ADMIN_KEY:
        abort(403)
    return render_template("admin.html", admin_key=ADMIN_KEY)


@app.route("/health")
def health():
    c = db()
    n = c.execute("SELECT COUNT(*) FROM entry").fetchone()[0]
    c.close()
    return jsonify({"ok": True, "count": n})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "8091")),
            debug=True)
