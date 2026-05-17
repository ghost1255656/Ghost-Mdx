const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  generatePairingCode
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');
require('dotenv').config();

// Commands
const downloadCmd = require('./commands/download');
const mediaCmd    = require('./commands/media');
const groupCmd    = require('./commands/group');
const generalCmd  = require('./commands/general');

const PREFIX    = process.env.PREFIX    || '.';
const OWNER     = process.env.OWNER_NUMBER || '';
const BOT_NAME  = process.env.BOT_NAME  || 'GHOST';
const PORT      = process.env.PORT      || 3000;
const SESSION_DIR = './session';

// Global socket reference for pair code API
let globalSock = null;
let isConnected = false;

// ─────────────────────────────────────────────
//  HTTP SERVER — Pair Code API + Health check
// ─────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  // CORS headers (so your website can call this)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200); res.end(); return;
  }

  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  const query = parsed.query;

  // ── GET /health ──────────────────────────────
  if (pathname === '/' || pathname === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'online',
      bot: BOT_NAME + ' BOT',
      connected: isConnected,
      uptime: Math.floor(process.uptime()) + 's'
    }));
    return;
  }

  // ── GET /pair?phone=94771234567 ──────────────
  if (pathname === '/pair') {
    const phone = (query.phone || '').replace(/[^0-9]/g, '');

    if (!phone || phone.length < 10) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Valid phone number required. Example: ?phone=94771234567' }));
      return;
    }

    if (!globalSock) {
      res.writeHead(503);
      res.end(JSON.stringify({ error: 'Bot not ready yet. Wait 10-15 seconds and try again.' }));
      return;
    }

    try {
      // Generate real WhatsApp pair code
      const code = await globalSock.requestPairingCode(phone);
      const formatted = code?.match(/.{1,4}/g)?.join('-') || code;

      console.log(`[PAIR] Code generated for +${phone}: ${formatted}`);

      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        phone: '+' + phone,
        code: formatted,
        expires_in: '60 seconds',
        instructions: [
          'Open WhatsApp',
          'Go to Settings → Linked Devices → Link a Device',
          'Tap "Link with phone number"',
          'Enter the code above'
        ]
      }));
    } catch (err) {
      console.error('[PAIR ERROR]', err.message);
      res.writeHead(500);
      res.end(JSON.stringify({
        error: 'Failed to generate pair code: ' + err.message,
        tip: 'Make sure bot is connected and number is not already linked.'
      }));
    }
    return;
  }

  // 404
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found', endpoints: ['GET /health', 'GET /pair?phone=94771234567'] }));
});

server.listen(PORT, () => {
  console.log(`\n🌐 API Server running on port ${PORT}`);
  console.log(`   Pair code: http://localhost:${PORT}/pair?phone=YOUR_NUMBER\n`);
});

// ─────────────────────────────────────────────
//  WHATSAPP BOT
// ─────────────────────────────────────────────
async function startBot() {
  if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
    },
    printQRInTerminal: false,
    browser: [BOT_NAME + ' BOT', 'Chrome', '3.0'],
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
  });

  globalSock = sock;

  // Connection handler
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
      isConnected = false;
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      console.log(`[BOT] Disconnected (${code}). Reconnect: ${shouldReconnect}`);
      if (shouldReconnect) setTimeout(startBot, 5000);
      else {
        console.log('[BOT] Logged out. Delete session/ folder and restart.');
        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
      }
    } else if (connection === 'open') {
      isConnected = true;
      console.log(`\n👻 ${BOT_NAME} BOT Online! Ready to receive commands.\n`);
    } else if (connection === 'connecting') {
      console.log('[BOT] Connecting to WhatsApp...');
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // Message handler
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      try {
        if (!msg.message) continue;
        if (msg.key.fromMe) continue;

        const jid  = msg.key.remoteJid;
        const isGroup = jid?.endsWith('@g.us');
        const sender = isGroup ? msg.key.participant : jid;
        const senderNum = sender?.replace('@s.whatsapp.net', '');
        const isOwner = senderNum === OWNER || senderNum === OWNER?.replace(/\D/g,'');

        // Get message text
        const body =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          msg.message?.videoMessage?.caption || '';

        if (!body.startsWith(PREFIX)) continue;

        const args    = body.slice(PREFIX.length).trim().split(/\s+/);
        const command = args.shift().toLowerCase();

        const ctx = { sock, msg, jid, args, body, sender, senderNum, isOwner, isGroup, BOT_NAME, OWNER, PREFIX };

        const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

        // Route commands
        const generalCmds = ['menu', 'help', 'ping', 'alive', 'owner', 'runtime', 'info'];
        const downloadCmds = ['song', 'video', 'tiktok', 'insta', 'fb', 'twitter', 'play'];
        const mediaCmds   = ['sticker', 'toimg', 'ai', 'weather', 'lyrics', 'translate', 'ytsearch'];
        const groupCmds   = ['kick', 'promote', 'demote', 'tagall', 'antilink', 'welcome', 'mute', 'unmute', 'link', 'revoke'];

        if (generalCmds.includes(command))  await generalCmd(command, ctx);
        else if (downloadCmds.includes(command)) await downloadCmd(command, ctx);
        else if (mediaCmds.includes(command))    await mediaCmd(command, ctx);
        else if (groupCmds.includes(command))    await groupCmd(command, ctx);
        else {
          // Unknown command
          await reply(`❓ *${PREFIX}${command}* command හොයාගන්න බැහැ.\n\n${PREFIX}menu type කරන්න commands list ගන්න.`);
        }

      } catch (err) {
        console.error('[MSG ERROR]', err.message);
      }
    }
  });

  return sock;
}

// Start everything
startBot().catch(console.error);

process.on('uncaughtException', (err) => console.error('[UNCAUGHT]', err.message));
process.on('unhandledRejection', (err) => console.error('[UNHANDLED]', err?.message));
