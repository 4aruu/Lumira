"""
analytics.py — Lightweight SQLite-backed analytics for Lumira.
Tracks visitor sessions, messages, and provides aggregate stats.
"""

import sqlite3
import os
import threading
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "analytics.db")

_local = threading.local()


def _get_conn() -> sqlite3.Connection:
    """Get a thread-local SQLite connection."""
    if not hasattr(_local, "conn") or _local.conn is None:
        _local.conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        _local.conn.row_factory = sqlite3.Row
        _local.conn.execute("PRAGMA journal_mode=WAL")
    return _local.conn


def init_db():
    """Create tables if they don't exist."""
    conn = _get_conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            project TEXT NOT NULL,
            started_at TEXT NOT NULL,
            last_active TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            project TEXT NOT NULL,
            role TEXT NOT NULL,
            timestamp TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project);
        CREATE INDEX IF NOT EXISTS idx_messages_project ON messages(project);
        CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
        CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
    """)
    conn.commit()


# ---------- SESSION TRACKING ----------

def start_session(session_id: str, project: str):
    """Record a new visitor session."""
    now = datetime.utcnow().isoformat()
    conn = _get_conn()
    conn.execute(
        "INSERT OR IGNORE INTO sessions (id, project, started_at, last_active) VALUES (?, ?, ?, ?)",
        (session_id, project, now, now)
    )
    conn.commit()


def heartbeat_session(session_id: str):
    """Update the last_active timestamp for a session."""
    now = datetime.utcnow().isoformat()
    conn = _get_conn()
    conn.execute(
        "UPDATE sessions SET last_active = ? WHERE id = ?",
        (now, session_id)
    )
    conn.commit()


# ---------- MESSAGE LOGGING ----------

def log_message(session_id: str | None, project: str, role: str):
    """Record a single message event (user or ai)."""
    now = datetime.utcnow().isoformat()
    conn = _get_conn()
    conn.execute(
        "INSERT INTO messages (session_id, project, role, timestamp) VALUES (?, ?, ?, ?)",
        (session_id, project, role, now)
    )
    conn.commit()


# ---------- ANALYTICS QUERIES ----------

def get_project_analytics(project: str) -> dict:
    """Get analytics for a single project."""
    conn = _get_conn()

    # Visitor count
    row = conn.execute(
        "SELECT COUNT(*) as cnt FROM sessions WHERE project = ?", (project,)
    ).fetchone()
    total_visitors = row["cnt"] if row else 0

    # Message counts
    row = conn.execute(
        "SELECT COUNT(*) as cnt FROM messages WHERE project = ?", (project,)
    ).fetchone()
    total_messages = row["cnt"] if row else 0

    # Avg messages per session
    avg_messages = round(total_messages / total_visitors, 1) if total_visitors > 0 else 0

    # Avg session duration (seconds)
    row = conn.execute("""
        SELECT AVG(
            (julianday(last_active) - julianday(started_at)) * 86400
        ) as avg_dur
        FROM sessions
        WHERE project = ?
          AND last_active != started_at
    """, (project,)).fetchone()
    avg_duration = round(row["avg_dur"]) if row and row["avg_dur"] else 0

    return {
        "project": project,
        "total_visitors": total_visitors,
        "total_messages": total_messages,
        "avg_messages_per_session": avg_messages,
        "avg_session_duration_sec": avg_duration,
    }


def get_all_analytics() -> dict:
    """Get aggregated analytics across all projects + per-project breakdown."""
    conn = _get_conn()

    # Overall stats
    total_visitors = conn.execute("SELECT COUNT(*) as cnt FROM sessions").fetchone()["cnt"]
    total_messages = conn.execute("SELECT COUNT(*) as cnt FROM messages").fetchone()["cnt"]

    avg_messages = round(total_messages / total_visitors, 1) if total_visitors > 0 else 0

    row = conn.execute("""
        SELECT AVG(
            (julianday(last_active) - julianday(started_at)) * 86400
        ) as avg_dur
        FROM sessions
        WHERE last_active != started_at
    """).fetchone()
    avg_duration = round(row["avg_dur"]) if row and row["avg_dur"] else 0

    # Peak hours (24 slots)
    peak_hours = [0] * 24
    rows = conn.execute("""
        SELECT CAST(strftime('%H', timestamp) AS INTEGER) as hour, COUNT(*) as cnt
        FROM messages
        GROUP BY hour
        ORDER BY hour
    """).fetchall()
    for r in rows:
        peak_hours[r["hour"]] = r["cnt"]

    # Per-project breakdown
    projects = {}
    proj_rows = conn.execute("""
        SELECT project, COUNT(*) as visitors FROM sessions GROUP BY project
    """).fetchall()
    for pr in proj_rows:
        p = pr["project"]
        msg_row = conn.execute(
            "SELECT COUNT(*) as cnt FROM messages WHERE project = ?", (p,)
        ).fetchone()
        projects[p] = {
            "visitors": pr["visitors"],
            "messages": msg_row["cnt"] if msg_row else 0,
        }

    return {
        "total_visitors": total_visitors,
        "total_messages": total_messages,
        "avg_messages_per_session": avg_messages,
        "avg_session_duration_sec": avg_duration,
        "peak_hours": peak_hours,
        "projects": projects,
    }


# Initialize DB on import
init_db()
