<div align="center">

# Plugram

**Custom Telegram client** by **bitplugg** — Web SPA + PWA + Plugin System + Liquid Glass UI

[![GitHub release](https://img.shields.io/github/v/release/bitplugg/plugram?style=flat-square&color=7c5cfc)](https://github.com/bitplugg/plugram/releases)
[![GitHub stars](https://img.shields.io/github/stars/bitplugg/plugram?style=flat-square&color=ffd700)](https://github.com/bitplugg/plugram/stargazers)
[![TG API](https://img.shields.io/badge/TG%20API-12.7-7c5cfc?style=flat-square)](#)
[![License](https://img.shields.io/github/license/bitplugg/plugram?style=flat-square&color=2ed571)](LICENSE)
[![GitHub Actions](https://img.shields.io/github/actions/workflow/status/bitplugg/plugram/pages.yml?style=flat-square)](https://github.com/bitplugg/plugram/actions)
[![PWA](https://img.shields.io/badge/PWA-Ready-7c5cfc?style=flat-square)](#)

<img src="https://via.placeholder.com/800x450/1a1a2e/7c5cfc?text=Plugram+Screenshot" alt="Plugram Screenshot" width="80%" style="border-radius:16px;box-shadow:0 8px 32px rgba(124,92,252,0.3)">

*Screenshot coming soon — self-host and capture your own!*

</div>

---

## ✨ Features

| Feature | Status |
|---------|--------|
| Telegram messaging via gramJS (MTProto) | ✅ |
| PWA — install on mobile home screen | ✅ |
| Liquid Glass UI — glassmorphism + fluid animations | ✅ |
| Plugin system — `.plugram` language | ✅ |
| 30+ built-in plugins | ✅ |
| Plugin store with installable plugins | ✅ |
| Chat folders, search, contacts | ✅ |
| Multi-session support | ✅ |
| Voice messages | ✅ |
| Ghost Mode (invisible) | ✅ |
| Emoji picker | ✅ |
| Reply / Forward | ✅ |
| Media viewer with video player | ✅ |
| Polls (create & vote) | ✅ |
| Drag & drop attachments | ✅ |
| Location sharing | ✅ |
| Mute / Archive / Block | ✅ |
| Saved Messages | ✅ |
| Customization (font size, density, animations) | ✅ |
| Auto-reconnect WebSocket | ✅ |
| Mobile swipe gestures + bottom nav | ✅ |
| Search in chat | ✅ |
| Desktop notifications + hotkeys | ✅ |
| Pull to refresh | ✅ |
| Dark / Light theme | ✅ |

### vs Official Telegram

| Feature | Plugram | Telegram |
|---------|---------|----------|
| Plugin system | ✅ Custom `.plugram` language | ❌ |
| Ghost Mode | ✅ | ❌ |
| Open source | ✅ | ❌ (client) |
| PWA installable | ✅ | ❌ |
| Customizable UI (font, density) | ✅ | ❌ |
| Self-hosted | ✅ | ❌ |
| TG API latest | 12.7 | 12.7 |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Telegram API ID & Hash from [my.telegram.org](https://my.telegram.org)

### Install & Run

```bash
# Clone
git clone https://github.com/bitplugg/plugram.git
cd plugram

# Server
cd server
npm install
npm start          # runs on :3001

# Client (separate terminal)
cd client
npm install
npm start          # runs on :3000
```

Open **http://localhost:3000**, enter your API credentials and phone.

### 📦 Download

[![Download .zip](https://img.shields.io/badge/Download-.zip-7c5cfc?style=for-the-badge)](https://github.com/bitplugg/plugram/archive/refs/heads/main.zip)
[![Download .tar.gz](https://img.shields.io/badge/Download-.tar.gz-2ed571?style=for-the-badge)](https://github.com/bitplugg/plugram/archive/refs/heads/main.tar.gz)

---

## 🔌 Using Plugins

- Click ⚡ in sidebar to open Plugin settings
- Toggle plugins on/off
- Click ⚙️ on any plugin to configure
- Browse the store to install more

### Plugin Development

See [plugins/README.md](plugins/README.md) for full documentation.

```plugram
__name__: "My Plugin"
__id__: "myplugin"
__version__: "1.0.0"
__author__: "bitplugg"
__description__: "Does something cool"
__icon__: "🚀"
__config__: {"msg": {"type": "string", "default": "Hello", "label": "Message"}}

hook onMessage(text, fromId, chatId) {
  if (text == "!hello") {
    sendMessage(chatId, "Hello world!")
  }
}
```

---

## 🏗️ Project Structure

```
Plugram/
├── server/          # Node.js backend
│   ├── api/         # REST API routes
│   ├── telegram/    # gramJS client + handlers
│   └── plugram/     # Plugram language runtime
├── client/          # React SPA frontend
│   └── src/         # Components & pages
├── plugins/         # Plugin repository (30+ .plugram files)
│   └── README.md    # Plugin development docs
├── docs/            # GitHub Pages landing page
└── data/            # SQLite database (auto-created)
```

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|-----------|
| Client | React 18, PWA, CSS Liquid Glass |
| Server | Node.js, Express, SQLite (better-sqlite3) |
| Telegram | gramJS (MTProto) |
| Plugins | Custom Plugram language runtime |
| Realtime | WebSocket |
| CI/CD | GitHub Actions → Pages |

---

## 📋 Changelog

### v1.0.0 (2026-05-08)
- Initial release
- Full Telegram messaging client
- 32 plugins (Plugram language)
- Plugin store + auto-update
- Ghost Mode
- PWA support
- Liquid Glass UI (dark/light)
- Media viewer, voice, polls, location
- Multi-session
- GitHub Pages landing

---

## ❓ FAQ

**Q: Is this a bot?**  
A: No. Plugram uses your personal Telegram account via MTProto (gramJS). It's a full client.

**Q: Is my data safe?**  
A: Yes. Everything runs locally on your server. No third-party servers involved.

**Q: Can I use it on mobile?**  
A: Yes. It's PWA-enabled — add to home screen from Chrome/Safari.

**Q: How do plugins work?**  
A: Plugins are written in the `.plugram` language (Tcl-like syntax) and run server-side via the Plugram runtime.

**Q: Do I need an API ID?**  
A: Yes. Get one free at [my.telegram.org](https://my.telegram.org/apps).

---

## 🆘 Support

- [GitHub Issues](https://github.com/bitplugg/plugram/issues)
- [Telegram Chat](https://t.me/bitplugg)
- [Plugin Repo](https://github.com/bitplugg/plugram-plugin)

---

## 📄 License

[MIT](LICENSE) © bitplugg

<div align="center">
  <sub>Built with ❤️ by bitplugg</sub>
</div>
