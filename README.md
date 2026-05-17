# 👻 GHOST BOT — WhatsApp Multi-Device Bot

## ✅ Features
- 🎵 Song download (MP3)
- 📹 Video download (YouTube, TikTok, Instagram, Facebook, Twitter)
- 🤖 AI chat
- 🌤️ Weather info
- 🎵 Lyrics
- 🌐 Translate
- 👑 Group commands (kick, promote, tagall...)
- 🖼️ Sticker create/convert
- 🔑 **Real WhatsApp Pair Code API**

---

## 🚀 Render.com Deploy

### Step 1 — GitHub push
```bash
git init
git add .
git commit -m "GHOST BOT v2"
git remote add origin https://github.com/YOUR_USERNAME/ghost-bot
git push -u origin main
```

### Step 2 — Render setup
1. render.com → **New +** → **Web Service**
2. GitHub repo connect
3. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free

### Step 3 — Environment Variables (Render Dashboard)
```
BOT_NAME     = GHOST
PREFIX       = .
OWNER_NUMBER = 94XXXXXXXXX
```

### Step 4 — Pair Code ගන්න
Bot deploy unama:
```
https://your-render-url.onrender.com/pair?phone=94771234567
```
ඒ code WhatsApp → Settings → Linked Devices → Link with phone number → Enter code

---

## 📱 Commands

| Command | Description |
|---------|-------------|
| `.menu` | All commands |
| `.ping` | Speed check |
| `.song [name]` | MP3 download |
| `.video [url]` | YouTube video |
| `.tiktok [url]` | TikTok no watermark |
| `.insta [url]` | Instagram reel |
| `.fb [url]` | Facebook video |
| `.sticker` | Image → Sticker |
| `.ai [text]` | AI chat |
| `.weather [city]` | Weather |
| `.lyrics [song]` | Song lyrics |
| `.translate [text]` | Translate to Sinhala |
| `.kick @user` | Remove from group |
| `.promote @user` | Make admin |
| `.tagall` | Tag everyone |

---

## 👻 GHOST BOT v2.0
