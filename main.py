from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, HttpUrl

import shortener
from database import init_db

app = FastAPI(title="URL Shortener API")
init_db()


@app.get("/")
def home():
    return {"message": "URL Shortener API is running. Open /docs to try it."}


# ===== MEMBER 1: shorten + resolve =====
class ShortenRequest(BaseModel):
    url: HttpUrl
    custom_code: Optional[str] = None


@app.post("/shorten", status_code=201)
def shorten(req: ShortenRequest):
    """Shorten a URL. Returns the short code and the full short URL."""
    try:
        code = shortener.create_short_url(str(req.url), req.custom_code)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return {"code": code, "short_url": f"http://127.0.0.1:8000/{code}"}


@app.get("/resolve/{code}")
def resolve(code: str):
    """Returns the original URL as JSON and adds 1 to the click count (works in Swagger)."""
    result = shortener.get_original_url(code)
    if result is None:
        raise HTTPException(status_code=404, detail="Short code not found")
    return result
@app.get("/top")
def top(limit: int = Query(5, ge=1, le=50)):
    """The most-clicked links (default top 5)."""
    return shortener.get_top_urls(limit)

# ===== MEMBER 2: list + stats + delete =====
@app.get("/urls")
def all_urls(search: Optional[str] = None):
    """List all links. Add ?search=word to filter by short code or original URL."""
    return shortener.list_urls(search)

@app.get("/stats/{code}")
def stats(code: str):
    """Get statistics for a short link."""
    data = shortener.get_stats(code)
    if data is None:
        raise HTTPException(status_code=404, detail="Short code not found")
    return data


@app.delete("/urls/{code}")
def remove(code: str):
    """Delete a short link by its code."""
    if not shortener.delete_url(code):
        raise HTTPException(status_code=404, detail="Short code not found")
    return {"message": f"Deleted {code}"}




class UpdateRequest(BaseModel):
    url: HttpUrl


@app.put("/urls/{code}")
def edit(code: str, req: UpdateRequest):
    """Change where an existing short link points. The short code stays the same."""
    if not shortener.update_url(code, str(req.url)):
        raise HTTPException(status_code=404, detail="Short code not found")
    return {"message": f"Updated {code}", "code": code, "original_url": str(req.url)}

# ===== REDIRECT (must stay LAST so it doesn't catch /urls, /stats, /resolve) =====
@app.get("/{code}", include_in_schema=False)
def redirect(code: str):
    result = shortener.get_original_url(code)
    if result is None:
        raise HTTPException(status_code=404, detail="Short code not found")
    return RedirectResponse(result["original_url"], status_code=302)


