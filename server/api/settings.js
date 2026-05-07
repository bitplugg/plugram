const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM settings').all();
  const settings = {};
  for (const r of rows) settings[r.key] = r.value;
  res.json(settings);
});

router.post('/', (req, res) => {
  const { key, value } = req.body;
  const existing = db.prepare("SELECT * FROM settings WHERE key = ?").get(key);
  if (existing) {
    db.prepare("UPDATE settings SET value = ? WHERE key = ?").run(value, key);
  } else {
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run(key, value);
  }
  res.json({ success: true });
});

router.get('/:key', (req, res) => {
  const row = db.prepare("SELECT * FROM settings WHERE key = ?").get(req.params.key);
  res.json(row || { key: req.params.key, value: null });
});

module.exports = router;
