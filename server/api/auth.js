const express = require('express');
const router = express.Router();
const tgClient = require('../telegram/client');
const db = require('../db');

let pendingAuth = {};

router.post('/send-code', async (req, res) => {
  try {
    const { phone, apiId, apiHash } = req.body;
    if (!phone || !apiId || !apiHash) return res.status(400).json({ error: 'Missing params' });
    const result = await tgClient.sendCode(phone, apiId, apiHash);
    pendingAuth.phoneCodeHash = result.phoneCodeHash;
    pendingAuth.phone = phone;
    res.json({ phoneCodeHash: result.phoneCodeHash });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post('/sign-in', async (req, res) => {
  try {
    const { code } = req.body;
    const result = await tgClient.signIn(pendingAuth.phone, code, pendingAuth.phoneCodeHash);
    if (result.need2fa) return res.json({ need2fa: true });
    delete pendingAuth;
    res.json({ user: result.user, session: result.session });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post('/2fa', async (req, res) => {
  try {
    const { password } = req.body;
    const result = await tgClient.signInWith2fa(password);
    delete pendingAuth;
    res.json({ user: result.user, session: result.session });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post('/logout', async (req, res) => {
  try {
    await tgClient.logout();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/sessions', (req, res) => {
  const sessions = tgClient.getSessions ? tgClient.getSessions() : db.prepare('SELECT user_id, created_at FROM sessions ORDER BY created_at DESC').all();
  res.json(sessions);
});

router.delete('/sessions/:userId', (req, res) => {
  try {
    if (tgClient.removeSession) tgClient.removeSession(req.params.userId);
    else db.prepare('DELETE FROM sessions WHERE user_id = ?').run(req.params.userId);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
