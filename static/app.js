from fastapi import FastAPI, Query
from pydantic import BaseModel

class FAQItem(BaseModel):
    category: str
    keywords: str
    answer: str

# Endpoint EDIT / UPDATE FAQ
@app.put("/api/faqs/{faq_id}")
def update_faq(faq_id: int, item: FAQItem, api_key: str = Query(...)):
    res = supabase.table("faqs").update({
        "category": item.category,
        "keywords": item.keywords,
        "answer": item.answer
    }).eq("id", faq_id).execute()
    return {"status": "success", "data": res.data}

# Endpoint HAPUS FAQ
@app.delete("/api/faqs/{faq_id}")
def delete_faq(faq_id: int, api_key: str = Query(...)):
    res = supabase.table("faqs").delete().eq("id", faq_id).execute()
    return {"status": "success"}
