const os = require('os');

module.exports = async (cmd, { sock, msg, jid, args, BOT_NAME, OWNER, PREFIX, isOwner }) => {
  const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
  const uptime = () => {
    const s = Math.floor(process.uptime());
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return `${h}h ${m}m ${sec}s`;
  };

  switch (cmd) {

    case 'menu':
    case 'help':
      await reply(`
╔══════════════════════╗
║   👻 *${BOT_NAME} BOT* MENU   ║
╚══════════════════════╝

⚡ *GENERAL*
${PREFIX}ping — Bot speed check
${PREFIX}alive — Online status
${PREFIX}owner — Owner info
${PREFIX}runtime — Bot uptime
${PREFIX}info — Bot info

🎵 *DOWNLOADS*
${PREFIX}song [name] — YouTube MP3
${PREFIX}play [name] — YouTube MP3 (alt)
${PREFIX}video [url] — YouTube video
${PREFIX}tiktok [url] — TikTok video
${PREFIX}insta [url] — Instagram reel
${PREFIX}fb [url] — Facebook video
${PREFIX}twitter [url] — Twitter/X video
${PREFIX}ytsearch [name] — YouTube search

🎨 *MEDIA & FUN*
${PREFIX}sticker — Image → Sticker
${PREFIX}toimg — Sticker → Image
${PREFIX}ai [text] — AI chat
${PREFIX}weather [city] — Weather info
${PREFIX}lyrics [song] — Song lyrics
${PREFIX}translate [text] — Translate

👑 *GROUP (Admin only)*
${PREFIX}kick @user — Remove user
${PREFIX}promote @user — Make admin
${PREFIX}demote @user — Remove admin
${PREFIX}tagall — Tag everyone
${PREFIX}antilink on/off — Link protection
${PREFIX}welcome on/off — Welcome msg
${PREFIX}mute — Mute group
${PREFIX}unmute — Unmute group
${PREFIX}link — Group invite link
${PREFIX}revoke — Reset invite link

╔══════════════════════╗
║  👻 Powered by ${BOT_NAME} ™  ║
╚══════════════════════╝`);
      break;

    case 'ping': {
      const start = Date.now();
      await sock.sendMessage(jid, { react: { text: '⚡', key: msg.key } });
      await reply(`🏓 *Pong!*\n⚡ Speed: *${Date.now() - start}ms*`);
      break;
    }

    case 'alive':
      await reply(
        `👻 *${BOT_NAME} BOT* is Online!\n\n` +
        `⚡ RAM: *${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB*\n` +
        `🖥️ OS: *${os.platform()} ${os.arch()}*\n` +
        `⏱️ Uptime: *${uptime()}*\n` +
        `🟢 Status: *Active*`
      );
      break;

    case 'owner':
      await reply(`👑 *Bot Owner*\n📞 wa.me/${OWNER}\n\n_${BOT_NAME} BOT by Ghost ™_`);
      break;

    case 'runtime':
      await reply(`⏱️ *Bot Runtime*\n\n🕐 Uptime: *${uptime()}*`);
      break;

    case 'info':
      await reply(
        `👻 *${BOT_NAME} BOT — Info*\n\n` +
        `📌 Version: *2.0.0*\n` +
        `⚙️ Engine: *Baileys v6*\n` +
        `🟢 Node: *${process.version}*\n` +
        `📱 Platform: *WhatsApp Multi-Device*\n` +
        `👑 Owner: *+${OWNER}*\n` +
        `⚡ Prefix: *${PREFIX}*`
      );
      break;
  }
};
