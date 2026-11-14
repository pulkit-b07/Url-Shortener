import os
from typing import Optional

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, HttpUrl

import shortener
from database import init_db

app = FastAPI(
    title="URL Shortener API",
    description="Modern, blazing-fast URL shortener with analytics and custom aliases.",
    version="1.0.0",
)
init_db()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files setup
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
if not os.path.exists(STATIC_DIR):
    os.makedirs(STATIC_DIR, exist_ok=True)

for static_file in ["index.html", "style.css", "app.js"]:
    src_f = os.path.join(BASE_DIR, static_file)
    dst_f = os.path.join(STATIC_DIR, static_file)
    if os.path.exists(src_f) and not os.path.exists(dst_f):
        import shutil
        shutil.copy2(src_f, dst_f)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/", response_class=FileResponse, include_in_schema=False)
def home():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    base_index = os.path.join(BASE_DIR, "index.html")
    if os.path.exists(base_index):
        return FileResponse(base_index)
    return Response(content="Frontend is being initialized...", media_type="text/plain")


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)


@app.get("/api/health", tags=["System"])
def health():
    return {"status": "ok", "message": "URL Shortener API is running"}


# ===== MEMBER 1: shorten + resolve =====
class ShortenRequest(BaseModel):
    url: HttpUrl
    custom_code: Optional[str] = None


@app.post("/shorten", status_code=201)
def shorten(req: ShortenRequest, request: Request):
    """Shorten a URL. Returns the short code and the full short URL."""
    custom_code = req.custom_code.strip() if req.custom_code and req.custom_code.strip() else None
    try:
        code = shortener.create_short_url(str(req.url), custom_code)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    
    # Dynamically build base url from request
    base_url = str(request.base_url).rstrip("/")
    return {"code": code, "short_url": f"{base_url}/{code}"}


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


# ===== REDIRECT (must stay LAST so it doesn't catch /urls, /stats, /resolve, /static) =====
@app.get("/{code}", include_in_schema=False)
def redirect(code: str):
    result = shortener.get_original_url(code)
    if result is None:
        raise HTTPException(status_code=404, detail="Short code not found")
    return RedirectResponse(result["original_url"], status_code=302)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
