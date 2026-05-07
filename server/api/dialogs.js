const express = require('express');
const router = express.Router();
const tgClient = require('../telegram/client');
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const dialogs = await tgClient.getDialogs();
    res.json(dialogs);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });
    const results = await tgClient.searchMessages(q);
    res.json(results);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/resolve', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'Username required' });
    const entity = await tgClient.resolveUsername(username);
    res.json(entity);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/read', async (req, res) => {
  try {
    const { dialogId, maxId } = req.body;
    await tgClient.markAsRead(dialogId, maxId);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/pin', async (req, res) => {
  try {
    const { dialogId, pin } = req.body;
    await tgClient.pinDialog(dialogId, pin !== false);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/folders', async (req, res) => {
  try {
    const folders = await tgClient.getChatFolders();
    res.json(folders);
  } catch (e) {
    const local = db.prepare('SELECT * FROM chat_folders').all();
    res.json(local);
  }
});

module.exports = router;
