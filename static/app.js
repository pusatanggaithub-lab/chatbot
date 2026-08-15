// Konfigurasi API Base URL (sesuaikan dengan domain Vercel)
const API_BASE = window.location.origin;

// Ambil API Key dari localStorage atau input
function getApiKey() {
    return localStorage.getItem("chatbot_api_key") || "";
}

function saveApiKey(key) {
    localStorage.setItem("chatbot_api_key", key);
}

// 1. LOAD PROFILE
async function loadProfile() {
    const apiKey = getApiKey();
    if (!apiKey) return;

    try {
        const res = await fetch(`${API_BASE}/api/profile?api_key=${apiKey}`);
        if (!res.ok) throw new Error("Gagal memuat profil");
        const data = await res.json();
        
        // Populate form jika ada di halaman settings
        if (document.getElementById("bot_name")) document.getElementById("bot_name").value = data.bot_name || "";
        if (document.getElementById("bot_color")) document.getElementById("bot_color").value = data.bot_color || "#3B82F6";
        if (document.getElementById("avatar_url")) document.getElementById("avatar_url").value = data.avatar_url || "";
        if (document.getElementById("welcome_message")) document.getElementById("welcome_message").value = data.welcome_message || "";
        if (document.getElementById("fallback_message")) document.getElementById("fallback_message").value = data.fallback_message || "";
    } catch (err) {
        console.error(err);
    }
}

// 2. LOAD & RENDER FAQS
async function loadFaqs() {
    const apiKey = getApiKey();
    if (!apiKey) return;

    try {
        const res = await fetch(`${API_BASE}/api/faqs?api_key=${apiKey}`);
        const faqs = await res.json();
        
        const container = document.getElementById("faq-list");
        if (!container) return;
        
        container.innerHTML = "";
        faqs.forEach(faq => {
            const keywordsStr = Array.isArray(faq.keywords) ? faq.keywords.join(", ") : (faq.keywords || "");
            const categoryStr = faq.category || faq.kategori || "-";
            const answerStr = faq.answer || faq.jawaban || "-";

            const row = document.createElement("tr");
            row.innerHTML = `
                <td class="px-4 py-2 border">${categoryStr}</td>
                <td class="px-4 py-2 border">${keywordsStr}</td>
                <td class="px-4 py-2 border">${answerStr}</td>
                <td class="px-4 py-2 border text-center">
                    <button onclick="editFaq(${faq.id}, '${escapeQuotes(categoryStr)}', '${escapeQuotes(keywordsStr)}', '${escapeQuotes(answerStr)}')" class="bg-yellow-500 text-white px-2 py-1 rounded mr-1">Edit</button>
                    <button onclick="deleteFaq(${faq.id})" class="bg-red-500 text-white px-2 py-1 rounded">Hapus</button>
                </td>
            `;
            container.appendChild(row);
        });
    } catch (err) {
        console.error("Error loading FAQs:", err);
    }
}

function escapeQuotes(str) {
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// 3. TAMBAH / UPDATE FAQ
async function saveFaq(event) {
    if (event) event.preventDefault();
    const apiKey = getApiKey();
    const faqId = document.getElementById("faq_id") ? document.getElementById("faq_id").value : "";
    
    const category = document.getElementById("faq_category").value;
    const keywords = document.getElementById("faq_keywords").value;
    const answer = document.getElementById("faq_answer").value;

    const payload = { category, keywords, answer };

    let url = `${API_BASE}/api/faqs?api_key=${apiKey}`;
    let method = "POST";

    // Jika ada ID, gunakan PUT ke /api/faqs/{id}?api_key=...
    if (faqId) {
        url = `${API_BASE}/api/faqs/${faqId}?api_key=${apiKey}`;
        method = "PUT";
    }

    try {
        const res = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("FAQ berhasil disimpan!");
            resetFaqForm();
            loadFaqs();
        } else {
            const errData = await res.json();
            alert("Gagal menyimpan FAQ: " + (errData.detail || "Error server"));
        }
    } catch (err) {
        alert("Terjadi kesalahan koneksi");
    }
}

// 4. HAPUS FAQ
async function deleteFaq(id) {
    if (!confirm("Yakin ingin menghapus FAQ ini?")) return;
    const apiKey = getApiKey();

    try {
        const res = await fetch(`${API_BASE}/api/faqs/${id}?api_key=${apiKey}`, {
            method: "DELETE"
        });

        if (res.ok) {
            loadFaqs();
        } else {
            alert("Gagal menghapus FAQ");
        }
    } catch (err) {
        console.error(err);
    }
}

// 5. EDIT FORM HELPER
function editFaq(id, category, keywords, answer) {
    if (document.getElementById("faq_id")) document.getElementById("faq_id").value = id;
    if (document.getElementById("faq_category")) document.getElementById("faq_category").value = category;
    if (document.getElementById("faq_keywords")) document.getElementById("faq_keywords").value = keywords;
    if (document.getElementById("faq_answer")) document.getElementById("faq_answer").value = answer;
    
    const submitBtn = document.getElementById("faq_submit_btn");
    if (submitBtn) submitBtn.innerText = "Update FAQ";
}

function resetFaqForm() {
    if (document.getElementById("faq_id")) document.getElementById("faq_id").value = "";
    if (document.getElementById("faq_category")) document.getElementById("faq_category").value = "";
    if (document.getElementById("faq_keywords")) document.getElementById("faq_keywords").value = "";
    if (document.getElementById("faq_answer")) document.getElementById("faq_answer").value = "";
    
    const submitBtn = document.getElementById("faq_submit_btn");
    if (submitBtn) submitBtn.innerText = "Tambah FAQ";
}

// Auto-run saat dokumen loaded
document.addEventListener("DOMContentLoaded", () => {
    loadProfile();
    loadFaqs();
});
