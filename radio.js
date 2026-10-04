/*
 * Mouja radio bridge
 * Uses the official Meshtastic browser packages. The imports are lazy so the
 * static site remains usable when no radio is connected.
 */
const CORE_URL = 'https://esm.sh/jsr/@meshtastic/core?bundle';
const HTTP_URL = 'https://esm.sh/jsr/@meshtastic/transport-http?bundle';
let device = null;
let transport = null;
let sdkPromise = null;

function emit(name, detail) { window.dispatchEvent(new CustomEvent(name, { detail })); }
function status(connected, extra = {}) { emit('radio-status', { connected, ...extra }); }

async function loadSdk() {
  if (!sdkPromise) sdkPromise = Promise.all([import(CORE_URL), import(HTTP_URL)]);
  return sdkPromise;
}

async function connectHttp(host, tls = false) {
  await disconnect();
  const [{ MeshDevice }, { TransportHTTP }] = await loadSdk();
  const address = host.replace(/^https?:\/\//, '').replace(/\/$/, '');
  transport = await TransportHTTP.create(address, tls);
  device = new MeshDevice(transport);
  device.events.onDeviceStatus.subscribe((next) => {
    const connected = String(next).toLowerCase().includes('connected') || String(next).toLowerCase().includes('configured');
    status(connected, { nodeName: 'Meshtastic ESP32' });
  });
  device.events.onMessagePacket.subscribe((packet) => {
    emit('radio-message', { data: packet.data, from: packet.from, to: packet.to, channel: packet.channel });
  });
  device.events.onNodeInfoPacket.subscribe((packet) => {
    emit('radio-nodes', { count: packet?.num ? 1 : 0, packet });
  });
  device.events.onPositionPacket.subscribe((packet) => {
    emit('radio-location', packet?.data || packet);
  });
  await device.configure();
  status(true, { nodeName: 'Meshtastic ESP32' });
  window.MoujaRadio.connected = true;
  return device;
}

async function sendText(text, destination = 'broadcast', channel = 0) {
  if (!device) throw new Error('لا توجد عقدة راديو متصلة');
  if (!text?.trim()) return;
  return device.sendText(text.trim().slice(0, 200), destination, true, channel);
}

async function disconnect() {
  window.MoujaRadio.connected = false;
  if (device) { try { await device.disconnect(); } catch {} }
  device = null; transport = null;
  status(false);
}

window.MoujaRadio = { connected: false, connectHttp, sendText, disconnect };
