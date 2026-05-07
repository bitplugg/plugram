# Plugram

Custom Telegram client by **bitplugg**.  
Web-based SPA with PWA, plugin system (Plugram language), and Liquid Glass UI.

## Features

- Telegram messaging via gramJS (MTProto)
- PWA — install on mobile home screen
- Liquid Glass UI — glassmorphism + fluid animations
- Plugin system — write plugins in `.plugram` language
- 30+ built-in plugins
- Plugin store with installable plugins
- Chat folders, search, contacts
- Multi-session support
- TG API 12.7 compatible

## Quick Start

### Prerequisites

- Node.js 18+
- Telegram API ID & Hash from [my.telegram.org](https://my.telegram.org)

### Install & Run

```bash
# Server
cd server
npm install
npm start          # runs on :3001

# Client (separate terminal)
cd client
npm install
npm start          # runs on :3000
```

Open `http://localhost:3000`, enter your API credentials and phone.

### Using Plugins

- Click ⚡ in sidebar to open Plugin settings
- Toggle plugins on/off
- Click ⚙️ on any plugin to configure
- Browse the store to install more

## Project Structure

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
└── data/            # SQLite database (auto-created)
```

## Plugin Development

See [plugins/README.md](plugins/README.md) for full documentation.

Example plugin:

```
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

## Tech Stack

- **Client:** React 18, PWA, CSS Liquid Glass
- **Server:** Node.js, Express, SQLite (better-sqlite3)
- **Telegram:** gramJS (MTProto)
- **Plugins:** Custom Plugram language runtime

## License

MIT
