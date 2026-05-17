const fs   = require('fs');
const path = require('path');
const axios = require('axios');

// ── helpers ──────────────────────────────────────────────────────────────────

async function ytSearch(query) {
  // Use YouTube search via invidious public API (no key needed)
  const instances = [
    'https://inv.nadeko.net',
    'https://invidious.privacyredirect.com',
    'https://yt.drgnz.club',
  ];
  for (const base of instances) {
    try {
      const { data } = await axios.get(`${base}/api/v1/search`, {
        params: { q: query, type: 'video' },
        timeout: 8000
      });
      if (data && data[0]) return data[0];
    } catch { /* try next */ }
  }
  throw new Error('YouTube search failed. Try again.');
}

async function downloadAudio(videoId) {
  // cobalt.tools API — best public downloader
  const res = await axios.post('https://api.cobalt.tools/api/json', {
    url: `https://www.youtube.com/watch?v=${videoId}`,
    vCodec: 'h264',
    vQuality: '720',
    aFormat: 'mp3',
    isAudioOnly: true,
    disableMetadata: false
  }, {
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    timeout: 15000
  });
  return res.data;
}

async function downloadGeneric(videoUrl) {
  const res = await axios.post('https://api.cobalt.tools/api/json', {
    url: videoUrl,
    vQuality: '720',
    isAudioOnly: false,
    disableMetadata: false
  }, {
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    timeout: 15000
  });
  return res.data;
}

async function fetchBuffer(url) {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
  return Buffer.from(res.data);
}

// ── main export ───────────────────────────────────────────────────────────────

module.exports = async (cmd, { sock, msg, jid, args }) => {
  const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
  const query = args.join(' ');

  // ── SONG / PLAY ─────────────────────────────────────────────────────────────
  if (cmd === 'song' || cmd === 'play') {
    if (!query) return reply(`🎵 Song name denn!\nExample: *.song Shape of You*`);
    await reply('🔍 Searching...');
    try {
      const video = await ytSearch(query);
      const videoId = video.videoId;
      const title = video.title;
      const duration = Math.floor((video.lengthSeconds || 0) / 60) + ':' + String((video.lengthSeconds || 0) % 60).padStart(2,'0');

      await reply(`🎵 Found: *${title}*\n⏱️ Duration: ${duration}\n⬇️ Downloading MP3...`);

      const dlData = await downloadAudio(videoId);

      if (dlData.status === 'stream' || dlData.status === 'redirect') {
        const audioUrl = dlData.url;
        const buffer = await fetchBuffer(audioUrl);
        await sock.sendMessage(jid, {
          audio: buffer,
          mimetype: 'audio/mpeg',
          fileName: `${title}.mp3`,
          ptt: false
        }, { quoted: msg });
      } else {
        await reply(`❌ Download failed.\n\n🔗 Manual: https://www.youtube.com/watch?v=${videoId}`);
      }
    } catch (e) {
      await reply(`❌ Error: ${e.message}\n\nTry: *.song [youtube url]*`);
    }
  }

  // ── YTSEARCH ─────────────────────────────────────────────────────────────────
  else if (cmd === 'ytsearch') {
    if (!query) return reply(`🔍 Search term denn!\nExample: *.ytsearch Avicii Wake Me Up*`);
    await reply('🔍 Searching YouTube...');
    try {
      const result = await ytSearch(query);
      const mins = Math.floor((result.lengthSeconds || 0) / 60);
      const secs = String((result.lengthSeconds || 0) % 60).padStart(2,'0');
      await reply(
        `🎵 *${result.title}*\n` +
        `👤 ${result.author?.name || 'Unknown'}\n` +
        `⏱️ ${mins}:${secs}\n` +
        `👀 ${Number(result.viewCount || 0).toLocaleString()} views\n\n` +
        `🔗 https://youtu.be/${result.videoId}\n\n` +
        `_Download: *.song ${result.title}*_`
      );
    } catch (e) {
      await reply('❌ Search failed: ' + e.message);
    }
  }

  // ── VIDEO ─────────────────────────────────────────────────────────────────────
  else if (cmd === 'video') {
    if (!query) return reply(`📹 YouTube URL denn!\nExample: *.video https://youtu.be/xxxxx*`);
    if (!query.includes('youtu')) return reply('❌ YouTube URL eka denn! (youtu.be or youtube.com)');
    await reply('⬇️ Downloading video...');
    try {
      const dlData = await downloadGeneric(query);
      if (dlData.status === 'stream' || dlData.status === 'redirect') {
        const buffer = await fetchBuffer(dlData.url);
        await sock.sendMessage(jid, {
          video: buffer,
          caption: `🎬 ${dlData.title || 'YouTube Video'}`,
          fileName: `video_${Date.now()}.mp4`
        }, { quoted: msg });
      } else {
        await reply('❌ Download failed. URL check karanna.');
      }
    } catch (e) {
      await reply('❌ Error: ' + e.message);
    }
  }

  // ── TIKTOK ───────────────────────────────────────────────────────────────────
  else if (cmd === 'tiktok') {
    if (!query) return reply(`📱 TikTok URL denn!\nExample: *.tiktok https://vm.tiktok.com/...*`);
    await reply('⬇️ TikTok downloading (no watermark)...');
    try {
      // tikwm.com API — reliable, no key needed
      const { data } = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(query)}&hd=1`, { timeout: 15000 });
      if (!data?.data?.play) return reply('❌ TikTok URL valid neda? Check karanna.');
      const videoUrl = data.data.hdplay || data.data.play;
      const buffer = await fetchBuffer(videoUrl);
      await sock.sendMessage(jid, {
        video: buffer,
        caption: `🎵 ${data.data.title || 'TikTok Video'}\n❤️ ${data.data.digg_count || 0} | 💬 ${data.data.comment_count || 0}`
      }, { quoted: msg });
    } catch (e) {
      await reply('❌ Error: ' + e.message);
    }
  }

  // ── INSTAGRAM ────────────────────────────────────────────────────────────────
  else if (cmd === 'insta') {
    if (!query) return reply(`📸 Instagram URL denn!\nExample: *.insta https://www.instagram.com/reel/...*`);
    await reply('⬇️ Instagram downloading...');
    try {
      const dlData = await downloadGeneric(query);
      if (dlData.status === 'stream' || dlData.status === 'redirect') {
        const buffer = await fetchBuffer(dlData.url);
        await sock.sendMessage(jid, {
          video: buffer,
          caption: '📸 Instagram Reel'
        }, { quoted: msg });
      } else {
        await reply('❌ Download failed. Private post neda?');
      }
    } catch (e) {
      await reply('❌ Error: ' + e.message);
    }
  }

  // ── FACEBOOK ─────────────────────────────────────────────────────────────────
  else if (cmd === 'fb') {
    if (!query) return reply(`📘 Facebook URL denn!\nExample: *.fb https://www.facebook.com/...*`);
    await reply('⬇️ Facebook downloading...');
    try {
      const dlData = await downloadGeneric(query);
      if (dlData.status === 'stream' || dlData.status === 'redirect') {
        const buffer = await fetchBuffer(dlData.url);
        await sock.sendMessage(jid, {
          video: buffer,
          caption: '📘 Facebook Video'
        }, { quoted: msg });
      } else {
        await reply('❌ Download failed. Public video da check karanna.');
      }
    } catch (e) {
      await reply('❌ Error: ' + e.message);
    }
  }

  // ── TWITTER / X ──────────────────────────────────────────────────────────────
  else if (cmd === 'twitter') {
    if (!query) return reply(`🐦 Twitter/X URL denn!\nExample: *.twitter https://x.com/...*`);
    await reply('⬇️ Twitter/X downloading...');
    try {
      const dlData = await downloadGeneric(query);
      if (dlData.status === 'stream' || dlData.status === 'redirect') {
        const buffer = await fetchBuffer(dlData.url);
        await sock.sendMessage(jid, {
          video: buffer,
          caption: '🐦 Twitter/X Video'
        }, { quoted: msg });
      } else {
        await reply('❌ Download failed.');
      }
    } catch (e) {
      await reply('❌ Error: ' + e.message);
    }
  }
};
