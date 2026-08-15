/**
 * Chatbot Embed Widget - file statis murni, tanpa build step.
 * Pemakaian:
 *   <script src="https://chatbot-psi-seven-4pioiv8axu.vercel.app/widget.js" data-api-key="demo123456"></script>
 */
(function () {
  var script = document.currentScript;
  var API_KEY = script.getAttribute('data-api-key') || '';
  var BASE_URL = (script.getAttribute('data-api-url') || script.src.replace(/\/widget\.js.*$/, '')).replace(/\/$/, '');

  var config = {
    bot_name: 'Asisten Bot AI',
    bot_color: '#0F8A78',
    avatar_url: null,
    welcome_message: 'Halo! Ada yang bisa saya bantu?'
  };

  // ---------- STYLE ----------
  var style = document.createElement('style');
  style.textContent = [
    '.cbw-btn{position:fixed;bottom:20px;right:20px;width:60px;height:60px;border:none;border-radius:50%;',
    'color:#fff;font-size:26px;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.22);z-index:2147483000;}',
    '.cbw-box{display:none;position:fixed;bottom:92px;right:20px;width:340px;height:460px;background:#fff;',
    'border-radius:16px;box-shadow:0 20px 50px rgba(0,0,0,.22);flex-direction:column;overflow:hidden;',
    'z-index:2147483000;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;}',
    '.cbw-box.cbw-open{display:flex;}',
    '.cbw-hdr{display:flex;align-items:center;gap:10px;padding:14px 16px;color:#fff;font-weight:600;font-size:15px;}',
    '.cbw-hdr img{width:32px;height:32px;border-radius:50%;object-fit:cover;background:rgba(255,255,255,.25);}',
    '.cbw-logs{flex:1;padding:14px;overflow-y:auto;background:#f6f8f8;}',
    '.cbw-msg{margin-bottom:10px;font-size:14px;line-height:1.5;padding:9px 13px;border-radius:12px;max-width:82%;white-space:pre-wrap;}',
    '.cbw-msg.user{color:#fff;margin-left:auto;border-bottom-right-radius:4px;}',
    '.cbw-msg.bot{background:#fff;color:#28322f;margin-right:auto;border:1px solid #e4eae9;border-bottom-left-radius:4px;}',
    '.cbw-in{display:flex;gap:6px;padding:10px;border-top:1px solid #e4eae9;background:#fff;}',
    '.cbw-in input{flex:1;padding:10px;border:1px solid #d7dfde;border-radius:8px;outline:none;font-size:14px;}',
    '.cbw-in button{padding:10px 14px;border:none;border-radius:8px;color:#fff;cursor:pointer;font-size:14px;}'
  ].join('');
  document.head.appendChild(style);

  // ---------- ELEMEN ----------
  var btn = document.createElement('button');
  btn.className = 'cbw-btn';
  btn.type = 'button';
  btn.innerHTML = '&#128172;';

  var box = document.createElement('div');
  box.className = 'cbw-box';
  box.innerHTML =
    '<div class="cbw-hdr"><img alt="" /><span class="cbw-name"></span></div>' +
    '<div class="cbw-logs"></div>' +
    '<form class="cbw-in"><input type="text" placeholder="Ketik pesan..." /><button type="submit">Kirim</button></form>';

  document.body.appendChild(btn);
  document.body.appendChild(box);

  var hdr = box.querySelector('.cbw-hdr');
  var avatar = box.querySelector('.cbw-hdr img');
  var nameEl = box.querySelector('.cbw-name');
  var logs = box.querySelector('.cbw-logs');
  var form = box.querySelector('.cbw-in');
  var input = form.querySelector('input');
  var sendBtn = form.querySelector('button');

  function applyConfig() {
    btn.style.background = config.bot_color;
    hdr.style.background = config.bot_color;
    sendBtn.style.background = config.bot_color;
    nameEl.textContent = config.bot_name;
    if (config.avatar_url) { avatar.src = config.avatar_url; } else { avatar.style.display = 'none'; }
  }

  function addMsg(text, who) {
    var el = document.createElement('div');
    el.className = 'cbw-msg ' + who;
    if (who === 'user') el.style.background = config.bot_color;
    el.textContent = text;
    logs.appendChild(el);
    logs.scrollTop = logs.scrollHeight;
    return el;
  }

  btn.onclick = function () { box.classList.toggle('cbw-open'); input.focus(); };

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    addMsg(text, 'user');
    var typing = addMsg('...', 'bot');

    fetch(BASE_URL + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: API_KEY, message: text, asal_url: location.href })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) { typing.textContent = d.reply || 'Maaf, terjadi kesalahan.'; })
      .catch(function () { typing.textContent = 'Koneksi ke server gagal.'; });
  });

  // ---------- LOAD CONFIG ----------
  applyConfig();
  fetch(BASE_URL + '/api/widget/config?api_key=' + encodeURIComponent(API_KEY))
    .then(function (r) { return r.json(); })
    .then(function (d) { if (d && d.bot_name) { config = Object.assign(config, d); applyConfig(); } })
    .catch(function () {})
    .then(function () { addMsg(config.welcome_message, 'bot'); });
})();
