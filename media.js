const axios = require('axios');
const fs    = require('fs');
const path  = require('path');

module.exports = async (cmd, { sock, msg, jid, args, BOT_NAME }) => {
  const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
  const query = args.join(' ');

  // ── STICKER ──────────────────────────────────────────────────────────────────
  if (cmd === 'sticker') {
    const quoted = msg.message?.imageMessage ||
                   msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
    if (!quoted) return reply('🖼️ Image reply karanna hoda *.sticker* type karanna!\nOr image send karanna caption: *.sticker*');
    try {
      await reply('⚙️ Sticker hadanawa...');
      const stream = await sock.downloadMediaMessage(msg, 'buffer');
      const sharp = require('sharp');
      const webpBuf = await sharp(stream).resize(512, 512, { fit: 'contain', background: { r:0,g:0,b:0,alpha:0 } }).webp().toBuffer();
      await sock.sendMessage(jid, {
        sticker: webpBuf,
        stickerAuthor: BOT_NAME,
        stickerName: '👻 Ghost'
      }, { quoted: msg });
    } catch (e) {
      await reply('❌ Sticker hadanna bari una: ' + e.message);
    }
  }

  // ── TOIMG ────────────────────────────────────────────────────────────────────
  else if (cmd === 'toimg') {
    const quoted = msg.message?.stickerMessage ||
                   msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage;
    if (!quoted) return reply('🖼️ Sticker reply karanna *.toimg* type karanna!');
    try {
      await reply('⚙️ Image convert karanawa...');
      const buffer = await sock.downloadMediaMessage(msg, 'buffer');
      const sharp = require('sharp');
      const pngBuf = await sharp(buffer).png().toBuffer();
      await sock.sendMessage(jid, { image: pngBuf, caption: '🖼️ Converted by ' + BOT_NAME }, { quoted: msg });
    } catch (e) {
      await reply('❌ Convert bari una: ' + e.message);
    }
  }

  // ── AI CHAT ──────────────────────────────────────────────────────────────────
  else if (cmd === 'ai') {
    if (!query) return reply(`🤖 Question type karanna!\nExample: *.ai What is the capital of Sri Lanka?*`);
    await reply('🤖 Thinking...');
    try {
      // Use free AI API — no key needed
      const { data } = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: `You are ${BOT_NAME} BOT, a helpful WhatsApp assistant. Reply concisely.` },
          { role: 'user', content: query }
        ],
        max_tokens: 500
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_KEY || ''}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000
      });
      const answer = data.choices?.[0]?.message?.content || 'No response.';
      await reply(`🤖 *${BOT_NAME} AI*\n\n${answer}`);
    } catch (e) {
      // Fallback — free pollinations AI
      try {
        const encoded = encodeURIComponent(query);
        const { data } = await axios.get(`https://text.pollinations.ai/${encoded}`, { timeout: 15000 });
        await reply(`🤖 *${BOT_NAME} AI*\n\n${data}`);
      } catch (e2) {
        await reply('❌ AI service unavailable. OPENAI_KEY add karanna config.env eke.');
      }
    }
  }

  // ── WEATHER ──────────────────────────────────────────────────────────────────
  else if (cmd === 'weather') {
    const city = query || 'Colombo';
    await reply(`🌤️ ${city} weather ගන්නවා...`);
    try {
      const apiKey = process.env.WEATHER_API || '';
      if (!apiKey) {
        // Use wttr.in (no key needed)
        const { data } = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=4`, { timeout: 10000 });
        await reply(`🌤️ *Weather: ${city}*\n\n${data}`);
      } else {
        const { data } = await axios.get(
          `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`,
          { timeout: 10000 }
        );
        const w = data.weather[0];
        await reply(
          `🌤️ *Weather: ${data.name}, ${data.sys.country}*\n\n` +
          `🌡️ Temp: *${data.main.temp}°C* (feels ${data.main.feels_like}°C)\n` +
          `💧 Humidity: *${data.main.humidity}%*\n` +
          `💨 Wind: *${data.wind.speed} m/s*\n` +
          `☁️ Condition: *${w.description}*`
        );
      }
    } catch (e) {
      await reply('❌ Weather get karanna bari una. City name hariyata denn.');
    }
  }

  // ── LYRICS ───────────────────────────────────────────────────────────────────
  else if (cmd === 'lyrics') {
    if (!query) return reply(`🎵 Song name denn!\nExample: *.lyrics Shape of You*`);
    await reply('🔍 Lyrics හොයනවා...');
    try {
      const { data } = await axios.get(
        `https://lyrist.vercel.app/api/${encodeURIComponent(query)}`,
        { timeout: 10000 }
      );
      if (!data?.lyrics) return reply('❌ Lyrics හොයාගන්න බැරි උනා.');
      const truncated = data.lyrics.length > 3000 ? data.lyrics.slice(0,3000) + '\n...[truncated]' : data.lyrics;
      await reply(`🎵 *${data.title || query}*\n👤 ${data.artist || ''}\n\n${truncated}`);
    } catch (e) {
      await reply('❌ Lyrics service error. Try again.');
    }
  }

  // ── TRANSLATE ────────────────────────────────────────────────────────────────
  else if (cmd === 'translate') {
    if (!query) return reply(`🌐 Text denn!\nExample: *.translate Hello how are you*\nSinhala wenna: *.translate si: Hello*`);
    await reply('🌐 Translating...');
    try {
      let targetLang = 'si'; // default to Sinhala
      let text = query;
      if (query.includes(':')) {
        const parts = query.split(':');
        targetLang = parts[0].trim();
        text = parts.slice(1).join(':').trim();
      }
      const { data } = await axios.get(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`,
        { timeout: 10000 }
      );
      const translated = data?.responseData?.translatedText || 'Translation failed';
      await reply(`🌐 *Translation*\n\n📝 Original: ${text}\n🌐 Translated: ${translated}`);
    } catch (e) {
      await reply('❌ Translation failed: ' + e.message);
    }
  }
};
