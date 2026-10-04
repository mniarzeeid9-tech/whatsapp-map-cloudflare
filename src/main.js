import './styles/main.css';
import { RoomClient } from './room';
const app = document.querySelector('#app');
const toastRegion = document.querySelector('#toast-region');
let client = null;
let roomCode = '';
let myName = '';
let recording = null;
let recordingChunks = [];
let mediaStream = null;
const renderedMessageIds = new Set();
const icon = (name) => {
    const icons = {
        radio: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5a8 8 0 0 1 16 0M7 12a5 5 0 0 1 10 0M10 14.5a2 2 0 0 1 4 0v.5a2 2 0 0 1-4 0v-.5ZM12 4v3"/></svg>',
        lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
        users: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM17 3.5a4 4 0 0 1 0 7.5M21 20v-1a4 4 0 0 0-3-3.8"/></svg>',
        copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2"/></svg>',
        share: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5"/></svg>',
        phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3.5 9 3l2 5-2 1.7a14 14 0 0 0 5.3 5.3L16 13l5 2-.5 2.5a3 3 0 0 1-3.4 2.4A17 17 0 0 1 4.1 6.9 3 3 0 0 1 6.5 3.5Z"/></svg>',
        video: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/></svg>',
        mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="3" width="8" height="12" rx="4"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"/></svg>',
        micOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3v8M16 3v8a4 4 0 0 1-1 2.8M5 11a7 7 0 0 0 11.4 5.4M12 18v3M8 21h8M4 4l16 16"/></svg>',
        camera: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16 9 5-3v12l-5-3M3 6h13v12H3z"/></svg>',
        paperclip: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m20 11-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 1 1-3-3L14 7"/></svg>',
        send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 4 16 8-16 8 3-8-3-8ZM7 12h13"/></svg>',
        logout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5M14 8l4 4-4 4M18 12H8"/></svg>',
        plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
        arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
        shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v5c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V6l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>',
        close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    };
    return icons[name] ?? '';
};
function renderLanding() {
    app.innerHTML = `
    <main class="landing-shell">
      <div class="landing-noise"></div>
      <header class="landing-nav">
        <a class="brand" href="/" aria-label="واتساب ماب">
          <span class="brand-mark">${icon('radio')}</span>
          <span><strong>واتساب</strong> <em>ماب</em></span>
        </a>
        <div class="privacy-pill">${icon('lock')} <span>لا نحفظ شيئاً</span></div>
      </header>
      <section class="hero-grid">
        <div class="hero-copy">
          <div class="eyebrow"><span class="signal-dot"></span> قناة اتصال خاصة بك</div>
          <h1>احكوا مع بعض،<br /><span>بلا أثر.</span></h1>
          <p class="hero-lead">غرفة مؤقتة. رمز واحد. أصدقاءك فقط.<br />صوت وصورة ورسائل مباشرة دون حسابات أو سجلات.</p>
          <div class="hero-actions">
            <button class="primary-btn large" id="create-room">${icon('plus')} <span>اصنع غرفة الآن</span></button>
            <button class="text-btn" id="how-it-works">كيف تعمل؟ ${icon('arrow')}</button>
          </div>
          <div class="trust-row">
            <span>${icon('shield')} اتصال مباشر بين الأجهزة</span>
            <span>${icon('lock')} حذف تلقائي عند المغادرة</span>
          </div>
        </div>
        <div class="radio-visual" aria-label="رسم جهاز لاسلكي">
          <div class="orbit orbit-one"></div><div class="orbit orbit-two"></div>
          <div class="radio-device">
            <div class="device-antenna"><span></span></div>
            <div class="device-screen"><small>CHANNEL</small><strong>MAP·01</strong><span class="screen-bars">▂ ▅ ▆ ▃ ▇</span></div>
            <div class="device-knob"></div>
            <div class="device-speaker"><i></i><i></i><i></i><i></i><i></i><i></i></div>
            <div class="device-button"></div>
          </div>
          <span class="float-label label-top">ROOM / 8F4K</span>
          <span class="float-label label-bottom">DIRECT LINK <b>●</b></span>
        </div>
      </section>
      <section class="landing-bottom" id="how-section">
        <div><span class="feature-index">01</span><strong>أنشئ رمزاً</strong><small>غرفة خاصة لك ولمن تختار</small></div>
        <div><span class="feature-index">02</span><strong>شارك الرابط</strong><small>بلا تسجيل أو بريد إلكتروني</small></div>
        <div><span class="feature-index">03</span><strong>ابدأ الحديث</strong><small>دردش، اتصل، وأرسل وسائط</small></div>
      </section>
      <footer class="landing-footer"><span>مفتوح المصدر · اتصال مباشر · بلا جمع بيانات</span><a href="/privacy.html" target="_blank" rel="noreferrer">سياسة الخصوصية</a></footer>
    </main>
    <div class="modal-backdrop hidden" id="entry-modal">
      <section class="entry-modal" role="dialog" aria-modal="true" aria-labelledby="entry-title">
        <button class="icon-btn modal-close" id="close-modal" aria-label="إغلاق">${icon('close')}</button>
        <div class="modal-icon">${icon('radio')}</div>
        <p class="eyebrow">اتصال بدون أثر</p>
        <h2 id="entry-title">ابدأ قناة جديدة</h2>
        <p class="modal-note">اختر اسماً مستعاراً يظهر للأشخاص داخل الغرفة فقط.</p>
        <label class="field-label" for="nickname">اسمك داخل الغرفة</label>
        <input class="text-input" id="nickname" maxlength="32" placeholder="مثلاً: سامر" autocomplete="off" />
        <div class="entry-choice">
          <button class="primary-btn" id="create-confirm">${icon('plus')} إنشاء غرفة</button>
          <div class="or-line"><span>أو انضم برمز</span></div>
          <div class="join-row"><input class="text-input code-input" id="join-code" maxlength="6" placeholder="A7K2P9" autocomplete="off" /><button class="secondary-btn" id="join-confirm">انضمام</button></div>
        </div>
        <p class="modal-footnote">لا حسابات. لا رقم هاتف. الاسم مؤقت وينتهي عند مغادرة الغرفة.</p>
      </section>
    </div>`;
    wireLanding();
}
function wireLanding() {
    const modal = document.querySelector('#entry-modal');
    const open = () => { modal.classList.remove('hidden'); document.querySelector('#nickname')?.focus(); };
    const close = () => modal.classList.add('hidden');
    document.querySelector('#create-room')?.addEventListener('click', open);
    document.querySelector('#close-modal')?.addEventListener('click', close);
    modal.addEventListener('click', event => { if (event.target === modal)
        close(); });
    document.querySelector('#how-it-works')?.addEventListener('click', () => document.querySelector('#how-section')?.scrollIntoView({ behavior: 'smooth' }));
    document.querySelector('#create-confirm')?.addEventListener('click', () => startRoom(false));
    document.querySelector('#join-confirm')?.addEventListener('click', () => startRoom(true));
    document.querySelector('#join-code')?.addEventListener('input', event => { event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
    const params = new URLSearchParams(location.search);
    if (params.get('room')) {
        open();
        const code = document.querySelector('#join-code');
        if (code)
            code.value = params.get('room').toUpperCase();
    }
}
function startRoom(join) {
    const nameInput = document.querySelector('#nickname');
    const codeInput = document.querySelector('#join-code');
    myName = nameInput?.value.trim() || 'ضيف';
    const requestedCode = join ? codeInput?.value.trim().toUpperCase() : undefined;
    if (join && (!requestedCode || requestedCode.length < 4)) {
        showToast('أدخل رمز الغرفة أولاً.', 'warn');
        codeInput?.focus();
        return;
    }
    if (myName.length < 2) {
        showToast('اكتب اسماً قصيراً ليعرفك أصدقاؤك.', 'warn');
        nameInput?.focus();
        return;
    }
    showConnecting();
    client = new RoomClient({ onEvent: handleRoomEvent });
    client.connect(myName, requestedCode);
}
function showConnecting() {
    app.innerHTML = `<main class="connecting-screen"><div class="connecting-card"><div class="loader-ring"></div><p>نفتح قناة آمنة مؤقتة…</p><small>لا يتم حفظ بياناتك على الخادم</small></div></main>`;
}
function handleRoomEvent(event) {
    if (event.type === 'joined') {
        roomCode = event.room;
        renderRoom(event.peers, event.expiresIn);
        return;
    }
    if (event.type === 'peer-list') {
        updatePeerList(event.peers);
        return;
    }
    if (event.type === 'peer-joined') {
        updatePeerList(client?.peerList ?? []);
        addSystemMessage(`${event.peer.name} انضم إلى القناة`);
        return;
    }
    if (event.type === 'peer-left') {
        updatePeerList(client?.peerList ?? []);
        addSystemMessage(`${event.name} غادر القناة`);
        removeRemoteVideo(event.peerId);
        return;
    }
    if (event.type === 'chat')
        appendMessage(event.message, event.message.senderId === client?.selfId);
    if (event.type === 'remote-stream')
        attachRemoteStream(event.peerId, event.stream);
    if (event.type === 'local-stream') {
        mediaStream = event.stream;
        updateLocalPreview(event.stream);
    }
    if (event.type === 'connection')
        updateConnectionStatus(event.status);
    if (event.type === 'error') {
        showToast(event.message, 'warn');
        if (!roomCode) {
            client?.leave();
            client = null;
            window.setTimeout(renderLanding, 0);
        }
    }
    if (event.type === 'expired') {
        showToast('انتهت صلاحية الغرفة المؤقتة.', 'warn');
        leaveToHome();
    }
}
function renderRoom(peers, expiresIn) {
    renderedMessageIds.clear();
    const minutes = Math.max(1, Math.round(expiresIn / 60));
    history.replaceState({}, '', `?room=${roomCode}`);
    app.innerHTML = `
    <main class="room-shell">
      <header class="room-topbar">
        <a class="brand compact" href="/" id="home-link"><span class="brand-mark">${icon('radio')}</span><span><strong>واتساب</strong> <em>ماب</em></span></a>
        <div class="room-id-wrap"><span class="room-label">القناة النشطة</span><strong class="room-id">${roomCode}</strong><span class="live-indicator"><i></i> مباشر</span></div>
        <div class="top-actions"><button class="secondary-btn share-btn" id="share-room">${icon('share')} مشاركة الدعوة</button><button class="danger-btn" id="leave-room">${icon('logout')} مغادرة</button></div>
      </header>
      <div class="room-body">
        <aside class="room-sidebar">
          <section class="room-card code-card"><div class="card-kicker">${icon('radio')} رمز الغرفة</div><div class="big-code">${roomCode}</div><p>شارك الرمز أو الرابط مع أصدقائك. تنتهي الغرفة تلقائياً عند خلوها.</p><button class="outline-btn full" id="copy-room">${icon('copy')} نسخ الرابط</button></section>
          <section class="people-section"><div class="section-heading"><span>الأشخاص على القناة</span><span class="people-count" id="people-count">${peers.length + 1}</span></div><div class="people-list" id="people-list"></div></section>
          <section class="privacy-card">${icon('shield')}<div><strong>اتصال بلا سجل</strong><small>رسائلك تنتقل مباشرة ولا تُخزّن.</small></div></section>
          <div class="expires-note">هذه القناة مؤقتة · متبقي تقريباً ${minutes} دقيقة</div>
        </aside>
        <section class="chat-panel">
          <div class="chat-header"><div><span class="panel-kicker">غرفة خاصة</span><h1>موجة الأصدقاء</h1></div><div class="connection-state" id="connection-state"><i></i><span>جاري الربط</span></div></div>
          <div class="media-stage hidden" id="media-stage"><div class="media-grid" id="media-grid"></div><div class="media-controls"><button class="round-control" id="mute-call" title="كتم الميكروفون">${icon('mic')}</button><button class="round-control" id="camera-call" title="تشغيل الكاميرا">${icon('camera')}</button><button class="hangup-control" id="hangup-call" title="إنهاء الاتصال">${icon('phone')}</button></div></div>
          <div class="messages" id="messages"><div class="welcome-message"><div class="welcome-icon">${icon('radio')}</div><h2>أهلاً بك في ${roomCode}</h2><p>هذه مساحة مؤقتة لك ولأصدقائك.<br />قل شيئاً أو ابدأ مكالمة من الأزرار أدناه.</p><span>لا يتم الاحتفاظ بالمحادثة بعد إغلاق القناة.</span></div></div>
          <form class="composer" id="composer"><input type="file" id="file-input" hidden accept="image/*,video/*,audio/*,.pdf,.txt,.zip" /><button type="button" class="composer-tool" id="attach-file" title="إرسال ملف">${icon('paperclip')}</button><button type="button" class="composer-tool voice-tool" id="voice-note" title="رسالة صوتية">${icon('mic')}</button><textarea id="message-input" rows="1" placeholder="اكتب رسالة…" aria-label="نص الرسالة"></textarea><button type="submit" class="send-btn" aria-label="إرسال">${icon('send')}</button></form>
          <div class="call-strip"><span class="call-strip-label">اتصال مباشر</span><button class="call-btn audio-call" id="audio-call">${icon('phone')} <span>صوت</span></button><button class="call-btn video-call" id="video-call">${icon('video')} <span>فيديو</span></button><span class="call-hint">يُطلب إذن الميكروفون أو الكاميرا من جهازك فقط</span></div>
        </section>
      </div>
    </main>`;
    updatePeerList(peers);
    updateConnectionStatus('connecting');
    wireRoom();
}
function wireRoom() {
    document.querySelector('#copy-room')?.addEventListener('click', () => void copyInvite());
    document.querySelector('#share-room')?.addEventListener('click', () => void copyInvite(true));
    document.querySelector('#leave-room')?.addEventListener('click', leaveToHome);
    document.querySelector('#home-link')?.addEventListener('click', event => { event.preventDefault(); leaveToHome(); });
    document.querySelector('#composer')?.addEventListener('submit', event => { event.preventDefault(); sendText(); });
    document.querySelector('#message-input')?.addEventListener('keydown', event => { const keyEvent = event; if (keyEvent.key === 'Enter' && !keyEvent.shiftKey) {
        keyEvent.preventDefault();
        sendText();
    } });
    document.querySelector('#attach-file')?.addEventListener('click', () => document.querySelector('#file-input')?.click());
    document.querySelector('#file-input')?.addEventListener('change', event => { const file = event.target.files?.[0]; if (file)
        void sendFile(file); });
    document.querySelector('#audio-call')?.addEventListener('click', () => void startCall('audio'));
    document.querySelector('#video-call')?.addEventListener('click', () => void startCall('video'));
    document.querySelector('#hangup-call')?.addEventListener('click', hangup);
    document.querySelector('#mute-call')?.addEventListener('click', () => toggleMedia('audio'));
    document.querySelector('#camera-call')?.addEventListener('click', () => toggleMedia('video'));
    document.querySelector('#voice-note')?.addEventListener('click', () => void toggleVoiceNote());
}
async function copyInvite(showToastAfter = false) {
    const url = `${location.origin}${location.pathname}?room=${roomCode}`;
    try {
        await navigator.clipboard.writeText(url);
        showToast(showToastAfter ? 'تم نسخ دعوة الغرفة — أرسلها لمن تثق بهم.' : 'تم نسخ الرابط.', 'ok');
    }
    catch {
        showToast(`رمز الغرفة: ${roomCode}`, 'ok');
    }
}
function updatePeerList(peers) {
    const list = document.querySelector('#people-list');
    const count = document.querySelector('#people-count');
    if (!list || !count)
        return;
    count.textContent = String(peers.length + 1);
    const everyone = [{ id: client?.selfId ?? 'me', name: `${myName} (أنت)` }, ...peers];
    list.innerHTML = everyone.map((peer, index) => `<div class="person-row"><span class="avatar ${index === 0 ? 'self' : ''}">${escapeHtml(peer.name.slice(0, 1))}</span><span class="person-name">${escapeHtml(peer.name)}</span><i class="presence-dot"></i></div>`).join('');
}
function updateConnectionStatus(status) {
    const node = document.querySelector('#connection-state');
    if (!node)
        return;
    const labels = { connecting: 'جاري الربط', connected: 'اتصال مباشر', disconnected: 'اتصال متقطع' };
    node.className = `connection-state ${status}`;
    node.innerHTML = `<i></i><span>${labels[status]}</span>`;
}
function sendText() {
    const input = document.querySelector('#message-input');
    const text = input?.value.trim() ?? '';
    if (!text || !client)
        return;
    const safeText = text.slice(0, 4000);
    const delivered = client.sendText(safeText);
    if (!delivered && client.peerList.length) {
        showToast('لم تفتح القناة المباشرة بعد، انتظر لحظة.', 'warn');
        return;
    }
    appendMessage({ id: crypto.randomUUID(), kind: 'text', text: safeText, senderId: client.selfId, senderName: client.selfName, sentAt: Date.now() }, true);
    if (input) {
        input.value = '';
        input.style.height = 'auto';
    }
}
async function sendFile(file, kind = 'file') {
    if (!client)
        return;
    if (file.size > 5 * 1024 * 1024) {
        showToast('الحد الأقصى للملف المباشر 5 ميغابايت.', 'warn');
        return;
    }
    const delivered = await client.sendFile(file, kind);
    if (!delivered && client.peerList.length) {
        showToast('القناة المباشرة غير جاهزة لإرسال الملف.', 'warn');
        return;
    }
    appendMessage({ id: crypto.randomUUID(), kind, name: file.name, mime: file.type || 'application/octet-stream', data: await readAsDataUrl(file), size: file.size, senderId: client.selfId, senderName: client.selfName, sentAt: Date.now() }, true);
    showToast(kind === 'voice' ? 'تم إرسال الرسالة الصوتية مباشرة.' : 'تم إرسال الملف مباشرة.', 'ok');
}
function readAsDataUrl(file) {
    return new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result ?? '')); reader.onerror = () => resolve(''); reader.readAsDataURL(file); });
}
function appendMessage(message, mine) {
    if (renderedMessageIds.has(message.id))
        return;
    renderedMessageIds.add(message.id);
    const list = document.querySelector('#messages');
    if (!list)
        return;
    list.querySelector('.welcome-message')?.remove();
    const bubble = document.createElement('article');
    bubble.className = `message-bubble ${mine ? 'mine' : 'theirs'}`;
    const time = new Intl.DateTimeFormat('ar', { hour: '2-digit', minute: '2-digit' }).format(new Date(message.sentAt));
    let body = message.kind === 'text' ? `<p>${escapeHtml(message.text ?? '')}</p>` : renderAttachment(message);
    bubble.innerHTML = `<div class="message-meta"><strong>${escapeHtml(mine ? 'أنت' : message.senderName)}</strong><time>${time}</time></div>${body}`;
    list.appendChild(bubble);
    list.scrollTop = list.scrollHeight;
}
function renderAttachment(message) {
    if (!message.data)
        return '<p>ملف مباشر</p>';
    const url = safeUrl(message.data, message.mime);
    if (!url)
        return '<p>تم استلام ملف غير مدعوم للعرض الآمن.</p>';
    if (message.kind === 'voice' && message.mime?.startsWith('audio/'))
        return `<audio controls src="${url}"></audio><small class="file-label">رسالة صوتية</small>`;
    if (message.mime?.startsWith('image/'))
        return `<div class="image-attachment"><img src="${url}" alt="صورة مباشرة" /><span>${escapeHtml(message.name ?? 'صورة')}</span></div>`;
    return `<a class="file-attachment" href="${url}" download="${escapeHtml(message.name ?? 'file')}">${icon('paperclip')}<span><strong>${escapeHtml(message.name ?? 'ملف')}</strong><small>${formatBytes(message.size ?? 0)}</small></span></a>`;
}
function addSystemMessage(text) {
    const list = document.querySelector('#messages');
    if (!list)
        return;
    const item = document.createElement('div');
    item.className = 'system-message';
    item.textContent = text;
    list.appendChild(item);
    list.scrollTop = list.scrollHeight;
}
async function startCall(kind) {
    if (!client)
        return;
    try {
        mediaStream = await client.startMedia(kind);
        document.querySelector('#media-stage')?.classList.remove('hidden');
        updateLocalPreview(mediaStream);
        addSystemMessage(kind === 'video' ? 'بدأت مكالمة فيديو مباشرة' : 'بدأت مكالمة صوتية مباشرة');
    }
    catch {
        showToast('لم نتمكن من الوصول إلى الجهاز. اسمح بالميكروفون أو الكاميرا ثم أعد المحاولة.', 'warn');
    }
}
function updateLocalPreview(stream) {
    const grid = document.querySelector('#media-grid');
    if (!grid)
        return;
    let video = document.querySelector('#local-video');
    if (!video) {
        video = document.createElement('video');
        video.id = 'local-video';
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.className = 'video-tile local';
        grid.prepend(video);
    }
    video.srcObject = stream;
}
function attachRemoteStream(peerId, stream) {
    const grid = document.querySelector('#media-grid');
    if (!grid)
        return;
    let video = document.querySelector(`[data-peer-video="${peerId}"]`);
    if (!video) {
        video = document.createElement('video');
        video.dataset.peerVideo = peerId;
        video.autoplay = true;
        video.playsInline = true;
        video.className = 'video-tile';
        grid.appendChild(video);
    }
    video.srcObject = stream;
    document.querySelector('#media-stage')?.classList.remove('hidden');
}
function removeRemoteVideo(peerId) { document.querySelector(`[data-peer-video="${peerId}"]`)?.remove(); }
function hangup() { client?.stopMedia(); mediaStream = null; document.querySelector('#media-stage')?.classList.add('hidden'); document.querySelector('#media-grid').innerHTML = ''; addSystemMessage('انتهى الاتصال المباشر'); }
function toggleMedia(kind) { const enabled = client?.toggle(kind); if (enabled === undefined)
    return; const button = document.querySelector(kind === 'audio' ? '#mute-call' : '#camera-call'); if (button)
    button.classList.toggle('is-off', !enabled); }
async function toggleVoiceNote() {
    if (!client)
        return;
    if (recording) {
        recording.stop();
        return;
    }
    try {
        mediaStream = mediaStream ?? await client.startMedia('audio');
        recordingChunks = [];
        recording = new MediaRecorder(mediaStream);
        recording.addEventListener('dataavailable', event => { if (event.data.size)
            recordingChunks.push(event.data); });
        recording.addEventListener('stop', () => {
            const blob = new Blob(recordingChunks, { type: recording?.mimeType || 'audio/webm' });
            const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type });
            void sendFile(file, 'voice').then(() => { recording = null; document.querySelector('#voice-note')?.classList.remove('recording'); });
        });
        recording.start();
        document.querySelector('#voice-note')?.classList.add('recording');
        showToast('يسجل الآن… اضغط الزر للإرسال.', 'ok');
    }
    catch {
        showToast('تعذر تشغيل التسجيل الصوتي.', 'warn');
    }
}
function leaveToHome() {
    if (recording) {
        recording.stop();
        recording = null;
    }
    client?.leave();
    client = null;
    roomCode = '';
    mediaStream = null;
    history.replaceState({}, '', '/');
    renderLanding();
}
function showToast(text, kind) {
    const toast = document.createElement('div');
    toast.className = `toast ${kind}`;
    toast.textContent = text;
    toastRegion.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3600);
}
function escapeHtml(value) { return value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character); }
function safeUrl(value, mime = 'application/octet-stream') {
    const match = /^data:([a-z0-9.+-]+);base64,([a-z0-9+/=]+)$/i.exec(value);
    if (!match)
        return '';
    const actualMime = match[1].toLowerCase();
    const allowed = actualMime.startsWith('image/') || actualMime.startsWith('audio/') || actualMime.startsWith('video/') || ['application/pdf', 'application/zip', 'application/octet-stream', 'text/plain'].includes(actualMime);
    if (!allowed || (mime && actualMime !== mime.toLowerCase()))
        return '';
    return `data:${actualMime};base64,${match[2]}`;
}
function formatBytes(bytes) { if (!bytes)
    return 'ملف'; const units = ['بايت', 'ك.ب', 'م.ب']; let index = 0; let value = bytes; while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index++;
} return `${value.toFixed(index ? 1 : 0)} ${units[index]}`; }
renderLanding();
window.addEventListener('beforeunload', () => client?.leave());
