"""
Chatbot Embed - Backend FastAPI + Supabase (siap deploy ke Vercel)

Struktur Vercel:
  api/index.py  -> serverless function, semua route /api/*
  public/       -> file statis (dashboard + widget.js), diserve CDN Vercel

Jalankan lokal:
  uvicorn api.index:app --reload --port 8000
"""

import os
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client

try:  # opsional saat lokal
    from dotenv import load_dotenv

    load_dotenv()
except Exception:  # pragma: no cover
    pass

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or SUPABASE_ANON_KEY

_client = None


def db():
    """Buat client Supabase sekali saja (lazy, aman untuk serverless)."""
    global _client
    if _client is None:
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            raise HTTPException(
                status_code=500,
                detail="SUPABASE_URL / SUPABASE_ANON_KEY belum diisi di Environment Variables",
            )
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _client


app = FastAPI(title="Chatbot Embed API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===================== MODELS =====================
class FaqIn(BaseModel):
    kategori: str
    keywords: List[str] = []
    jawaban: str


class ProfileIn(BaseModel):
    bot_name: str
    bot_color: str
    avatar_url: Optional[str] = None
    welcome_message: str
    fallback_message: str


class ChatIn(BaseModel):
    api_key: str
    message: str
    asal_url: Optional[str] = None


# ===================== HELPERS =====================
def get_profile_by_key(api_key: str) -> dict:
    if not api_key:
        raise HTTPException(status_code=400, detail="API key kosong")
    res = db().table("profiles").select("*").eq("api_key", api_key).limit(1).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="API key tidak dikenal")
    return res.data[0]


def cari_jawaban(pesan: str, faqs: List[dict]) -> Optional[str]:
    pesan_lower = pesan.lower()
    for item in faqs:
        for keyword in item.get("keywords") or []:
            if keyword and keyword.lower() in pesan_lower:
                return item["jawaban"]
    return None


# ===================== WIDGET (publik) =====================
@app.get("/api/widget/config")
def widget_config(api_key: str):
    p = get_profile_by_key(api_key)
    return {
        "bot_name": p["bot_name"],
        "bot_color": p["bot_color"],
        "avatar_url": p.get("avatar_url"),
        "welcome_message": p["welcome_message"],
    }


@app.post("/api/chat")
def chat(body: ChatIn):
    pesan = (body.message or "").strip()
    if not pesan:
        raise HTTPException(status_code=400, detail="Pesan tidak boleh kosong")

    profile = get_profile_by_key(body.api_key)
    faqs = (
        db().table("faqs").select("*").eq("profile_id", profile["id"]).execute().data or []
    )

    jawaban = cari_jawaban(pesan, faqs)
    if jawaban:
        return {"status": "success", "reply": jawaban, "matched": True}

    db().table("unanswered_logs").insert(
        {"profile_id": profile["id"], "pertanyaan": pesan, "asal_url": body.asal_url}
    ).execute()
    return {"status": "success", "reply": profile["fallback_message"], "matched": False}


# ===================== ADMIN: PROFILE =====================
@app.get("/api/profile")
def get_profile(api_key: str):
    return get_profile_by_key(api_key)


@app.put("/api/profile")
def update_profile(api_key: str, body: ProfileIn):
    profile = get_profile_by_key(api_key)
    res = db().table("profiles").update(body.model_dump()).eq("id", profile["id"]).execute()
    return res.data[0] if res.data else profile


# ===================== ADMIN: FAQ CRUD =====================
@app.get("/api/faqs")
def list_faqs(api_key: str):
    profile = get_profile_by_key(api_key)
    return (
        db().table("faqs").select("*").eq("profile_id", profile["id"]).order("id").execute().data
        or []
    )


@app.post("/api/faqs")
def create_faq(api_key: str, body: FaqIn):
    profile = get_profile_by_key(api_key)
    payload = body.model_dump()
    payload["profile_id"] = profile["id"]
    res = db().table("faqs").insert(payload).execute()
    return res.data[0]


@app.put("/api/faqs/{faq_id}")
def update_faq(faq_id: int, api_key: str, body: FaqIn):
    profile = get_profile_by_key(api_key)
    payload = body.model_dump()
    res = (
        db()
        .table("faqs")
        .update(payload)
        .eq("id", faq_id)
        .eq("profile_id", profile["id"])
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="FAQ tidak ditemukan")
    return res.data[0]


@app.delete("/api/faqs/{faq_id}")
def delete_faq(faq_id: int, api_key: str):
    profile = get_profile_by_key(api_key)
    db().table("faqs").delete().eq("id", faq_id).eq("profile_id", profile["id"]).execute()
    return {"status": "deleted"}


# ===================== ADMIN: LOGS =====================
@app.get("/api/logs")
def list_logs(api_key: str):
    profile = get_profile_by_key(api_key)
    return (
        db()
        .table("unanswered_logs")
        .select("*")
        .eq("profile_id", profile["id"])
        .order("created_at", desc=True)
        .limit(200)
        .execute()
        .data
        or []
    )


@app.delete("/api/logs/{log_id}")
def delete_log(log_id: int, api_key: str):
    profile = get_profile_by_key(api_key)
    db().table("unanswered_logs").delete().eq("id", log_id).eq(
        "profile_id", profile["id"]
    ).execute()
    return {"status": "deleted"}


@app.get("/api/health")
def health():
    return {"status": "ok", "supabase_url_set": bool(SUPABASE_URL)}
