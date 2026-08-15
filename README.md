# Chatbot Embed — FastAPI + Supabase + HTML/JS murni

Struktur minimalis:

```
chatbot/
  main.py            # API FastAPI + serve file statis
  requirements.txt
  schema.sql         # jalankan di Supabase SQL Editor
  .env.example
  static/
    widget.js        # widget embed (statis, tanpa build)
    index.html       # dashboard: kelola FAQ
    logs.html        # log pertanyaan tak terjawab
    settings.html    # tampilan widget
    embed.html       # kode embed
    app.js           # helper JS bersama
```

## 1. Siapkan database
Buka Supabase > SQL Editor > tempel isi `schema.sql` > Run.
Seed sudah membuat 1 profil dengan `api_key = demo123456`.

## 2. Jalankan lokal
```bash
cd chatbot
cp .env.example .env      # isi SUPABASE_SERVICE_KEY bila ada
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Dashboard: http://localhost:8000/ — masukkan API key `demo123456`.

## 3. Deploy
- **Railway / Render**: start command `uvicorn main:app --host 0.0.0.0 --port $PORT`,
  root directory `chatbot`, tambahkan env `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`.
- CORS sudah `*`, jadi widget bisa dipasang di domain mana pun.

## 4. Pasang widget di website luar
```html
<script src="https://DOMAIN-KAMU/widget.js" data-api-key="demo123456"></script>
```

> `SUPABASE_SERVICE_KEY` hanya untuk backend. Jangan pernah menaruhnya di file statis.
