const fs = require('fs');
const path = require('path');
const { Lexer } = require('./lexer');
const { Parser } = require('./parser');
const { Interpreter } = require('./interpreter');
const tgClient = require('../telegram/client');

const plugins = new Map();

const builtins = {
  log: (...args) => console.log('[Plugram]', ...args),
  sleep: (ms) => new Promise(r => setTimeout(r, ms)),
  reply: (text) => ({ type: 'reply', text }),
  sendMessage: (dialogId, text) => tgClient.sendMessage(dialogId, text),
  getMessages: (dialogId, limit) => tgClient.getMessages(dialogId, limit),
  getDialogs: () => tgClient.getDialogs(),
  getContacts: () => tgClient.getContacts(),
  getMe: () => tgClient.getCurrentUser(),
  resolveUsername: (username) => tgClient.resolveUsername(username),
  deleteMessages: (chatId, ids) => tgClient.deleteMessages(chatId, ids),
  editMessage: (chatId, msgId, text) => tgClient.editMessage(chatId, msgId, text),
  markAsRead: (chatId, maxId) => tgClient.markAsRead(chatId, maxId),
  searchMessages: (query) => tgClient.searchMessages(query),
  setOnline: (online) => tgClient.setOnline(online),
  random: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
  length: (arr) => arr ? arr.length : 0,
  toString: (val) => String(val),
  toNumber: (val) => Number(val),
  jsonParse: (str) => JSON.parse(str),
  jsonStringify: (obj) => JSON.stringify(obj),
  getConfig: (pluginName) => {
    const db = require('../db');
    const row = db.prepare('SELECT config FROM plugins WHERE name = ?').get(pluginName || '');
    return row ? JSON.parse(row.config) : {};
  },
  setConfig: (pluginName, key, value) => {
    const db = require('../db');
    const row = db.prepare('SELECT config FROM plugins WHERE name = ?').get(pluginName);
    if (row) {
      const cfg = JSON.parse(row.config);
      cfg[key] = value;
      db.prepare('UPDATE plugins SET config = ? WHERE name = ?').run(JSON.stringify(cfg), pluginName);
    }
  },
};

class PlugramRuntime {
  constructor() {
    this.hooks = new Map();
  }

  register(filename, code) {
    try {
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      const context = { ...builtins };
      const interpreter = new Interpreter(ast, context);
      interpreter.execute();

      const pluginHooks = interpreter.getHooks();
      const manifest = this.parseManifest(code, filename);

      plugins.set(filename, {
        filename, hooks: pluginHooks, interpreter, context, manifest,
      });

      for (const [name, hook] of pluginHooks) {
        if (!this.hooks.has(name)) this.hooks.set(name, []);
        this.hooks.get(name).push({ filename, hook, context });
      }

      const db = require('../db');
      const existing = db.prepare('SELECT id FROM plugins WHERE filename = ?').get(filename);
      if (existing) {
        db.prepare('UPDATE plugins SET name = ?, display_name = ?, icon = ?, config_schema = ? WHERE filename = ?')
          .run(manifest.id, manifest.name, manifest.icon, JSON.stringify(manifest.configSchema), filename);
      }

      return true;
    } catch (e) {
      console.error(`[Plugram] Error registering ${filename}:`, e.message);
      return false;
    }
  }

  unregister(filename) {
    plugins.delete(filename);
    for (const [, hooks] of this.hooks) {
      const idx = hooks.findIndex(h => h.filename === filename);
      if (idx >= 0) hooks.splice(idx, 1);
    }
  }

  parseManifest(code, filename) {
    const manifest = {
      id: '',
      name: '',
      version: '1.0.0',
      author: 'bitplugg',
      description: '',
      icon: '⚡',
      system: false,
      configSchema: {},
    };

    const extract = (key) => {
      const re = new RegExp('__' + key + '__:\\s*"([^"]+)"');
      const m = code.match(re);
      return m ? m[1] : '';
    };

    manifest.id = extract('id') || path.basename(filename, '.plugram');
    manifest.name = extract('name') || manifest.id;
    manifest.version = extract('version') || '1.0.0';
    manifest.author = extract('author') || 'bitplugg';
    manifest.description = extract('description') || '';
    manifest.icon = extract('icon') || '⚡';
    manifest.system = extract('system') === 'true';

    const schemaMatch = code.match(/__config__:\s*(\{[\s\S]*?\})/);
    if (schemaMatch) {
      try {
        manifest.configSchema = JSON.parse(schemaMatch[1]);
      } catch {}
    }

    return manifest;
  }

  async runHook(hookName, context = {}) {
    const hooks = this.hooks.get(hookName) || [];
    for (const { filename, hook } of hooks) {
      const plugin = plugins.get(filename);
      if (!plugin || !plugin.interpreter) continue;
      const db = require('../db');
      const row = db.prepare('SELECT enabled FROM plugins WHERE filename = ?').get(filename);
      if (row && !row.enabled) continue;
      try {
        const prevVars = new Map(plugin.interpreter.variables);
        hook.params.forEach(p => plugin.interpreter.variables.set(p, context[p] ?? null));
        plugin.interpreter.runNode(hook.body);
        plugin.interpreter.variables = prevVars;
      } catch (e) {
        console.error(`[Plugram] Hook ${hookName} error in ${filename}:`, e.message);
      }
    }
  }

  async runHookOnMessage(message) {
    const ctx = {
      text: message.text || '', fromId: message.fromId, chatId: message.dialogId,
      messageId: message.id, date: message.date, isPrivate: message.isPrivate || false,
      isGroup: message.isGroup || false, isChannel: message.isChannel || false,
      mediaType: message.mediaType || null, replyTo: message.replyTo || null,
    };
    await this.runHook('onMessage', ctx);
    return ctx;
  }

  async runCommand(command, args, message) {
    const ctx = { command, args, text: message.text || '', fromId: message.fromId, chatId: message.dialogId, messageId: message.id };
    await this.runHook('onCommand', ctx);
    return ctx;
  }

  getPlugins() {
    const result = [];
    for (const [filename, plugin] of plugins) {
      result.push({ filename, hooks: Array.from(plugin.hooks.keys()), manifest: plugin.manifest });
    }
    return result;
  }

  reloadAll() {
    this.hooks.clear();
    plugins.clear();
    const pluginsDir = path.join(__dirname, '..', '..', 'plugins');
    if (!fs.existsSync(pluginsDir)) return;
    const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.plugram'));
    for (const file of files) {
      try {
        const code = fs.readFileSync(path.join(pluginsDir, file), 'utf-8');
        this.register(file, code);
      } catch (e) {
        console.error(`Failed to reload ${file}:`, e.message);
      }
    }
  }
}

module.exports = new PlugramRuntime();
