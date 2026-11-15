import random
import sqlite3
import string

from database import get_connection

CODE_LENGTH = 6
ALPHABET = string.ascii_letters + string.digits


# ===== MEMBER 1: shorten + resolve =====
def generate_code():
    return "".join(random.choices(ALPHABET, k=CODE_LENGTH))


def create_short_url(original_url, custom_code=None):
    """Save a URL and return its short code. Raises ValueError if the code is taken."""
    code = custom_code or generate_code()
    try:
        with get_connection() as conn:
            conn.execute(
                "INSERT INTO urls (code, original_url) VALUES (?, ?)",
                (code, original_url),
            )
    except sqlite3.IntegrityError:
        raise ValueError(f"Code '{code}' is already in use")
    return code


def get_original_url(code):
    """Add 1 to the click count and return the original URL and new click count."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT original_url, clicks FROM urls WHERE code = ?", (code,)
        ).fetchone()
        if row is None:
            return None
        conn.execute("UPDATE urls SET clicks = clicks + 1 WHERE code = ?", (code,))
        return {"original_url": row["original_url"], "clicks": row["clicks"] + 1}


# ===== MEMBER 2: list + stats + delete =====
def list_urls(search=None):
    """All links, newest first. If search is given, only links whose code or URL contains it."""
    query = "SELECT code, original_url, clicks, created_at FROM urls"
    params = ()
    if search:
        query += " WHERE code LIKE ? OR original_url LIKE ?"
        params = (f"%{search}%", f"%{search}%")
    query += " ORDER BY id DESC"
    with get_connection() as conn:
        rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]

def get_stats(code):
    with get_connection() as conn:
        row = conn.execute(
            "SELECT code, original_url, clicks, created_at FROM urls WHERE code = ?",
            (code,),
        ).fetchone()
    return dict(row) if row else None


def delete_url(code):
    with get_connection() as conn:
        cur = conn.execute("DELETE FROM urls WHERE code = ?", (code,))
        return cur.rowcount > 0
    


def update_url(code, new_url):
    """Point an existing short code at a new URL. Returns False if the code doesn't exist."""
    with get_connection() as conn:
        cur = conn.execute(
            "UPDATE urls SET original_url = ? WHERE code = ?", (new_url, code)
        )
        return cur.rowcount > 0
    
def get_top_urls(limit=5):
    """The most-clicked links, highest first."""
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT code, original_url, clicks FROM urls ORDER BY clicks DESC, id DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]