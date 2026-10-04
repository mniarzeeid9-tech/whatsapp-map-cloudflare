const SIGNALING_BASE = import.meta.env.VITE_SIGNALING_URL || window.location.origin;

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.cloudflare.com:3478' },
    ],
};
const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_MESSAGE_LENGTH = 4000;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
function createRoomCode() {
    const values = new Uint32Array(6);
    crypto.getRandomValues(values);
    return [...values].map(value => ROOM_ALPHABET[value % ROOM_ALPHABET.length]).join('');
}
function validChatMessage(value) {
    if (!value || typeof value !== 'object')
        return false;
    const candidate = value;
    if (typeof candidate.id !== 'string' || candidate.id.length > 80)
        return false;
    if (!['text', 'file', 'voice'].includes(candidate.kind ?? ''))
        return false;
    if (typeof candidate.senderId !== 'string' || candidate.senderId.length > 80)
        return false;
    if (typeof candidate.senderName !== 'string' || candidate.senderName.length > 32)
        return false;
    if (typeof candidate.sentAt !== 'number' || !Number.isFinite(candidate.sentAt))
        return false;
    if (candidate.kind === 'text' && (typeof candidate.text !== 'string' || candidate.text.length > MAX_MESSAGE_LENGTH))
        return false;
    if (candidate.kind !== 'text' && (typeof candidate.data !== 'string' || candidate.data.length > 8 * 1024 * 1024))
        return false;
    return true;
}
export class RoomClient {
    socket = null;
    options;
    peers = new Map();
    connections = new Map();
    channels = new Map();
    candidateQueues = new Map();
    self = { id: '', name: '' };
    room = '';
    localStream = null;
    status = 'idle';
    constructor(options) {
        this.options = options;
    }
    get selfId() {
        return this.self.id;
    }
    get selfName() {
        return this.self.name;
    }
    get roomCode() {
        return this.room;
    }
    get localMedia() {
        return this.localStream;
    }
    get peerList() {
        return [...this.peers.values()];
    }
    connect(name, roomCode) {
        this.status = 'connecting';
        this.options.onEvent({ type: 'connection', status: 'connecting' });
        this.self.name = name.trim().slice(0, 32);
        const creating = !roomCode;
        const requestedRoom = roomCode?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || createRoomCode();
        let signalingUrl;
        try {
            signalingUrl = new URL(SIGNALING_BASE, window.location.origin);
        }
        catch {
            this.options.onEvent({ type: 'error', message: 'إعداد خادم الاتصال غير صالح.' });
            return;
        }
        const protocol = signalingUrl.protocol === 'https:' ? 'wss:' : 'ws:';
        const socketUrl = new URL('/ws', `${protocol}//${signalingUrl.host}`);
        socketUrl.searchParams.set('room', requestedRoom);
        if (creating)
            socketUrl.searchParams.set('create', '1');
        this.socket = new WebSocket(socketUrl);
        this.socket.addEventListener('open', () => {
            this.socket?.send(JSON.stringify({ type: 'join', name: this.self.name, room: requestedRoom, create: creating }));
        });
        this.socket.addEventListener('message', event => this.handleServerMessage(event.data));
        this.socket.addEventListener('error', () => {
            this.options.onEvent({ type: 'error', message: 'تعذر الوصول إلى قناة الاتصال. تحقق من نشر Worker ثم جرّب مرة أخرى.' });
        });
        this.socket.addEventListener('close', () => {
            if (this.status !== 'idle')
                this.options.onEvent({ type: 'connection', status: 'disconnected' });
        });
    }
    leave() {
        this.socket?.send(JSON.stringify({ type: 'leave' }));
        this.shutdown();
    }
    shutdown() {
        this.status = 'idle';
        this.socket?.close();
        this.socket = null;
        for (const connection of this.connections.values())
            connection.close();
        this.connections.clear();
        this.channels.clear();
        this.peers.clear();
        this.candidateQueues.clear();
        this.stopMedia();
        this.room = '';
        this.self = { id: '', name: '' };
    }
    send(payload) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN)
            return false;
        this.socket.send(JSON.stringify(payload));
        return true;
    }
    handleServerMessage(raw) {
        let message;
        try {
            message = JSON.parse(raw);
        }
        catch {
            return;
        }
        if (message.type === 'joined') {
            this.room = message.room;
            this.self.id = message.peerId;
            this.peers.clear();
            for (const peer of message.peers)
                this.peers.set(peer.id, peer);
            this.status = 'connected';
            this.options.onEvent({ type: 'joined', room: this.room, peerId: this.self.id, peers: message.peers, expiresIn: message.expiresIn });
            this.options.onEvent({ type: 'peer-list', peers: this.peerList });
            void this.connectToKnownPeers();
            return;
        }
        if (message.type === 'peer-joined') {
            this.peers.set(message.peer.id, message.peer);
            this.options.onEvent({ type: 'peer-joined', peer: message.peer });
            this.options.onEvent({ type: 'peer-list', peers: this.peerList });
            return;
        }
        if (message.type === 'peer-left') {
            this.closePeer(message.peerId);
            this.peers.delete(message.peerId);
            this.options.onEvent({ type: 'peer-left', peerId: message.peerId, name: message.name });
            this.options.onEvent({ type: 'peer-list', peers: this.peerList });
            return;
        }
        if (message.type === 'signal') {
            void this.handleSignal(message.from, message.payload);
            return;
        }
        if (message.type === 'room-expired') {
            this.options.onEvent({ type: 'expired' });
            this.shutdown();
            return;
        }
        if (message.type === 'error')
            this.options.onEvent({ type: 'error', message: message.message });
    }
    async connectToKnownPeers() {
        for (const peer of this.peers.values())
            await this.negotiate(peer.id);
    }
    makeConnection(peerId) {
        const existing = this.connections.get(peerId);
        if (existing)
            return existing;
        const connection = new RTCPeerConnection(ICE_SERVERS);
        this.connections.set(peerId, connection);
        connection.onicecandidate = event => {
            if (event.candidate)
                this.send({ type: 'signal', to: peerId, payload: { kind: 'candidate', candidate: event.candidate.toJSON() } });
        };
        connection.ontrack = event => {
            const stream = event.streams[0];
            if (stream)
                this.options.onEvent({ type: 'remote-stream', peerId, stream });
        };
        connection.ondatachannel = event => this.attachChannel(peerId, event.channel);
        connection.onconnectionstatechange = () => {
            if (connection.connectionState === 'connected')
                this.options.onEvent({ type: 'connection', status: 'connected' });
            if (connection.connectionState === 'disconnected' || connection.connectionState === 'failed')
                this.options.onEvent({ type: 'connection', status: 'disconnected' });
        };
        if (this.localStream)
            for (const track of this.localStream.getTracks())
                connection.addTrack(track, this.localStream);
        return connection;
    }
    attachChannel(peerId, channel) {
        this.channels.set(peerId, channel);
        channel.onmessage = event => this.handleDataMessage(event.data);
        channel.onopen = () => this.options.onEvent({ type: 'connection', status: 'connected' });
        channel.onclose = () => {
            if (this.channels.get(peerId) === channel)
                this.channels.delete(peerId);
        };
    }
    async negotiate(peerId) {
        if (!this.self.id)
            return;
        const connection = this.makeConnection(peerId);
        if (!this.channels.has(peerId))
            this.attachChannel(peerId, connection.createDataChannel('whatsappmap'));
        try {
            const offer = await connection.createOffer();
            await connection.setLocalDescription(offer);
            if (connection.localDescription)
                this.send({ type: 'signal', to: peerId, payload: { kind: 'offer', description: connection.localDescription } });
        }
        catch {
            this.options.onEvent({ type: 'error', message: 'تعذر تهيئة قناة مباشرة مع أحد الأصدقاء.' });
        }
    }
    async handleSignal(peerId, payload) {
        const connection = this.makeConnection(peerId);
        try {
            if (payload.kind === 'offer') {
                await connection.setRemoteDescription(payload.description);
                const answer = await connection.createAnswer();
                await connection.setLocalDescription(answer);
                if (connection.localDescription)
                    this.send({ type: 'signal', to: peerId, payload: { kind: 'answer', description: connection.localDescription } });
                await this.flushCandidates(peerId, connection);
            }
            else if (payload.kind === 'answer') {
                await connection.setRemoteDescription(payload.description);
                await this.flushCandidates(peerId, connection);
            }
            else if (payload.kind === 'candidate') {
                if (connection.remoteDescription)
                    await connection.addIceCandidate(payload.candidate);
                else
                    this.candidateQueues.set(peerId, [...(this.candidateQueues.get(peerId) ?? []), payload.candidate]);
            }
        }
        catch {
            this.options.onEvent({ type: 'error', message: 'حدث تعارض مؤقت في قناة الاتصال، وستتم المحاولة تلقائياً.' });
        }
    }
    async flushCandidates(peerId, connection) {
        const queued = this.candidateQueues.get(peerId) ?? [];
        this.candidateQueues.delete(peerId);
        for (const candidate of queued)
            await connection.addIceCandidate(candidate);
    }
    handleDataMessage(raw) {
        let message;
        try {
            message = JSON.parse(raw);
        }
        catch {
            return;
        }
        if ((message.type === 'chat' || message.type === 'file') && validChatMessage(message.message))
            this.options.onEvent({ type: 'chat', message: message.message });
    }
    broadcast(payload) {
        let delivered = false;
        for (const channel of this.channels.values()) {
            if (channel.readyState === 'open') {
                channel.send(JSON.stringify(payload));
                delivered = true;
            }
        }
        return delivered;
    }
    sendText(text) {
        const safeText = text.trim().slice(0, MAX_MESSAGE_LENGTH);
        if (!safeText)
            return false;
        const message = {
            id: crypto.randomUUID(), kind: 'text', text: safeText, senderId: this.self.id, senderName: this.self.name, sentAt: Date.now(),
        };
        return this.broadcast({ type: 'chat', message });
    }
    sendFile(file, kind = 'file') {
        return new Promise(resolve => {
            if (file.size > MAX_FILE_BYTES) {
                resolve(false);
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = String(reader.result ?? '');
                if (dataUrl.length > 8 * 1024 * 1024) {
                    resolve(false);
                    return;
                }
                const message = {
                    id: crypto.randomUUID(), kind, name: file.name || 'ملف', mime: file.type || 'application/octet-stream', data: dataUrl,
                    size: file.size, senderId: this.self.id, senderName: this.self.name, sentAt: Date.now(),
                };
                resolve(this.broadcast({ type: 'file', message }));
            };
            reader.onerror = () => resolve(false);
            reader.readAsDataURL(file);
        });
    }
    async startMedia(kind) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: kind === 'video' });
        if (!this.localStream)
            this.localStream = new MediaStream();
        const wantedKinds = kind === 'video' ? ['audio', 'video'] : ['audio'];
        for (const track of stream.getTracks()) {
            if (!this.localStream.getTracks().some(existing => existing.kind === track.kind))
                this.localStream.addTrack(track);
            else
                track.stop();
        }
        for (const [peerId, connection] of this.connections) {
            for (const track of this.localStream.getTracks()) {
                if (!connection.getSenders().some(sender => sender.track?.kind === track.kind))
                    connection.addTrack(track, this.localStream);
            }
            await this.negotiate(peerId);
        }
        for (const track of this.localStream.getTracks())
            track.enabled = wantedKinds.includes(track.kind);
        this.options.onEvent({ type: 'local-stream', stream: this.localStream });
        return this.localStream;
    }
    toggle(kind) {
        const track = this.localStream?.getTracks().find(candidate => candidate.kind === kind);
        if (!track)
            return false;
        track.enabled = !track.enabled;
        return track.enabled;
    }
    stopMedia() {
        for (const connection of this.connections.values()) {
            for (const sender of connection.getSenders()) {
                if (sender.track)
                    connection.removeTrack(sender);
            }
        }
        for (const track of this.localStream?.getTracks() ?? [])
            track.stop();
        this.localStream = null;
    }
    closePeer(peerId) {
        this.connections.get(peerId)?.close();
        this.connections.delete(peerId);
        this.channels.delete(peerId);
        this.candidateQueues.delete(peerId);
    }
}
