const express = require('express');
const router = express.Router();
const tgClient = require('../telegram/client');

router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const info = await tgClient.getUserInfo(userId);
    if (!info) return res.status(404).json({ error: 'User not found' });
    res.json(info);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
