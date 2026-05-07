const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const DB_PATH = path.join(DB_DIR, 'plugram.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE,
    session_string TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS dialogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dialog_id TEXT UNIQUE,
    type TEXT NOT NULL,
    title TEXT,
    username TEXT,
    photo TEXT,
    unread_count INTEGER DEFAULT 0,
    last_message TEXT,
    last_message_date DATETIME,
    pinned INTEGER DEFAULT 0,
    folder_id INTEGER DEFAULT 0,
    order_key REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    dialog_id TEXT NOT NULL,
    from_id TEXT,
    text TEXT,
    media_type TEXT,
    media_data TEXT,
    reply_to INTEGER,
    date DATETIME,
    edited INTEGER DEFAULT 0,
    out INTEGER DEFAULT 0,
    UNIQUE(message_id, dialog_id)
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    username TEXT,
    photo TEXT
  );

  CREATE TABLE IF NOT EXISTS plugins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    filename TEXT NOT NULL,
    display_name TEXT DEFAULT '',
    icon TEXT DEFAULT '⚡',
    enabled INTEGER DEFAULT 1,
    system INTEGER DEFAULT 0,
    config TEXT DEFAULT '{}',
    config_schema TEXT DEFAULT '{}',
    installed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chat_folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    icon TEXT DEFAULT '',
    order_index INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS scheduled_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dialog_id TEXT NOT NULL,
    text TEXT,
    media_path TEXT,
    schedule_at DATETIME NOT NULL,
    sent INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

module.exports = db;
