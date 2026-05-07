const express = require('express');
const router = express.Router();
const tgClient = require('../telegram/client');
const db = require('../db');

router.get('/:dialogId', async (req, res) => {
  try {
    const { dialogId } = req.params;
    const { limit, offsetId } = req.query;
    const messages = await tgClient.getMessages(dialogId, parseInt(limit) || 50, parseInt(offsetId) || 0);
    res.json(messages);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/search/:dialogId', async (req, res) => {
  try {
    const { dialogId } = req.params;
    const { q } = req.query;
    if (!q) return res.json([]);
    const results = await tgClient.searchMessages(q, dialogId);
    res.json(results);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/search/global', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const results = await tgClient.searchMessages(q);
    res.json(results);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/send', async (req, res) => {
  try {
    const { dialogId, text, replyTo } = req.body;
    if (!dialogId) return res.status(400).json({ error: 'dialogId required' });
    const result = await tgClient.sendMessage(dialogId, text, replyTo || null);
    res.json({ success: true, id: result?.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/edit', async (req, res) => {
  try {
    const { dialogId, messageId, text } = req.body;
    await tgClient.editMessage(dialogId, messageId, text);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/delete', async (req, res) => {
  try {
    const { dialogId, messageIds } = req.body;
    await tgClient.deleteMessages(dialogId, messageIds);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/typing', async (req, res) => {
  try {
    const { dialogId, action } = req.body;
    await tgClient.sendTyping(dialogId, action || 'typing');
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/history/:dialogId', (req, res) => {
  try {
    const { dialogId } = req.params;
    const { limit, offset } = req.query;
    const messages = db.prepare('SELECT * FROM messages WHERE dialog_id = ? ORDER BY date DESC LIMIT ? OFFSET ?')
      .all(dialogId, parseInt(limit) || 50, parseInt(offset) || 0);
    res.json(messages);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/read/:dialogId', async (req, res) => {
  try {
    const { dialogId } = req.params;
    const { maxId } = req.body;
    await tgClient.markAsRead(dialogId, maxId);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
