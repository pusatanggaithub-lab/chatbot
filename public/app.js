// Helper bersama untuk semua halaman dashboard (vanilla JS)
const API = location.origin;

function getKey() {
  return localStorage.getItem('cbw_api_key') || '';
}
function setKey(k) {
  localStorage.setItem('cbw_api_key', k.trim());
  location.reload();
}

async function api(path, options = {}) {
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`${API}${path}${sep}api_key=${encodeURIComponent(getKey())}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Error ${res.status}`);
  }
  return res.json();
}

function renderShell(active) {
  const links = [
    ['index.html', 'FAQ'],
    ['logs.html', 'Log Tak Terjawab'],
    ['settings.html', 'Tampilan Widget'],
    ['embed.html', 'Kode Embed'],
  ];
  document.getElementById('nav').innerHTML = links
    .map(
      ([href, label]) =>
        `<a href="${href}" class="px-3 py-2 rounded-lg text-sm ${
          href === active ? 'bg-teal-700 text-white' : 'text-slate-600 hover:bg-slate-100'
        }">${label}</a>`
    )
    .join('');

  const keyBox = document.getElementById('keybox');
  if (keyBox) {
    keyBox.innerHTML = `
      <input id="keyInput" value="${getKey()}" placeholder="API key"
        class="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-52" />
      <button id="keySave" class="bg-slate-800 text-white text-sm px-3 py-1.5 rounded-lg">Simpan</button>`;
    document.getElementById('keySave').onclick = () =>
      setKey(document.getElementById('keyInput').value);
  }
}

function toast(msg, ok = true) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-white text-sm ${
    ok ? 'bg-teal-700' : 'bg-red-600'
  }`;
  el.style.display = 'block';
  setTimeout(() => (el.style.display = 'none'), 2500);
}
