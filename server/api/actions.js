const express = require('express');
const router = express.Router();
const tgClient = require('../telegram/client');

router.post('/poll', async (req, res) => {
  try {
    const { dialogId, question, options } = req.body;
    if (!dialogId || !question || !options) return res.status(400).json({ error: 'Missing params' });
    const result = await tgClient.sendPoll(dialogId, question, options);
    res.json({ success: true, id: result?.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/mute', async (req, res) => {
  try {
    const { dialogId, mute } = req.body;
    await tgClient.toggleMute(dialogId, mute !== false);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/archive', async (req, res) => {
  try {
    const { dialogId, archive } = req.body;
    await tgClient.toggleArchive(dialogId, archive !== false);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/block', async (req, res) => {
  try {
    const { userId } = req.body;
    await tgClient.blockUser(userId);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/unblock', async (req, res) => {
  try {
    const { userId } = req.body;
    await tgClient.unblockUser(userId);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/group/add', async (req, res) => {
  try {
    const { chatId, userId } = req.body;
    await tgClient.addChatMember(chatId, userId);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/group/remove', async (req, res) => {
  try {
    const { chatId, userId } = req.body;
    await tgClient.deleteChatMember(chatId, userId);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/location', async (req, res) => {
  try {
    const { dialogId, lat, lon } = req.body;
    await tgClient.sendLocation(dialogId, lat, lon);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/saved', async (req, res) => {
  try {
    const saved = await tgClient.getSavedMessages();
    res.json(saved);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
