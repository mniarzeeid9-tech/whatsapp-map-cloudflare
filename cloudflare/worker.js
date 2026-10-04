const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const MAX_PAYLOAD = 64 * 1024
const MAX_SESSIONS = 12
const ROOM_TTL = 30 * 60 * 1000

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Content-Security-Policy': "default-src 'self'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self' wss: ws:; font-src 'self'; worker-src 'self' blob:"
}

const normalizeCode = value => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
const isRoomCode = value => /^[A-Z0-9]{6}$/.test(value)
const safeName = value => String(value || 'ضيف').normalize('NFKC').replace(/[<>\u0000-\u001f\u007f]/g, '').trim().slice(0, 32) || 'ضيف'
const randomId = () => crypto.randomUUID().slice(0, 8)
const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), { status, headers: { ...SECURITY_HEADERS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra } })
const send = (socket, payload) => { if (socket.readyState === 1) socket.send(JSON.stringify(payload)) }

function withSecurity(response) {
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) headers.set(key, value)
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/health') return json({ ok: true, service: 'whatsapp-map', runtime: 'cloudflare-workers' })
    if (url.pathname === '/ws') {
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return json({ error: 'WebSocket upgrade required' }, 426)
      const room = normalizeCode(url.searchParams.get('room'))
      if (!isRoomCode(room)) return json({ error: 'رمز الغرفة غير صالح.' }, 400)
      const id = env.ROOMS.idFromName(room)
      return env.ROOMS.get(id).fetch(request)
    }
    return withSecurity(await env.ASSETS.fetch(request))
  }
}

export class RoomHub {
  constructor() {
    // Deliberately memory-only: this DO never calls ctx.storage and never persists user data.
    this.clients = new Map()
    this.expiryTimer = null
  }

  async fetch(request) {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return json({ error: 'WebSocket upgrade required' }, 426)
    const [client, server] = Object.values(new WebSocketPair())
    server.accept()
    const requestRoom = normalizeCode(new URL(request.url).searchParams.get('room'))
    const session = { socket: server, id: '', name: '', room: requestRoom, joined: false, left: false, windowStarted: Date.now(), messageCount: 0 }
    server.addEventListener('message', event => void this.onMessage(session, event.data))
    server.addEventListener('close', () => this.leave(session))
    server.addEventListener('error', () => this.leave(session))
    return new Response(null, { status: 101, webSocket: client })
  }

  async onMessage(session, raw) {
    const text = typeof raw === 'string' ? raw : new TextDecoder().decode(raw)
    if (new TextEncoder().encode(text).byteLength > MAX_PAYLOAD) { this.fail(session, 'حجم رسالة الإشارة أكبر من المسموح.', 1009); return }
    let message
    try { message = JSON.parse(text) } catch { this.fail(session, 'رسالة غير صالحة.'); return }
    if (!message || typeof message !== 'object' || typeof message.type !== 'string') { this.fail(session, 'بنية الرسالة غير صالحة.'); return }
    if (message.type === 'join') {
      if (session.joined) return
      const code = normalizeCode(message.room)
      const creating = message.create === true
      if (!isRoomCode(code) || code !== session.room) { this.fail(session, 'رمز الغرفة غير صالح.'); return }
      if (creating && this.clients.size > 0) { this.fail(session, 'تعارض مؤقت في رمز الغرفة. أنشئ غرفة جديدة.'); return }
      if (!creating && this.clients.size === 0) { this.fail(session, 'لم نعثر على هذه الغرفة. تأكد من الرمز أو أنشئ غرفة جديدة.'); return }
      if (this.clients.size >= MAX_SESSIONS) { this.fail(session, 'الغرفة ممتلئة حالياً. جرّب رمزاً آخر.'); return }
      session.id = randomId(); session.name = safeName(message.name); session.joined = true
      this.clients.set(session.id, session)
      this.armExpiry()
      this.send(session, { type: 'joined', room: code, peerId: session.id, peers: this.peerList(session.id), expiresIn: ROOM_TTL / 1000 })
      for (const member of this.clients.values()) if (member.id !== session.id) this.send(member, { type: 'peer-joined', peer: { id: session.id, name: session.name } })
      return
    }
    if (!session.joined || !this.rateLimit(session)) { this.fail(session, 'تم إيقاف القناة مؤقتاً بسبب كثرة الرسائل.'); return }
    if (message.type === 'signal') {
      if (typeof message.to !== 'string' || message.to.length > 32 || !message.payload || typeof message.payload !== 'object') { this.fail(session, 'بيانات الإشارة غير صالحة.'); return }
      const target = this.clients.get(message.to)
      if (target) this.send(target, { type: 'signal', from: session.id, payload: message.payload })
    } else if (message.type === 'leave') {
      this.leave(session); session.socket.close(1000, 'left')
    } else {
      this.fail(session, 'نوع رسالة غير مسموح.')
    }
    this.armExpiry()
  }

  send(session, payload) { send(session.socket, payload) }
  fail(session, message, code = 1008) { this.send(session, { type: 'error', message }); session.socket.close(code, 'policy'); this.leave(session) }
  peerList(except) { return [...this.clients.values()].filter(session => session.id !== except).map(session => ({ id: session.id, name: session.name })) }

  rateLimit(session) {
    const now = Date.now()
    if (now - session.windowStarted > 60_000) { session.windowStarted = now; session.messageCount = 0 }
    session.messageCount += 1
    return session.messageCount <= 300
  }

  leave(session) {
    if (!session || session.left) return
    session.left = true
    if (session.id) this.clients.delete(session.id)
    for (const member of this.clients.values()) this.send(member, { type: 'peer-left', peerId: session.id, name: session.name })
    if (this.clients.size === 0 && this.expiryTimer) { clearTimeout(this.expiryTimer); this.expiryTimer = null }
  }

  armExpiry() {
    if (this.expiryTimer) clearTimeout(this.expiryTimer)
    this.expiryTimer = setTimeout(() => {
      for (const session of this.clients.values()) { this.send(session, { type: 'room-expired' }); session.socket.close(1000, 'expired') }
      this.clients.clear()
      this.expiryTimer = null
    }, ROOM_TTL)
  }
}
