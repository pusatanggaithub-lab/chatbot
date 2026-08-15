"""
Chatbot Embed - Backend FastAPI + Supabase
"""

import os
from typing import List, Optional, Union

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://lmsgunuqsigdpnagkmjq.supabase.co")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or SUPABASE_ANON_KEY

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

BASE_DIR = os.path.dirname(__file__)

app = FastAPI(title="Chatbot Embed API")

# CORS terbuka agar widget bisa dipasang di website mana pun
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===================== MODELS =====================
class FaqIn(BaseModel):
    category: Optional[str] = Field(None, alias="kategori")
    keywords: Union[List[str], str] = []
    answer: Optional[str] = Field(None, alias="jawaban")

    class Config:
        populate_by_name = True


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
    res = supabase.table("profiles").select("*").eq("api_key", api_key).limit(1).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="API key tidak dikenal")
    return res.data[0]


def format_keywords(keywords: Union[List[str], str]) -> List[str]:
    if isinstance(keywords, str):
        return [k.strip() for k in keywords.split(",") if k.strip()]
    return keywords


def cari_jawaban(pesan: str, faqs: List[dict]) -> Optional[str]:
    pesan_lower = pesan.lower()
    for item in faqs:
        kw_list = item.get("keywords") or []
        if isinstance(kw_list, str):
            kw_list = [k.strip() for k in kw_list.split(",") if k.strip()]
        for keyword in kw_list:
            if keyword and keyword.lower() in pesan_lower:
                return item.get("answer") or item.get("jawaban")
    return None


# ===================== WIDGET (publik) =====================
@app.get("/api/widget/config")
def widget_config(api_key: str = Query(...)):
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
        supabase.table("faqs").select("*").eq("profile_id", profile["id"]).execute().data
        or []
    )

    jawaban = cari_jawaban(pesan, faqs)
    if jawaban:
        return {"status": "success", "reply": jawaban, "matched": True}

    supabase.table("unanswered_logs").insert(
        {"profile_id": profile["id"], "pertanyaan": pesan, "asal_url": body.asal_url}
    ).execute()
    return {"status": "success", "reply": profile["fallback_message"], "matched": False}


# ===================== ADMIN: PROFILE =====================
@app.get("/api/profile")
def get_profile(api_key: str = Query(...)):
    return get_profile_by_key(api_key)


@app.put("/api/profile")
def update_profile(body: ProfileIn, api_key: str = Query(...)):
    profile = get_profile_by_key(api_key)
    res = (
        supabase.table("profiles")
        .update(body.model_dump())
        .eq("id", profile["id"])
        .execute()
    )
    return res.data[0] if res.data else profile


# ===================== ADMIN: FAQ CRUD =====================
@app.get("/api/faqs")
def list_faqs(api_key: str = Query(...)):
    profile = get_profile_by_key(api_key)
    return (
        supabase.table("faqs")
        .select("*")
        .eq("profile_id", profile["id"])
        .order("id")
        .execute()
        .data
        or []
    )


@app.post("/api/faqs")
def create_faq(body: FaqIn, api_key: str = Query(...)):
    profile = get_profile_by_key(api_key)
    kw = format_keywords(body.keywords)
    cat = body.category or ""
    ans = body.answer or ""

    payload = {
        "profile_id": profile["id"],
        "category": cat,
        "kategori": cat,
        "keywords": kw,
        "answer": ans,
        "jawaban": ans,
    }

    res = supabase.table("faqs").insert(payload).execute()
    return res.data[0] if res.data else {"status": "success"}


@app.put("/api/faqs/{faq_id}")
def update_faq(faq_id: int, body: FaqIn, api_key: str = Query(...)):
    profile = get_profile_by_key(api_key)
    kw = format_keywords(body.keywords)
    cat = body.category or ""
    ans = body.answer or ""

    payload = {
        "category": cat,
        "kategori": cat,
        "keywords": kw,
        "answer": ans,
        "jawaban": ans,
    }

    res = (
        supabase.table("faqs")
        .update(payload)
        .eq("id", faq_id)
        .eq("profile_id", profile["id"])
        .execute()
    )
    return res.data[0] if res.data else {"status": "success"}


@app.delete("/api/faqs/{faq_id}")
def delete_faq(faq_id: int, api_key: str = Query(...)):
    profile = get_profile_by_key(api_key)
    supabase.table("faqs").delete().eq("id", faq_id).eq(
        "profile_id", profile["id"]
    ).execute()
    return {"status": "deleted"}


# ===================== ADMIN: LOGS =====================
@app.get("/api/logs")
def list_logs(api_key: str = Query(...)):
    profile = get_profile_by_key(api_key)
    return (
        supabase.table("unanswered_logs")
        .select("*")
        .eq("profile_id", profile["id"])
        .order("created_at", desc=True)
        .limit(200)
        .execute()
        .data
        or []
    )


@app.delete("/api/logs/{log_id}")
def delete_log(log_id: int, api_key: str = Query(...)):
    profile = get_profile_by_key(api_key)
    supabase.table("unanswered_logs").delete().eq("id", log_id).eq(
        "profile_id", profile["id"]
    ).execute()
    return {"status": "deleted"}


# ===================== STATIC =====================
@app.get("/widget.js")
def serve_widget():
    widget_path = os.path.join(BASE_DIR, "static", "widget.js")
    if not os.path.exists(widget_path):
        widget_path = os.path.join(BASE_DIR, "widget.js")
    return FileResponse(widget_path, media_type="application/javascript")


@app.get("/health")
def health():
    return {"status": "ok"}


# ===================== STATIC & HEALTH =====================
@app.get("/widget.js")
def serve_widget():
    widget_path = os.path.join(BASE_DIR, "static", "widget.js")
    if not os.path.exists(widget_path):
        widget_path = os.path.join(BASE_DIR, "widget.js")
    return FileResponse(widget_path, media_type="application/javascript")


@app.get("/health")
def health():
    return {"status": "ok"}
